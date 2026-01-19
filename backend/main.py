"""
KalshiProto Backend - FastAPI Application
==========================================

Main entry point for the Kalshi trading bot API.

Run locally:
    uvicorn main:app --reload

Run in production (Railway):
    uvicorn main:app --host 0.0.0.0 --port $PORT

Environment Variables:
    BOT_MODE: "paper" (default) or "live"
    BOT_ENABLED: "true" (default) or "false" to disable auto-start
    BOT_INTERVAL: Loop interval in seconds (default 60)
"""

import asyncio
import os
import random
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import logging utilities
from logging_utils import (
    setup_logging,
    get_logger,
    log_signal_decision,
    log_trade,
    log_trade_fill,
    log_trade_error,
    log_pnl_snapshot,
    log_aggregate_pnl,
    log_whale_event,
    log_large_order,
    get_log_file_stats,
    MODEL_VERSION,
)

# =============================================================================
# Initialize Logging (do this first)
# =============================================================================

setup_logging()
logger = get_logger("main")

# =============================================================================
# Configuration
# =============================================================================

BOT_MODE = os.getenv("BOT_MODE", "paper").lower()
BOT_ENABLED = os.getenv("BOT_ENABLED", "true").lower() == "true"
BOT_INTERVAL = int(os.getenv("BOT_INTERVAL", "60"))
KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2"

# =============================================================================
# App Configuration
# =============================================================================

app = FastAPI(
    title="KalshiProto API",
    description="Kalshi Whale Trading Bot API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Models
# =============================================================================

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str


class BotOverview(BaseModel):
    mode: str
    equity: float
    daily_pnl: float
    total_exposure: float
    open_positions: int


class MarketState(BaseModel):
    ticker: str
    title: str
    yes_bid: int
    yes_ask: int
    spread: int
    volume_24h: int
    open_interest: int
    signal_direction: str
    signal_score: float
    position_notional: float


class WhaleEvent(BaseModel):
    timestamp: str
    ticker: str
    side_bias: Optional[str]
    imbalance_strength: float
    max_bid_size: int
    max_ask_size: int


class BotState(BaseModel):
    overview: BotOverview
    markets: list[MarketState]
    whales: list[WhaleEvent]
    timeline: list[dict]


# =============================================================================
# In-Memory State
# =============================================================================

_state = {
    "overview": {
        "mode": BOT_MODE.upper(),
        "equity": 10000.0,
        "daily_pnl": 0.0,
        "total_exposure": 0.0,
        "open_positions": 0,
    },
    "markets": [],
    "whales": [],
    "timeline": [],
    "positions": {},
    "realized_pnl": 0.0,
    "bot_running": False,
    "loop_count": 0,
    "last_update": None,
    "last_loop_start": None,
    "last_loop_finish": None,
    "bot_error": None,
}

# Bot loop control
_bot_task: Optional[asyncio.Task] = None
_bot_stop_event = asyncio.Event()


def update_state(new_state: dict) -> None:
    """Update the global state."""
    global _state
    _state.update(new_state)


def get_position(ticker: str) -> float:
    """Get current position for a ticker."""
    return _state.get("positions", {}).get(ticker, 0.0)


def set_position(ticker: str, size: float) -> None:
    """Set position for a ticker."""
    if "positions" not in _state:
        _state["positions"] = {}
    _state["positions"][ticker] = size


def add_timeline_event(event_type: str, ticker: str = "", details: str = "") -> None:
    """Add an event to the timeline."""
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "ticker": ticker,
        "details": details,
    }
    _state["timeline"].insert(0, event)
    # Keep last 100 events
    if len(_state["timeline"]) > 100:
        _state["timeline"] = _state["timeline"][:100]


# =============================================================================
# Kalshi API Functions
# =============================================================================

