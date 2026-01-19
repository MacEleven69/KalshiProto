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
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
}


def update_state(new_state: dict) -> None:
    """Update the global state (called by your bot logic)."""
    global _state
    _state.update(new_state)


# =============================================================================
# Routes
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API info."""
    return {
        "name": "KalshiProto API",
        "version": "1.0.0",
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
        timestamp=datetime.utcnow().isoformat(),
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


# =============================================================================
# Placeholder routes for your bot logic
# =============================================================================

@app.post("/bot/start", tags=["Bot Control"])
async def start_bot():
    """Start the trading bot (placeholder)."""
    # TODO: Implement bot start logic
    return {"status": "Bot start requested", "message": "Implement your bot logic here"}


@app.post("/bot/stop", tags=["Bot Control"])
async def stop_bot():
    """Stop the trading bot (placeholder)."""
    # TODO: Implement bot stop logic
    return {"status": "Bot stop requested", "message": "Implement your bot logic here"}


@app.get("/bot/status", tags=["Bot Control"])
async def bot_status():
    """Get bot running status (placeholder)."""
    return {
        "running": False,
        "loop_count": 0,
        "last_update": None,
        "message": "Implement your bot status logic here",
    }


# =============================================================================
# Startup/Shutdown Events
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("=" * 60)
    print("KalshiProto API Starting...")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"Port: {os.getenv('PORT', '8000')}")
    print("=" * 60)
    # TODO: Initialize your bot, load models, etc.


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    print("KalshiProto API Shutting down...")
    # TODO: Clean up resources, stop bot, etc.


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
