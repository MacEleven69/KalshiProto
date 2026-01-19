import { useState, useEffect, useCallback } from "react";
import { BotState } from "./types";

// =============================================================================
// API Configuration
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 2000;

// =============================================================================
// Placeholder Components (Replace with your actual components)
// =============================================================================

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-kalshi-buy animate-pulse' : 'bg-kalshi-sell'}`} />
      <span className="text-xs text-gray-400">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

function OverviewCard({ title, value, subtitle, color = "text-white" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="bg-kalshi-card rounded-xl p-4 border border-kalshi-accent/20">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function SignalsPanel({ markets }: { markets: BotState["markets"] }) {
  const buySignals = markets.filter(m => m.signal_direction === "BUY");
  const sellSignals = markets.filter(m => m.signal_direction === "SELL");
  
  return (
    <div className="bg-kalshi-card rounded-xl p-4 border border-kalshi-accent/20">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span>📊</span> Live Signals
      </h2>
      
      {markets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2">📭</div>
          <p>No signals yet. Start the bot to see live data.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {markets.slice(0, 10).map((m) => (
            <div
              key={m.ticker}
              className="flex items-center justify-between p-2 rounded-lg bg-kalshi-darker/50"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-kalshi-accent truncate">
                  {m.ticker.slice(0, 25)}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                m.signal_direction === "BUY" ? "bg-kalshi-buy/20 text-kalshi-buy" :
                m.signal_direction === "SELL" ? "bg-kalshi-sell/20 text-kalshi-sell" :
                "bg-kalshi-hold/20 text-kalshi-hold"
              }`}>
                {m.signal_direction}
              </div>
              <div className="ml-2 text-xs text-gray-400 w-12 text-right">
                {(m.signal_score * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-4 mt-4 pt-4 border-t border-kalshi-accent/10">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-kalshi-buy" />
          <span className="text-xs text-gray-400">BUY: {buySignals.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-kalshi-sell" />
          <span className="text-xs text-gray-400">SELL: {sellSignals.length}</span>
        </div>
      </div>
    </div>
  );
}

function WhalesPanel({ whales }: { whales: BotState["whales"] }) {
  return (
    <div className="bg-kalshi-card rounded-xl p-4 border border-kalshi-accent/20">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span>🐋</span> Whale Events
      </h2>
      
      {whales.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2">🌊</div>
          <p>No whale activity detected yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {whales.slice(0, 10).map((w, idx) => (
            <div
              key={`${w.ticker}-${idx}`}
              className="flex items-center justify-between p-2 rounded-lg bg-kalshi-darker/50"
            >
              <div className="font-mono text-xs text-kalshi-gold truncate flex-1">
                {w.ticker.slice(0, 20)}
              </div>
              <div className="text-xs text-gray-400">
                {Math.max(w.max_bid_size, w.max_ask_size).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PositionsPanel({ overview }: { overview: BotState["overview"] }) {
  return (
    <div className="bg-kalshi-card rounded-xl p-4 border border-kalshi-accent/20">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span>💼</span> Positions / PnL
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500">Open Positions</div>
          <div className="text-2xl font-bold">{overview.open_positions}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Total Exposure</div>
          <div className="text-2xl font-bold text-kalshi-gold">
            ${overview.total_exposure.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Daily P&L</div>
          <div className={`text-2xl font-bold ${overview.daily_pnl >= 0 ? 'text-kalshi-buy' : 'text-kalshi-sell'}`}>
            {overview.daily_pnl >= 0 ? '+' : ''}${overview.daily_pnl.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Equity</div>
          <div className="text-2xl font-bold">${overview.equity.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main App
// =============================================================================

function App() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/state/full`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data: BotState = await response.json();
      setBotState(data);
      setConnected(true);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : "Connection failed");
      
      // Set default state if not connected
      if (!botState) {
        setBotState({
          overview: { mode: "PAPER", equity: 10000, daily_pnl: 0, total_exposure: 0, open_positions: 0 },
          regime: { id: 0, name: "calm" },
          markets: [],
          whales: [],
          timeline: [],
        });
      }
    }
  }, [botState]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchState]);

  const overview = botState?.overview || {
    mode: "PAPER" as const,
    equity: 10000,
    daily_pnl: 0,
    total_exposure: 0,
    open_positions: 0,
  };

  return (
    <div className="min-h-screen bg-kalshi-darker text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-kalshi-darker via-kalshi-dark to-kalshi-darker pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-kalshi-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">KalshiProto Dashboard</h1>
            <p className="text-gray-500 text-sm">Whale Trading Bot</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge connected={connected} />
            {lastUpdate && (
              <span className="text-xs text-gray-600 font-mono">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {error && !connected && (
          <div className="bg-kalshi-sell/10 border border-kalshi-sell/30 rounded-lg p-4 text-sm">
            <span className="text-kalshi-sell font-semibold">Connection Error:</span>
            <span className="text-gray-400 ml-2">{error}</span>
            <span className="text-gray-500 ml-2">— Make sure the backend is running on {API_BASE_URL}</span>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverviewCard
            title="Mode"
            value={overview.mode}
            color={overview.mode === "LIVE" ? "text-kalshi-buy" : "text-kalshi-accent"}
          />
          <OverviewCard
            title="Equity"
            value={`$${overview.equity.toLocaleString()}`}
          />
          <OverviewCard
            title="Daily P&L"
            value={`${overview.daily_pnl >= 0 ? '+' : ''}$${overview.daily_pnl.toLocaleString()}`}
            color={overview.daily_pnl >= 0 ? "text-kalshi-buy" : "text-kalshi-sell"}
          />
          <OverviewCard
            title="Positions"
            value={overview.open_positions}
            subtitle={`$${overview.total_exposure.toLocaleString()} exposure`}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SignalsPanel markets={botState?.markets || []} />
          <WhalesPanel whales={botState?.whales || []} />
          <PositionsPanel overview={overview} />
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 pt-4 border-t border-kalshi-accent/10">
          KalshiProto Dashboard v1.0.0
          {connected && <span className="mx-2">•</span>}
          {connected && <span className="text-kalshi-accent">Live</span>}
        </footer>
      </div>
    </div>
  );
}

export default App;
