"""
KalshiProto Logging Utilities
==============================

Centralized logging configuration and CSV loggers for:
- signals_log.csv: Model predictions and trading decisions
- trades_log.csv: Order submissions and status updates
- pnl_log.csv: P&L and exposure snapshots
- whale_log.csv: Whale detections and microstructure events

Usage:
    from logging_utils import (
        setup_logging,
        log_signal_decision,
        log_trade,
        log_pnl_snapshot,
        log_whale_event,
    )
"""

import csv
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# =============================================================================
# Configuration
# =============================================================================

# Model version - easy to update when you retrain
MODEL_VERSION = "gbm_v1"

# Log directory (relative to backend root)
LOGS_DIR = Path(__file__).parent / "logs"

# CSV file paths
SIGNALS_LOG = LOGS_DIR / "signals_log.csv"
TRADES_LOG = LOGS_DIR / "trades_log.csv"
PNL_LOG = LOGS_DIR / "pnl_log.csv"
WHALE_LOG = LOGS_DIR / "whale_log.csv"

# CSV column definitions
SIGNALS_COLUMNS = [
    "timestamp",
    "model_version",
    "market_ticker",
    "decision_price",
    "features_json",
    "prediction",
    "action",
    "position_before",
    "position_after",
]

TRADES_COLUMNS = [
    "timestamp",
    "market_ticker",
    "order_id",
    "side",
    "size",
    "limit_price",
    "status",
    "error_message",
]

PNL_COLUMNS = [
    "timestamp",
    "market_ticker",
    "open_pnl",
    "realized_pnl",
    "cash",
    "position_size",
    "gross_exposure",
]

WHALE_COLUMNS = [
    "timestamp",
    "market_ticker",
    "event_type",
    "size",
    "price_level",
    "notional",
    "depth_pct",
    "imbalance_strength",
    "side_bias",
]


# =============================================================================
# Logging Setup
# =============================================================================

def setup_logging(
    level: Optional[str] = None,
    format_string: Optional[str] = None,
) -> logging.Logger:
    """
    Configure the root logger for the application.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR). 
               Defaults to LOG_LEVEL env var or INFO.
        format_string: Custom format string. Defaults to a sensible format.
    
    Returns:
        The configured root logger.
    """
    # Determine log level from env var or parameter
    log_level_str = level or os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    
    # Default format
    if format_string is None:
        format_string = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=format_string,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(),  # stdout
        ],
    )
    
    # Create logs directory
    ensure_logs_directory()
    
    logger = logging.getLogger("kalshiproto")
    logger.info(f"Logging initialized at level {log_level_str}")
    logger.info(f"Logs directory: {LOGS_DIR.absolute()}")
    
    return logger


def ensure_logs_directory() -> None:
    """Create the logs directory if it doesn't exist."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def get_logger(name: str = "kalshiproto") -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


# =============================================================================
# CSV Writing Utilities
# =============================================================================

def _write_csv_row(filepath: Path, columns: list, row: Dict[str, Any]) -> None:
    """
    Append a row to a CSV file. Creates file with header if it doesn't exist.
    
    Args:
        filepath: Path to the CSV file.
        columns: List of column names.
        row: Dictionary with column values.
    """
    ensure_logs_directory()
    
    file_exists = filepath.exists()
    
    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        
        # Write header if file is new
        if not file_exists:
            writer.writeheader()
        
        writer.writerow(row)


def _now_iso() -> str:
    """Get current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


# =============================================================================
# Signal Decision Logging
# =============================================================================

