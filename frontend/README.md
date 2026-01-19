# KalshiProto Frontend

React + TypeScript + Tailwind dashboard for the Kalshi Whale Trading Bot.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The dashboard will be available at:
- **Local**: http://localhost:5173

### 3. Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### 4. Preview Production Build

```bash
npm run preview
```

## Configuration

### API URL

By default, the frontend connects to `http://localhost:8000` for the backend API.

To change this:

1. Create a `.env` file:
   ```env
   VITE_API_URL=http://your-backend-url.com
   ```

2. Or set it inline:
   ```bash
   VITE_API_URL=https://api.example.com npm run dev
   ```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # UI components (add your own)
│   ├── App.tsx         # Main dashboard
│   ├── main.tsx        # Entry point
│   ├── types.ts        # TypeScript types
│   └── index.css       # Tailwind + global styles
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── vite.config.ts
```

## Migrating Existing Components

To migrate your existing dashboard components:

1. Copy your component files to `src/components/`
2. Copy your types to `src/types.ts` (or merge)
3. Update imports in `App.tsx`
4. Update API URL if needed

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Railway Deployment

### Option A: Deploy as Static Site

1. In Railway, create a new service from GitHub
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set `VITE_API_URL` env var to your deployed backend URL

### Option B: Keep Local

For development, just run the frontend locally and point to the deployed Railway backend.
