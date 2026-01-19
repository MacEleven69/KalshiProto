"""
KalshiProto Backend - FastAPI Application
==========================================

Main entry point for the Kalshi trading bot API.

Run locally:
    uvicorn main:app --reload

Run in production (Railway):
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""

import os
from datetime import datetime, timezone
from typing import Optional

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
# In production, replace "*" with your actual frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "*",  # Remove in production and add specific origins
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
    mode: str  # "PAPER" or "LIVE"
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
# In-Memory State (Replace with your actual bot state)
# =============================================================================

_state = {
    "overview": {
        "mode": "PAPER",
        "equity": 10000.0,
        "daily_pnl": 0.0,
        "total_exposure": 0.0,
        "open_positions": 0,
    },
    "markets": [],
    "whales": [],
    "timeline": [],
    "positions": {},  # ticker -> position_size
    "realized_pnl": 0.0,
}


def update_state(new_state: dict) -> None:
    """Update the global state (called by your bot logic)."""
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


# =============================================================================
# Trading Logic Integration Points
# =============================================================================

def process_signal(
    ticker: str,
    features: dict,
    prediction: float,
    decision_price: float,
) -> str:
    """
    Process a model prediction and decide on action.
    
    This is where you integrate your signal model output.
    Returns the action taken.
    """
    position_before = get_position(ticker)
    
    # Example decision logic (replace with your actual logic)
    if prediction >= 0.6 and position_before <= 0:
        action = "enter_long"
        position_after = 100.0  # Example position size
    elif prediction <= 0.4 and position_before >= 0:
        action = "enter_short"
        position_after = -100.0
    elif position_before != 0 and 0.45 < prediction < 0.55:
        action = "exit"
        position_after = 0.0
    else:
        action = "hold"
        position_after = position_before
    
    # Log the decision
    log_signal_decision(
        market_ticker=ticker,
        decision_price=decision_price,
        features=features,
        prediction=prediction,
        action=action,
        position_before=position_before,
        position_after=position_after,
    )
    
    # Update position if changed
    if position_after != position_before:
        set_position(ticker, position_after)
    
    return action


def submit_order(
    ticker: str,
    side: str,
    size: float,
    limit_price: float,
) -> dict:
    """
    Submit an order to Kalshi (placeholder).
    
    Replace with actual Kalshi API integration.
    """
    logger.info(f"Submitting order: {side} {size} {ticker} @ {limit_price}")
    
    try:
        # TODO: Replace with actual Kalshi API call
        # response = kalshi_client.submit_order(...)
        
        # Simulate success for paper trading
        order_id = f"paper_{ticker}_{datetime.now(timezone.utc).timestamp()}"
        
        # Log successful submission
        log_trade(
            market_ticker=ticker,
            side=side,
            size=size,
            limit_price=limit_price,
            status="submitted",
            order_id=order_id,
        )
        
        # Simulate immediate fill for paper trading
        log_trade_fill(
            market_ticker=ticker,
            side=side,
            size=size,
            fill_price=limit_price,
            order_id=order_id,
        )
        
        return {
            "success": True,
            "order_id": order_id,
            "status": "filled",
        }
        
    except Exception as e:
        error_msg = str(e)
        log_trade_error(
            market_ticker=ticker,
            side=side,
            size=size,
            limit_price=limit_price,
            error_message=error_msg,
        )
        return {
            "success": False,
            "error": error_msg,
        }


def record_pnl_snapshot() -> None:
    """
    Record current P&L and exposure snapshot.
    
    Call this after each trade or at regular intervals.
    """
    overview = _state.get("overview", {})
    positions = _state.get("positions", {})
    
    # Calculate aggregate exposure
    gross_exposure = sum(abs(pos) for pos in positions.values())
    
    log_aggregate_pnl(
        cash=overview.get("equity", 10000.0) - gross_exposure,
        open_pnl=overview.get("daily_pnl", 0.0),
        realized_pnl=_state.get("realized_pnl", 0.0),
        gross_exposure=gross_exposure,
        positions_count=len([p for p in positions.values() if p != 0]),
    )


def record_whale_detection(
    ticker: str,
    max_bid_size: int,
    max_ask_size: int,
    imbalance_strength: float,
    best_bid: float = 0.0,
    best_ask: float = 0.0,
) -> None:
    """
    Record a whale detection event.
    
    Call this from your whale monitoring logic.
    """
    # Determine event type and side
    if max_bid_size >= 5000:
        log_large_order(
            market_ticker=ticker,
            side="bid",
            size=max_bid_size,
            price_level=best_bid,
            imbalance_strength=imbalance_strength,
        )
    
    if max_ask_size >= 5000:
        log_large_order(
            market_ticker=ticker,
            side="ask",
            size=max_ask_size,
            price_level=best_ask,
            imbalance_strength=imbalance_strength,
        )
    
    # Also log if high imbalance even without large single order
    if imbalance_strength >= 0.25 and max_bid_size < 5000 and max_ask_size < 5000:
        side_bias = "BUY_BIAS" if imbalance_strength > 0 else "SELL_BIAS"
        log_whale_event(
            market_ticker=ticker,
            event_type="high_imbalance",
            size=max(max_bid_size, max_ask_size),
            price_level=(best_bid + best_ask) / 2 if best_bid and best_ask else 0.0,
            imbalance_strength=imbalance_strength,
            side_bias=side_bias,
        )


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
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Railway and other platforms use this to verify the service is running.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "development"),
    )


@app.get("/state/overview", tags=["Bot State"])
async def get_overview():
    """Get bot overview: mode, equity, P&L, exposure, positions."""
    return _state.get("overview", {})


@app.get("/state/markets", tags=["Bot State"])
async def get_markets():
    """Get current markets with signals."""
    return {"markets": _state.get("markets", []), "count": len(_state.get("markets", []))}


@app.get("/state/whales", tags=["Bot State"])
async def get_whales(limit: int = 50):
    """Get recent whale events."""
    whales = _state.get("whales", [])[-limit:]
    return {"whales": whales, "count": len(whales)}


@app.get("/state/timeline", tags=["Bot State"])
async def get_timeline(limit: int = 100):
    """Get recent timeline events."""
    timeline = _state.get("timeline", [])[-limit:]
    return {"timeline": timeline, "count": len(timeline)}


@app.get("/state/full", tags=["Bot State"])
async def get_full_state():
    """
    Get complete bot state for dashboard.
    
    Returns:
        BotState with overview, markets, whales, and timeline.
    """
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
# Placeholder routes for your bot logic
# =============================================================================

@app.post("/bot/start", tags=["Bot Control"])
async def start_bot():
    """Start the trading bot (placeholder)."""
    logger.info("Bot start requested")
    # TODO: Implement bot start logic
    return {"status": "Bot start requested", "message": "Implement your bot logic here"}


@app.post("/bot/stop", tags=["Bot Control"])
async def stop_bot():
    """Stop the trading bot (placeholder)."""
    logger.info("Bot stop requested")
    # TODO: Implement bot stop logic
    return {"status": "Bot stop requested", "message": "Implement your bot logic here"}


@app.get("/bot/status", tags=["Bot Control"])
async def bot_status():
    """Get bot running status (placeholder)."""
    return {
        "running": False,
        "loop_count": 0,
        "last_update": None,
        "model_version": MODEL_VERSION,
        "message": "Implement your bot status logic here",
    }


# =============================================================================
# Demo/Test Endpoints (remove in production)
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
    record_whale_detection(
        ticker=ticker,
        max_bid_size=max_bid_size,
        max_ask_size=max_ask_size,
        imbalance_strength=imbalance_strength,
        best_bid=48.0,
        best_ask=52.0,
    )
    return {"ticker": ticker, "logged": True}


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
    
    # Log initial P&L snapshot
    record_pnl_snapshot()


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("KalshiProto API Shutting down...")
    # Final P&L snapshot
    record_pnl_snapshot()


# =============================================================================
# Entry Point (for direct execution)
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