def log_signal_decision(
    market_ticker: str,
    decision_price: float,
    features: Dict[str, Any],
    prediction: Any,
    action: str,
    position_before: float,
    position_after: float,
    model_version: str = MODEL_VERSION,
) -> None:
    """
    Log a model prediction and trading decision.
    
    Args:
        market_ticker: The market symbol/ticker.
        decision_price: Mid or last price at decision time.
        features: Feature vector dict used for prediction.
        prediction: Model output (probability, class label, etc.).
        action: Trading action (enter_long, enter_short, exit, hold).
        position_before: Position size before the action.
        position_after: Position size after the action.
        model_version: Model identifier string.
    """
    logger = get_logger("signals")
    
    row = {
        "timestamp": _now_iso(),
        "model_version": model_version,
        "market_ticker": market_ticker,
        "decision_price": decision_price,
        "features_json": json.dumps(features, default=str),
        "prediction": prediction,
        "action": action,
        "position_before": position_before,
        "position_after": position_after,
    }
    
    _write_csv_row(SIGNALS_LOG, SIGNALS_COLUMNS, row)
    
    # Compact info log
    logger.info(
        f"SIGNAL | {market_ticker} | price={decision_price:.2f} | "
        f"pred={prediction} | action={action} | "
        f"pos: {position_before:.2f} -> {position_after:.2f}"
    )


# =============================================================================
# Trade/Order Logging
# =============================================================================

