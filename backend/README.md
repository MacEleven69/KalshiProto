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
| `/bot/start` | POST | Start bot (placeholder) |
| `/bot/stop` | POST | Stop bot (placeholder) |
| `/bot/status` | GET | Bot status (placeholder) |

## Environment Variables

Create a `.env` file (optional):

```env
ENVIRONMENT=development
PORT=8000
KALSHI_API_KEY=your_api_key_here
KALSHI_SECRET=your_secret_here
```

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── .env                # Environment variables (not committed)
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

## Railway Deployment

Railway will auto-detect Python via `requirements.txt`.

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Root Directory:** Set to `backend` in Railway settings.
