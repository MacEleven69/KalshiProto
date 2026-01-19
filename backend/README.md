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

---

## Bot Loop (Auto-Start)

The trading bot loop **starts automatically** when the application starts. This means:

- On Railway deployment, the bot begins polling Kalshi markets immediately
- Signals, trades, whale detections, and P&L are logged continuously
- The `/state/full` endpoint returns live data updated every loop

### How It Works

1. **Startup**: FastAPI fires a startup event that launches `bot_loop()` as an async background task
2. **Loop**: Every `BOT_INTERVAL` seconds (default 60), the bot:
   - Fetches top 20 markets from Kalshi API
   - Analyzes orderbooks for each market
   - Detects whale activity (large orders, high imbalance)
   - Generates trading signals
   - Executes paper trades (in paper mode)
   - Updates in-memory state for `/state/full`
   - Logs everything to CSV and stdout
3. **Shutdown**: Bot loop stops gracefully on app shutdown

### Bot Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_MODE` | `paper` | Trading mode: `paper` or `live` |
| `BOT_ENABLED` | `true` | Auto-start bot on startup: `true` or `false` |
| `BOT_INTERVAL` | `60` | Loop interval in seconds |

### Bot Control Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bot/start` | POST | Manually start the bot loop |
| `/bot/stop` | POST | Stop the bot loop |
| `/bot/status` | GET | Get bot status (running, loop count, last update) |

### Example Log Output

When the bot is running, you'll see logs like:

```
2026-01-18 22:15:00 | INFO | main | --- Loop 1 starting ---
2026-01-18 22:15:01 | INFO | main | Fetched 20 markets
2026-01-18 22:15:02 | INFO | signals | SIGNAL | KXINX-26JAN23 | price=52.50 | pred=0.65 | action=enter_long | pos: 0.00 -> 100.00
2026-01-18 22:15:02 | INFO | trades | TRADE | SUBMITTED | KXINX-26JAN23 | buy 100 @ 52.50
2026-01-18 22:15:02 | INFO | trades | TRADE | FILLED | KXINX-26JAN23 | buy 100 @ 52.50
2026-01-18 22:15:03 | INFO | whale | WHALE | large_bid | AAPL-YES | size=6,500 @ 48.00 | imb=32.5%
2026-01-18 22:15:05 | INFO | pnl | PNL SNAPSHOT | cash=9900.00 | open_pnl=0.00 | realized=0.00 | exposure=100.00
2026-01-18 22:15:05 | INFO | main | Loop 1 complete: 10 markets, 2 whales, 1 positions
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info + bot status |
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI |
| `/state/overview` | GET | Bot overview |
| `/state/markets` | GET | Markets with signals |
| `/state/whales` | GET | Whale events |
| `/state/timeline` | GET | Timeline events |
| `/state/full` | GET | Complete state for dashboard |
| `/logs/stats` | GET | Log file statistics |
| `/bot/start` | POST | Start bot loop |
| `/bot/stop` | POST | Stop bot loop |
| `/bot/status` | GET | Bot running status |
| `/demo/signal` | POST | Demo: test signal logging |
| `/demo/whale` | POST | Demo: test whale logging |
| `/demo/pnl` | POST | Demo: test P&L logging |

---

## Environment Variables

Create a `.env` file (optional for local dev):

```env
# Server
ENVIRONMENT=development
PORT=8000
LOG_LEVEL=INFO

# Bot Configuration
BOT_MODE=paper
BOT_ENABLED=true
BOT_INTERVAL=60

# Kalshi API (for future live trading)
KALSHI_API_KEY=your_api_key_here
KALSHI_SECRET=your_secret_here
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Environment name |
| `PORT` | `8000` | Server port |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `BOT_MODE` | `paper` | `paper` = simulated trades, `live` = real orders |
| `BOT_ENABLED` | `true` | Auto-start bot on app startup |
| `BOT_INTERVAL` | `60` | Seconds between bot loop iterations |

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

### Railway Note on Logs

On Railway, the filesystem is **ephemeral**. Log files are reset on each deploy or restart. These logs are primarily for:

- Short-term debugging
- Data snapshots during a session
- Development and testing

For persistent logging in production, consider:
- Streaming logs to Papertrail, Datadog, or LogDNA
- Writing to a database
- Exporting to S3 or similar

---

## Project Structure

```
backend/
├── main.py              # FastAPI app + bot loop
├── logging_utils.py     # Centralized logging
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
├── src/                # Your bot code (optional migration)
│   └── ...
│
└── models/             # Trained ML models
    └── gbm_label_up.pkl
```

---

## Railway Deployment

Railway will auto-detect Python via `requirements.txt`.

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Root Directory:** Set to `backend` in Railway settings.

**Environment Variables to set in Railway:**

| Variable | Value | Required |
|----------|-------|----------|
| `ENVIRONMENT` | `production` | Optional |
| `BOT_MODE` | `paper` | Recommended |
| `BOT_ENABLED` | `true` | Optional (default true) |
| `BOT_INTERVAL` | `60` | Optional |
| `LOG_LEVEL` | `INFO` | Optional |

### What Happens on Railway

1. Railway deploys and starts `uvicorn main:app`
2. Startup event fires → bot loop starts automatically
3. Bot polls Kalshi every 60 seconds
4. Logs appear in Railway's log viewer
5. Dashboard connects to `/state/full` and shows live data

---

## Disabling Auto-Start

If you want to disable the bot on startup (for debugging):

```env
BOT_ENABLED=false
```

Then manually start it via:
```bash
curl -X POST http://localhost:8000/bot/start
```

---

## Troubleshooting

### Bot not starting?

1. Check `BOT_ENABLED` is `true` (default)
2. Look at startup logs for errors
3. Hit `/bot/status` to see current state

### No markets showing?

1. Kalshi API may be rate-limited
2. Check logs for fetch errors
3. Some markets have no volume

### Logs not appearing?

1. Ensure `logs/` directory exists (auto-created)
2. Check write permissions
3. Verify `LOG_LEVEL` is `INFO` or `DEBUG`
