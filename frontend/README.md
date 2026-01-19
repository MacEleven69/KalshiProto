# KalshiProto Frontend

React + TypeScript + Tailwind dashboard for the Kalshi Whale Trading Bot.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Password (Required)

Create a `.env.local` file in the `frontend/` directory:

```env
# Dashboard password (simple client-side gate)
VITE_DASHBOARD_PASSWORD=your_password_here

# Backend API URL (optional, defaults to localhost:8000)
# VITE_API_URL=http://localhost:8000
```

**Important:** The `.env.local` file is gitignored and should NOT be committed.

### 3. Run Development Server

```bash
npm run dev
```

The dashboard will be available at:
- **Local**: http://localhost:5173

### 4. Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### 5. Preview Production Build

```bash
npm run preview
```

---

## Password Protection

The dashboard includes a simple client-side password gate to keep casual visitors out.

### How It Works

1. On first load, users see a password input screen
2. Entering the correct password grants access to the dashboard
3. Auth status is stored in `sessionStorage` (cleared when tab closes)
4. Click the 🔒 icon in the header to logout

### Setting the Password

**For local development:**

Create `frontend/.env.local`:
```env
VITE_DASHBOARD_PASSWORD=bleakMidwinter
```

**For Railway deployment:**

1. Go to your frontend service in Railway
2. Navigate to **Variables**
3. Add: `VITE_DASHBOARD_PASSWORD` = `your_password`
4. Redeploy the service

### Security Notes

⚠️ **This is NOT high-security authentication.** It's a simple client-side check meant to:
- Keep random visitors from accessing the dashboard
- Provide a minimal access barrier

For production systems with sensitive data, consider:
- Server-side authentication
- JWT tokens
- OAuth integration

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DASHBOARD_PASSWORD` | (none) | Dashboard access password. If not set, no password required. |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

### API URL

By default, the frontend connects to `http://localhost:8000` for the backend API.

To change this:

1. Add to `.env.local`:
   ```env
   VITE_API_URL=http://your-backend-url.com
   ```

2. Or set it inline:
   ```bash
   VITE_API_URL=https://api.example.com npm run dev
   ```

---

## Project Structure

```
frontend/
├── src/
│   ├── components/     # UI components (add your own)
│   ├── App.tsx         # Main dashboard + password gate
│   ├── main.tsx        # Entry point
│   ├── types.ts        # TypeScript types
│   ├── vite-env.d.ts   # Vite environment types
│   └── index.css       # Tailwind + global styles
├── .env.local          # Local environment (gitignored)
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
| `npm run lint` | Run TypeScript check |

---

## Railway Deployment

### Option A: Deploy as Static Site

1. In Railway, create a new service from GitHub
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. **Set environment variables:**
   - `VITE_API_URL` = your deployed backend URL
   - `VITE_DASHBOARD_PASSWORD` = your password

### Option B: Keep Local

For development, just run the frontend locally and point to the deployed Railway backend.

---

## Troubleshooting

### Password not working?

1. Make sure `.env.local` exists in `frontend/`
2. Check that the variable is prefixed with `VITE_` (required by Vite)
3. Restart the dev server after changing `.env.local`

### Can't connect to backend?

1. Verify backend is running on the expected port
2. Check `VITE_API_URL` in your `.env.local`
3. Ensure CORS is enabled on the backend