def log_trade(
    market_ticker: str,
    side: str,
    size: float,
    limit_price: float,
    status: str,
    order_id: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """
    Log an order submission or status update.
    
    Args:
        market_ticker: The market symbol/ticker.
        side: "buy" or "sell".
        size: Order size.
        limit_price: Limit price or execution price.
        status: Order status (submitted, filled, partially_filled, canceled, error).
        order_id: Exchange order ID if available.
        error_message: Error message if status is "error".
    """
    logger = get_logger("trades")
    
    row = {
        "timestamp": _now_iso(),
        "market_ticker": market_ticker,
        "order_id": order_id or "",
        "side": side,
        "size": size,
        "limit_price": limit_price,
        "status": status,
        "error_message": error_message or "",
    }
    
    _write_csv_row(TRADES_LOG, TRADES_COLUMNS, row)
    
    # Log based on status
    if status in ("filled", "submitted"):
        logger.info(
            f"TRADE | {status.upper()} | {market_ticker} | "
            f"{side} {size} @ {limit_price:.2f} | order_id={order_id or 'N/A'}"
        )
    elif status == "error":
        logger.error(
            f"TRADE ERROR | {market_ticker} | {side} {size} @ {limit_price:.2f} | "
            f"error: {error_message}"
        )
    else:
        logger.info(
            f"TRADE | {status.upper()} | {market_ticker} | "
            f"{side} {size} @ {limit_price:.2f}"
        )


def log_trade_fill(
    market_ticker: str,
    side: str,
    size: float,
    fill_price: float,
    order_id: Optional[str] = None,
) -> None:
    """Convenience function for logging a filled trade."""
    log_trade(
        market_ticker=market_ticker,
        side=side,
        size=size,
        limit_price=fill_price,
        status="filled",
        order_id=order_id,
    )


def log_trade_error(
    market_ticker: str,
    side: str,
    size: float,
    limit_price: float,
    error_message: str,
) -> None:
    """Convenience function for logging a trade error."""
    log_trade(
        market_ticker=market_ticker,
        side=side,
        size=size,
        limit_price=limit_price,
        status="error",
        error_message=error_message,
    )


# =============================================================================
# PnL / Exposure Logging
# =============================================================================

def log_pnl_snapshot(
    market_ticker: str,
    open_pnl: float,
    realized_pnl: float,
    cash: float,
    position_size: float,
    gross_exposure: float,
) -> None:
    """
    Log a P&L and exposure snapshot.
    
    Args:
        market_ticker: Market ticker, or "ALL" for aggregate snapshot.
        open_pnl: Unrealized P&L.
        realized_pnl: Realized P&L.
        cash: Available cash.
        position_size: Current position size.
        gross_exposure: Total exposure (absolute notional).
    """
    logger = get_logger("pnl")
    
    row = {
        "timestamp": _now_iso(),
        "market_ticker": market_ticker,
        "open_pnl": open_pnl,
        "realized_pnl": realized_pnl,
        "cash": cash,
        "position_size": position_size,
        "gross_exposure": gross_exposure,
    }
    
    _write_csv_row(PNL_LOG, PNL_COLUMNS, row)
    
    # Only log to console for aggregate or significant changes
    if market_ticker == "ALL":
        total_pnl = open_pnl + realized_pnl
        logger.info(
            f"PNL SNAPSHOT | cash={cash:.2f} | open_pnl={open_pnl:.2f} | "
            f"realized={realized_pnl:.2f} | total={total_pnl:.2f} | "
            f"exposure={gross_exposure:.2f}"
        )


def log_aggregate_pnl(
    cash: float,
    open_pnl: float,
    realized_pnl: float,
    gross_exposure: float,
    positions_count: int = 0,
) -> None:
    """Convenience function for logging aggregate portfolio state."""
    log_pnl_snapshot(
        market_ticker="ALL",
        open_pnl=open_pnl,
        realized_pnl=realized_pnl,
        cash=cash,
        position_size=positions_count,
        gross_exposure=gross_exposure,
    )


# =============================================================================
# Whale / Microstructure Event Logging
# =============================================================================

def log_whale_event(
    market_ticker: str,
    event_type: str,
    size: float,
    price_level: float,
    notional: Optional[float] = None,
    depth_pct: Optional[float] = None,
    imbalance_strength: Optional[float] = None,
    side_bias: Optional[str] = None,
) -> None:
    """
    Log a whale detection or microstructure event.
    
    Args:
        market_ticker: The market symbol/ticker.
        event_type: Type of event (large_bid, large_ask, spoof_suspected, etc.).
        size: Order/event size.
        price_level: Price level of the event.
        notional: Notional value if computed.
        depth_pct: Depth percentage if computed.
        imbalance_strength: Order book imbalance metric.
        side_bias: Detected side bias (BUY_BIAS, SELL_BIAS).
    """
    logger = get_logger("whale")
    
    row = {
        "timestamp": _now_iso(),
        "market_ticker": market_ticker,
        "event_type": event_type,
        "size": size,
        "price_level": price_level,
        "notional": notional or 0.0,
        "depth_pct": depth_pct or 0.0,
        "imbalance_strength": imbalance_strength or 0.0,
        "side_bias": side_bias or "",
    }
    
    _write_csv_row(WHALE_LOG, WHALE_COLUMNS, row)
    
    # Compact whale alert
    bias_str = f" | bias={side_bias}" if side_bias else ""
    imb_str = f" | imb={imbalance_strength:.1%}" if imbalance_strength else ""
    logger.info(
        f"WHALE | {event_type} | {market_ticker} | "
        f"size={size:,.0f} @ {price_level:.2f}{bias_str}{imb_str}"
    )


def log_large_order(
    market_ticker: str,
    side: str,
    size: float,
    price_level: float,
    imbalance_strength: Optional[float] = None,
) -> None:
    """Convenience function for logging a large bid/ask detection."""
    event_type = "large_bid" if side.lower() in ("bid", "buy") else "large_ask"
    side_bias = "BUY_BIAS" if side.lower() in ("bid", "buy") else "SELL_BIAS"
    
    log_whale_event(
        market_ticker=market_ticker,
        event_type=event_type,
        size=size,
        price_level=price_level,
        imbalance_strength=imbalance_strength,
        side_bias=side_bias,
    )


# =============================================================================
# Utility Functions
# =============================================================================

def get_log_file_paths() -> Dict[str, Path]:
    """Return paths to all log files."""
    return {
        "signals": SIGNALS_LOG,
        "trades": TRADES_LOG,
        "pnl": PNL_LOG,
        "whale": WHALE_LOG,
    }


def get_log_file_stats() -> Dict[str, Dict[str, Any]]:
    """Get stats about each log file (exists, size, line count)."""
    stats = {}
    for name, path in get_log_file_paths().items():
        if path.exists():
            line_count = sum(1 for _ in open(path, "r", encoding="utf-8"))
            stats[name] = {
                "exists": True,
                "path": str(path),
                "size_bytes": path.stat().st_size,
                "line_count": line_count,
            }
        else:
            stats[name] = {
                "exists": False,
                "path": str(path),
                "size_bytes": 0,
                "line_count": 0,
            }
    return stats
