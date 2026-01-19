# KalshiProto

Full-stack monorepo for the Kalshi Whale Trading Bot.

```
KalshiProto/
├── backend/      # Python FastAPI + Bot Logic
├── frontend/     # React + TypeScript Dashboard
└── README.md     # This file
```

---

## Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload
```

API will be at: http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Dashboard will be at: http://localhost:5173

### 3. Both at Once (PowerShell)

```powershell
# Terminal 1: Backend
cd backend; .\venv\Scripts\activate; uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend; npm run dev
```

---

## Git / GitHub Setup

Once you've created everything, run these commands to push to GitHub:

```bash
cd KalshiProto
git init
git remote add origin git@github.com:MacEleven69/KalshiProto.git
git add .
git commit -m "Initial KalshiProto fullstack setup"
git push -u origin main
```

If you get an error about branch name, try:
```bash
git branch -M main
git push -u origin main
```

---

## Railway Deployment Notes

Railway can deploy both services from this single GitHub repo.

### Backend Service

1. **Create a new service** in Railway
2. **Connect to GitHub** → Select `MacEleven69/KalshiProto`
3. **Settings:**
   - **Root Directory:** `backend`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   ```
   ENVIRONMENT=production
   KALSHI_API_KEY=your_key_here
   KALSHI_SECRET=your_secret_here
   ```
5. Railway auto-detects Python via `requirements.txt`

### Frontend Service (Optional)

**Option A: Deploy as separate static site**

1. Create another service in Railway
2. Connect same GitHub repo
3. **Settings:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-service.up.railway.app
   ```

**Option B: Keep frontend local**

- Run `npm run dev` locally
- Set `VITE_API_URL` to your Railway backend URL
- Good for development phase

### Service URLs

After deployment, Railway provides URLs like:
- Backend: `https://kalshiproto-backend.up.railway.app`
- Frontend: `https://kalshiproto-frontend.up.railway.app`

Update your frontend's `VITE_API_URL` to point to your backend URL.

---

## Project Structure

```
KalshiProto/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt     # Python dependencies
│   ├── README.md
│   └── src/                 # (Add your bot code here)
│       ├── config/
│       ├── market_scanner.py
│       ├── order_book_analyzer.py
│       ├── global_whale_monitor.py
│       ├── feature_builder.py
│       ├── signal_model_gbm.py
│       ├── risk_manager.py
│       └── execution_engine.py
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main dashboard
│   │   ├── types.ts         # TypeScript types
│   │   └── components/      # (Add your components here)
│   ├── package.json
│   ├── tailwind.config.js
│   └── README.md
│
├── .gitignore
└── README.md                # This file
```

---

## Migrating Your Existing Code

### Backend

1. Copy your `src/` folder into `backend/src/`
2. Copy `models/` folder into `backend/models/`
3. Update imports in `backend/main.py`
4. Wire up the state updates

### Frontend

1. Copy your components into `frontend/src/components/`
2. Merge types into `frontend/src/types.ts`
3. Update `frontend/src/App.tsx`

---

## Environment Variables

### Backend (.env)

```env
ENVIRONMENT=development
PORT=8000
KALSHI_API_KEY=your_api_key
KALSHI_SECRET=your_secret
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| ML | scikit-learn (GBM), pandas, numpy |
| Deployment | Railway (from GitHub) |

---

## Useful Commands

```bash
# Backend
cd backend
uvicorn main:app --reload          # Dev
uvicorn main:app --host 0.0.0.0    # Prod

# Frontend
cd frontend
npm run dev                         # Dev
npm run build                       # Build
npm run preview                     # Preview build
```

---

*Created with Cursor AI + Claude*