async def fetch_markets(client: httpx.AsyncClient, limit: int = 20) -> list:
    """Fetch top markets from Kalshi API."""
    try:
        response = await client.get(
            f"{KALSHI_API_BASE}/markets",
            params={"limit": 100},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        markets = data.get("markets", [])
        
        # Filter for open/active markets only
        markets = [m for m in markets if m.get("status") in ("open", "active", None)]
        
        # Filter for markets with volume and sort by volume
        markets_with_volume = [
            m for m in markets 
            if m.get("volume", 0) > 0 or m.get("volume_24h", 0) > 0
        ]
        markets_with_volume.sort(
            key=lambda x: x.get("volume", 0) + x.get("volume_24h", 0),
            reverse=True
        )
        
        return markets_with_volume[:limit]
    except Exception as e:
        logger.error(f"Error fetching markets: {e}")
        return []


async def fetch_orderbook(client: httpx.AsyncClient, ticker: str) -> dict:
    """Fetch orderbook for a market."""
    try:
        response = await client.get(
            f"{KALSHI_API_BASE}/markets/{ticker}/orderbook",
            timeout=15.0,
        )
        response.raise_for_status()
        return response.json().get("orderbook", {})
    except Exception as e:
        logger.debug(f"Error fetching orderbook for {ticker}: {e}")
        return {}


def analyze_orderbook(orderbook: dict) -> dict:
    """Analyze orderbook for whale activity and imbalance."""
    yes_bids = orderbook.get("yes", []) if isinstance(orderbook.get("yes"), list) else []
    no_bids = orderbook.get("no", []) if isinstance(orderbook.get("no"), list) else []
    
    # Calculate bid/ask volumes (yes side)
    bid_volume = sum(level[1] for level in yes_bids[:5] if len(level) >= 2)
    ask_volume = sum(level[1] for level in no_bids[:5] if len(level) >= 2)
    
    total_volume = bid_volume + ask_volume
    bid_ratio = bid_volume / total_volume if total_volume > 0 else 0.5
    imbalance_strength = abs(bid_ratio - 0.5)
    
    # Find max sizes
    max_bid_size = max((level[1] for level in yes_bids if len(level) >= 2), default=0)
    max_ask_size = max((level[1] for level in no_bids if len(level) >= 2), default=0)
    
    # Best bid/ask prices
    best_bid = yes_bids[0][0] if yes_bids and len(yes_bids[0]) >= 2 else 0
    best_ask = no_bids[0][0] if no_bids and len(no_bids[0]) >= 2 else 100
    
    return {
        "bid_volume": bid_volume,
        "ask_volume": ask_volume,
        "bid_ratio": bid_ratio,
        "imbalance_strength": imbalance_strength,
        "max_bid_size": max_bid_size,
        "max_ask_size": max_ask_size,
        "best_bid": best_bid,
        "best_ask": best_ask,
        "spread": best_ask - best_bid if best_ask > best_bid else 0,
    }


def generate_signal(features: dict) -> dict:
    """Generate trading signal from features (simple rules for now)."""
    bid_ratio = features.get("bid_ratio", 0.5)
    imbalance = features.get("imbalance_strength", 0)
    
    # Simple rule-based signal
    if imbalance > 0.15 and bid_ratio > 0.55:
        return {"direction": "BUY", "score": 0.6 + imbalance}
    elif imbalance > 0.15 and bid_ratio < 0.45:
        return {"direction": "SELL", "score": 0.6 + imbalance}
    else:
        return {"direction": "HOLD", "score": 0.5}


# =============================================================================
# Trading Logic
# =============================================================================

def process_signal(
    ticker: str,
    features: dict,
    prediction: float,
    decision_price: float,
) -> str:
    """Process a model prediction and decide on action."""
    position_before = get_position(ticker)
    
    if prediction >= 0.6 and position_before <= 0:
        action = "enter_long"
        position_after = 100.0
    elif prediction <= 0.4 and position_before >= 0:
        action = "enter_short"
        position_after = -100.0
    elif position_before != 0 and 0.45 < prediction < 0.55:
        action = "exit"
        position_after = 0.0
    else:
        action = "hold"
        position_after = position_before
    
    log_signal_decision(
        market_ticker=ticker,
        decision_price=decision_price,
        features=features,
        prediction=prediction,
        action=action,
        position_before=position_before,
        position_after=position_after,
    )
    
    if position_after != position_before:
        set_position(ticker, position_after)
    
    return action


def submit_order(ticker: str, side: str, size: float, limit_price: float) -> dict:
    """Submit an order (paper mode simulation)."""
    logger.info(f"Submitting order: {side} {size} {ticker} @ {limit_price}")
    
    try:
        order_id = f"paper_{ticker}_{datetime.now(timezone.utc).timestamp()}"
        
        log_trade(
            market_ticker=ticker,
            side=side,
            size=size,
            limit_price=limit_price,
            status="submitted",
            order_id=order_id,
        )
        
        # Simulate fill in paper mode
        if BOT_MODE == "paper":
            log_trade_fill(
                market_ticker=ticker,
                side=side,
                size=size,
                fill_price=limit_price,
                order_id=order_id,
            )
        
        return {"success": True, "order_id": order_id, "status": "filled"}
        
    except Exception as e:
        error_msg = str(e)
        log_trade_error(
            market_ticker=ticker,
            side=side,
            size=size,
            limit_price=limit_price,
            error_message=error_msg,
        )
        return {"success": False, "error": error_msg}


def record_pnl_snapshot() -> None:
    """Record current P&L and exposure snapshot."""
    overview = _state.get("overview", {})
    positions = _state.get("positions", {})
    gross_exposure = sum(abs(pos) for pos in positions.values())
    
    log_aggregate_pnl(
        cash=overview.get("equity", 10000.0) - gross_exposure,
        open_pnl=overview.get("daily_pnl", 0.0),
        realized_pnl=_state.get("realized_pnl", 0.0),
        gross_exposure=gross_exposure,
        positions_count=len([p for p in positions.values() if p != 0]),
    )


def check_whale_activity(ticker: str, ob_analysis: dict) -> bool:
    """Check for whale activity and log if detected."""
    max_bid = ob_analysis.get("max_bid_size", 0)
    max_ask = ob_analysis.get("max_ask_size", 0)
    imbalance = ob_analysis.get("imbalance_strength", 0)
    
    is_whale = max_bid >= 5000 or max_ask >= 5000 or imbalance >= 0.25
    
    if is_whale:
        side = "bid" if max_bid > max_ask else "ask"
        log_large_order(
            market_ticker=ticker,
            side=side,
            size=max(max_bid, max_ask),
            price_level=ob_analysis.get("best_bid" if side == "bid" else "best_ask", 0),
            imbalance_strength=imbalance,
        )
        
        # Add to in-memory whale events
        whale_event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ticker": ticker,
            "side_bias": "BUY_BIAS" if max_bid > max_ask else "SELL_BIAS",
            "imbalance_strength": imbalance,
            "max_bid_size": max_bid,
            "max_ask_size": max_ask,
        }
        _state["whales"].insert(0, whale_event)
        if len(_state["whales"]) > 200:
            _state["whales"] = _state["whales"][:200]
        
        add_timeline_event("WHALE", ticker, f"Large {side} detected: {max(max_bid, max_ask):,}")
    
    return is_whale


