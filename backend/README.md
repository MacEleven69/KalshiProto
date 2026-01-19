# KalshiProto Backend

FastAPI backend for the Kalshi Whale Trading Bot.

## Quick Start

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Locally (Development)

```bash
uvicorn main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 4. Run in Production

```bash
# With explicit host/port
uvicorn main:app --host 0.0.0.0 --port 8000

# Using PORT environment variable (Railway style)
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI |
| `/state/overview` | GET | Bot overview |
| `/state/markets` | GET | Markets with signals |
| `/state/whales` | GET | Whale events |
| `/state/timeline` | GET | Timeline events |
| `/state/full` | GET | Complete state for dashboard |
| `/logs/stats` | GET | Log file statistics |
| `/bot/start` | POST | Start bot (placeholder) |
| `/bot/stop` | POST | Stop bot (placeholder) |
| `/bot/status` | GET | Bot status (placeholder) |
| `/demo/signal` | POST | Demo: test signal logging |
| `/demo/whale` | POST | Demo: test whale logging |
| `/demo/pnl` | POST | Demo: test P&L logging |

## Environment Variables

Create a `.env` file (optional):

```env
ENVIRONMENT=development
PORT=8000
LOG_LEVEL=INFO
KALSHI_API_KEY=your_api_key_here
KALSHI_SECRET=your_secret_here
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Environment name |
| `PORT` | `8000` | Server port |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

---

## Logging System

The backend includes a comprehensive logging system that writes to both stdout and CSV files.

### Log Files

All CSV log files are stored in the `logs/` subdirectory (created automatically on startup).

| File | Description |
|------|-------------|
| `logs/signals_log.csv` | Model predictions and trading decisions |
| `logs/trades_log.csv` | Order submissions and status updates |
| `logs/pnl_log.csv` | P&L and exposure snapshots |
| `logs/whale_log.csv` | Whale detections and microstructure events |

### signals_log.csv

Records every model prediction and the resulting trading decision.

| Column | Description |
|--------|-------------|
| `timestamp` | ISO timestamp (UTC) |
| `model_version` | Model identifier (e.g., "gbm_v1") |
| `market_ticker` | Market symbol |
| `decision_price` | Price at decision time |
| `features_json` | JSON-encoded feature vector |
| `prediction` | Model output (probability or label) |
| `action` | Decision taken: `enter_long`, `enter_short`, `exit`, `hold` |
| `position_before` | Position size before action |
| `position_after` | Position size after action |

### trades_log.csv

Records all order submissions and status updates.

| Column | Description |
|--------|-------------|
| `timestamp` | ISO timestamp (UTC) |
| `market_ticker` | Market symbol |
| `order_id` | Exchange order ID (if available) |
| `side` | `buy` or `sell` |
| `size` | Order quantity |
| `limit_price` | Limit price or execution price |
| `status` | `submitted`, `filled`, `partially_filled`, `canceled`, `error` |
| `error_message` | Error details (empty if no error) |

### pnl_log.csv

Records P&L and exposure snapshots at regular intervals and after trades.

| Column | Description |
|--------|-------------|
| `timestamp` | ISO timestamp (UTC) |
| `market_ticker` | Market symbol, or `"ALL"` for aggregate |
| `open_pnl` | Unrealized P&L |
| `realized_pnl` | Realized P&L |
| `cash` | Available cash |
| `position_size` | Position size (or count for aggregate) |
| `gross_exposure` | Total absolute notional exposure |

### whale_log.csv

Records whale detections and significant orderbook events.

| Column | Description |
|--------|-------------|
| `timestamp` | ISO timestamp (UTC) |
| `market_ticker` | Market symbol |
| `event_type` | Event type: `large_bid`, `large_ask`, `high_imbalance`, `spoof_suspected` |
| `size` | Order/event size |
| `price_level` | Price level of the event |
| `notional` | Notional value (if computed) |
| `depth_pct` | Depth percentage (if computed) |
| `imbalance_strength` | Orderbook imbalance metric |
| `side_bias` | Detected bias: `BUY_BIAS`, `SELL_BIAS` |

### Railway Deployment Note

On Railway, the filesystem is **ephemeral**. Log files are reset on each deploy or restart. These logs are primarily for:

- Short-term debugging
- Data snapshots during a session
- Development and testing

For persistent logging in production, consider:
- Streaming logs to a service like Papertrail, Datadog, or LogDNA
- Writing to a database (PostgreSQL, SQLite on a mounted volume)
- Exporting snapshots periodically to S3 or similar

### Using the Logging Functions

```python
from logging_utils import (
    log_signal_decision,
    log_trade,
    log_trade_fill,
    log_trade_error,
    log_pnl_snapshot,
    log_aggregate_pnl,
    log_whale_event,
    log_large_order,
)

# Log a signal decision
log_signal_decision(
    market_ticker="AAPL-YES",
    decision_price=52.5,
    features={"bid_ratio": 0.58, "volume": 1000},
    prediction=0.72,
    action="enter_long",
    position_before=0,
    position_after=100,
)

# Log a filled trade
log_trade_fill(
    market_ticker="AAPL-YES",
    side="buy",
    size=100,
    fill_price=52.5,
    order_id="order123",
)

# Log a whale detection
log_large_order(
    market_ticker="AAPL-YES",
    side="bid",
    size=8000,
    price_level=52.0,
    imbalance_strength=0.35,
)

# Log aggregate P&L
log_aggregate_pnl(
    cash=8500,
    open_pnl=125.0,
    realized_pnl=50.0,
    gross_exposure=1500,
    positions_count=2,
)
```

---

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── logging_utils.py     # Centralized logging configuration
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── .env                # Environment variables (not committed)
│
├── logs/               # CSV log files (auto-created)
│   ├── signals_log.csv
│   ├── trades_log.csv
│   ├── pnl_log.csv
│   └── whale_log.csv
│
├── src/                # Your bot code (copy from existing)
│   ├── config/
│   ├── market_scanner.py
│   ├── order_book_analyzer.py
│   ├── global_whale_monitor.py
│   ├── feature_builder.py
│   ├── signal_model_gbm.py
│   ├── risk_manager.py
│   ├── execution_engine.py
│   └── ...
│
└── models/             # Trained ML models
    └── gbm_label_up.pkl
```

## Migrating Existing Code

To migrate your existing bot code:

1. Copy `src/` folder from the original project
2. Copy `models/` folder
3. Update imports in `main.py` to use your modules
4. Wire up the bot state to the API endpoints
5. Call logging functions at appropriate points:
   - `log_signal_decision()` after model prediction
   - `log_trade()` when submitting/updating orders
   - `log_pnl_snapshot()` after trades or on interval
   - `log_whale_event()` when detecting whale activity

## Railway Deployment

Railway will auto-detect Python via `requirements.txt`.

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Root Directory:** Set to `backend` in Railway settings.

**Environment Variables to set in Railway:**
- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `KALSHI_API_KEY=...`
- `KALSHI_SECRET=...`