# =============================================================================
# Bot Loop
# =============================================================================

async def bot_loop():
    """Main bot loop - polls markets, analyzes, generates signals."""
    global _state
    
    logger.info("=" * 60)
    logger.info(f"BOT LOOP: Starting in {BOT_MODE.upper()} mode, interval={BOT_INTERVAL}s")
    logger.info("=" * 60)
    
    _state["bot_running"] = True
    _state["bot_error"] = None
    _state["overview"]["mode"] = BOT_MODE.upper()
    loop_count = 0
    
    async with httpx.AsyncClient() as client:
        while not _bot_stop_event.is_set():
            loop_count += 1
            loop_start_time = datetime.now(timezone.utc)
            _state["loop_count"] = loop_count
            _state["last_loop_start"] = loop_start_time.isoformat()
            _state["last_update"] = loop_start_time.isoformat()
            
            try:
                logger.info(f"--- Loop {loop_count} starting ---")
                
                # 1. Fetch markets
                markets = await fetch_markets(client, limit=20)
                logger.info(f"Fetched {len(markets)} markets")
                
                if not markets:
                    logger.warning("No markets fetched, waiting for next loop")
                    await asyncio.sleep(BOT_INTERVAL)
                    continue
                
                # 2. Process each market
                processed_markets = []
                whale_count = 0
                
                for market in markets[:10]:  # Process top 10
                    ticker = market.get("ticker", "")
                    title = market.get("title", "")[:50]
                    
                    if not ticker:
                        continue
                    
                    # Fetch orderbook
                    orderbook = await fetch_orderbook(client, ticker)
                    ob_analysis = analyze_orderbook(orderbook)
                    
                    # Check for whales
                    if check_whale_activity(ticker, ob_analysis):
                        whale_count += 1
                    
                    # Generate signal
                    signal = generate_signal(ob_analysis)
                    
                    # Calculate mid price
                    yes_bid = market.get("yes_bid", 0) or ob_analysis.get("best_bid", 50)
                    yes_ask = market.get("yes_ask", 100) or ob_analysis.get("best_ask", 50)
                    mid_price = (yes_bid + yes_ask) / 2
                    
                    # Process signal and potentially trade
                    action = process_signal(
                        ticker=ticker,
                        features=ob_analysis,
                        prediction=signal["score"],
                        decision_price=mid_price,
                    )
                    
                    # Execute trade if needed (paper mode)
                    if action in ("enter_long", "enter_short") and BOT_MODE == "paper":
                        side = "buy" if action == "enter_long" else "sell"
                        submit_order(ticker, side, 100, mid_price)
                        add_timeline_event("OPEN", ticker, f"{action} @ {mid_price:.1f}")
                    
                    # Build market state for API
                    processed_markets.append({
                        "ticker": ticker,
                        "title": title,
                        "yes_bid": int(yes_bid),
                        "yes_ask": int(yes_ask),
                        "spread": int(yes_ask - yes_bid),
                        "volume_24h": market.get("volume_24h", 0) or market.get("volume", 0),
                        "open_interest": market.get("open_interest", 0),
                        "signal_direction": signal["direction"],
                        "signal_score": signal["score"],
                        "position_notional": get_position(ticker),
                    })
                    
                    # Small delay between markets
                    await asyncio.sleep(0.2)
                
                # 3. Update state
                _state["markets"] = processed_markets
                
                # Update overview
                positions = _state.get("positions", {})
                total_exposure = sum(abs(p) for p in positions.values())
                open_positions = len([p for p in positions.values() if p != 0])
                _state["overview"]["total_exposure"] = total_exposure
                _state["overview"]["open_positions"] = open_positions
                
                # 4. Log P&L snapshot
                record_pnl_snapshot()
                
                # Record loop finish time
                loop_finish_time = datetime.now(timezone.utc)
                _state["last_loop_finish"] = loop_finish_time.isoformat()
                
                logger.info(
                    f"Loop {loop_count} complete: "
                    f"{len(processed_markets)} markets, "
                    f"{whale_count} whales, "
                    f"{open_positions} positions"
                )
                
            except asyncio.CancelledError:
                logger.info("Bot loop cancelled")
                break
            except Exception as e:
                _state["bot_error"] = str(e)
                logger.exception(f"Error in bot loop: {e}")
            
            # Wait for next iteration
            try:
                await asyncio.wait_for(
                    _bot_stop_event.wait(),
                    timeout=BOT_INTERVAL
                )
                break  # Stop event was set
            except asyncio.TimeoutError:
                pass  # Continue to next loop
    
    _state["bot_running"] = False
    logger.info("Bot loop stopped")


async def start_bot_loop():
    """Start the bot loop as a background task."""
    global _bot_task, _bot_stop_event
    
    if _bot_task is not None and not _bot_task.done():
        logger.warning("Bot loop already running")
        return False
    
    _bot_stop_event.clear()
    _bot_task = asyncio.create_task(bot_loop())
    logger.info("Bot loop task created")
    return True


async def stop_bot_loop():
    """Stop the bot loop."""
    global _bot_task, _bot_stop_event
    
    if _bot_task is None or _bot_task.done():
        logger.warning("Bot loop not running")
        return False
    
    _bot_stop_event.set()
    try:
        await asyncio.wait_for(_bot_task, timeout=10.0)
    except asyncio.TimeoutError:
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass
    
    logger.info("Bot loop stopped")
    return True


# =============================================================================
# Routes
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API info."""
    return {
        "name": "KalshiProto API",
        "version": "1.0.0",
        "model_version": MODEL_VERSION,
        "bot_mode": BOT_MODE,
        "bot_running": _state.get("bot_running", False),
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "development"),
    )


@app.get("/state/overview", tags=["Bot State"])
async def get_overview():
    """Get bot overview."""
    return _state.get("overview", {})


@app.get("/state/markets", tags=["Bot State"])
async def get_markets():
    """Get current markets with signals."""
    markets = _state.get("markets", [])
    return {"markets": markets, "count": len(markets)}


@app.get("/state/whales", tags=["Bot State"])
async def get_whales(limit: int = 50):
    """Get recent whale events."""
    whales = _state.get("whales", [])[:limit]
    return {"whales": whales, "count": len(whales)}


@app.get("/state/timeline", tags=["Bot State"])
async def get_timeline(limit: int = 100):
    """Get recent timeline events."""
    timeline = _state.get("timeline", [])[:limit]
    return {"timeline": timeline, "count": len(timeline)}


@app.get("/state/full", tags=["Bot State"])
async def get_full_state():
    """Get complete bot state for dashboard."""
    return {
        "overview": _state.get("overview", {}),
        "regime": {"id": 0, "name": "calm"},
        "markets": _state.get("markets", []),
        "whales": _state.get("whales", []),
        "timeline": _state.get("timeline", []),
    }


@app.get("/logs/stats", tags=["Logs"])
async def get_logs_stats():
    """Get statistics about log files."""
    return get_log_file_stats()


# =============================================================================
# Bot Control Routes
# =============================================================================

@app.post("/bot/start", tags=["Bot Control"])
async def start_bot():
    """Start the trading bot loop."""
    success = await start_bot_loop()
    if success:
        return {"status": "started", "mode": BOT_MODE}
    return {"status": "already_running", "mode": BOT_MODE}


@app.post("/bot/stop", tags=["Bot Control"])
async def stop_bot():
    """Stop the trading bot loop."""
    success = await stop_bot_loop()
    if success:
        return {"status": "stopped"}
    return {"status": "not_running"}


@app.get("/bot/status", tags=["Bot Control"])
async def bot_status():
    """Get detailed bot running status."""
    # Check if task is actually running
    task_running = _bot_task is not None and not _bot_task.done()
    
    return {
        "running": task_running,
        "bot_enabled": BOT_ENABLED,
        "mode": BOT_MODE,
        "interval_seconds": BOT_INTERVAL,
        "loop_count": _state.get("loop_count", 0),
        "last_loop_start": _state.get("last_loop_start"),
        "last_loop_finish": _state.get("last_loop_finish"),
        "last_update": _state.get("last_update"),
        "error": _state.get("bot_error"),
        "model_version": MODEL_VERSION,
        "positions_count": _state["overview"].get("open_positions", 0),
        "total_exposure": _state["overview"].get("total_exposure", 0),
    }


# =============================================================================
# Demo/Test Endpoints
# =============================================================================

@app.post("/demo/signal", tags=["Demo"])
async def demo_signal(
    ticker: str = "DEMO-MARKET",
    prediction: float = 0.65,
    price: float = 50.0,
):
    """Demo endpoint to test signal logging."""
    features = {
        "bid_ratio": 0.58,
        "imbalance_strength": 0.12,
        "volume_24h": 5000,
        "open_interest": 10000,
    }
    action = process_signal(ticker, features, prediction, price)
    return {"ticker": ticker, "action": action, "prediction": prediction}


@app.post("/demo/whale", tags=["Demo"])
async def demo_whale(
    ticker: str = "DEMO-MARKET",
    max_bid_size: int = 6000,
    max_ask_size: int = 2000,
    imbalance_strength: float = 0.3,
):
    """Demo endpoint to test whale logging."""
    ob_analysis = {
        "max_bid_size": max_bid_size,
        "max_ask_size": max_ask_size,
        "imbalance_strength": imbalance_strength,
        "best_bid": 48.0,
        "best_ask": 52.0,
    }
    is_whale = check_whale_activity(ticker, ob_analysis)
    return {"ticker": ticker, "logged": is_whale}


@app.post("/demo/pnl", tags=["Demo"])
async def demo_pnl():
    """Demo endpoint to test P&L snapshot logging."""
    record_pnl_snapshot()
    return {"logged": True}


# =============================================================================
# Startup/Shutdown Events
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("=" * 60)
    logger.info("KalshiProto API Starting...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Port: {os.getenv('PORT', '8000')}")
    logger.info(f"Model Version: {MODEL_VERSION}")
    logger.info("=" * 60)
    
    # Clear BOT startup message
    logger.info(f"BOT: startup, enabled={BOT_ENABLED}, mode={BOT_MODE}, interval={BOT_INTERVAL}s")
    
    # Log initial P&L snapshot
    record_pnl_snapshot()
    
    # Auto-start bot loop if enabled
    if BOT_ENABLED:
        try:
            logger.info("BOT: Auto-starting bot loop...")
            success = await start_bot_loop()
            if success:
                logger.info("BOT: Loop started successfully")
            else:
                logger.warning("BOT: Loop failed to start (may already be running)")
        except Exception as e:
            logger.exception(f"BOT: Failed to start bot loop: {e}")
            _state["bot_error"] = f"Startup failed: {e}"
    else:
        logger.info("BOT: Auto-start disabled (set BOT_ENABLED=true to enable)")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("KalshiProto API Shutting down...")
    
    # Stop bot loop
    await stop_bot_loop()
    
    # Final P&L snapshot
    record_pnl_snapshot()


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
