import { useState, useEffect, useCallback } from "react";
import { BotState, MarketState, BotOverview } from "./types";
import { BotHud, WhaleRadar, FeatureInfluence, TimelineStrip, MarketsTable } from "./whale-legacy";

// ============================================================================
// IMPORTANCE CALCULATION
// ============================================================================

function computeImportance(m: MarketState, overview: BotOverview): number {
  const exposure = overview.equity > 0 ? m.position_notional / overview.equity : 0;
  const conviction = Math.abs(m.signal_score - 0.5) * 2; // 0..1
  const whaleScore = Math.min(1, m.recent_whale_count + m.recent_whale_max_size / 10000);
  return 0.5 * exposure + 0.3 * conviction + 0.2 * whaleScore;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

// ============================================================================
// FALLBACK MOCK DATA (used while loading or on error)
// ============================================================================

const mockBotState: BotState = {
  overview: {
    mode: "PAPER",
    equity: 10000.0,
    daily_pnl: 0,
    total_exposure: 0,
    open_positions: 0,
  },
  regime: {
    id: 0,
    name: "calm",
  },
  markets: [],
  whales: [],
  timeline: [],
};

// ============================================================================
// CONNECTION STATUS COMPONENT
// ============================================================================

function ConnectionStatus({ 
  connected, 
  lastUpdate, 
  error 
}: { 
  connected: boolean; 
  lastUpdate: Date | null;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-whale-buy animate-pulse' : 'bg-whale-sell'}`} />
        <span className="text-xs text-gray-500">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {lastUpdate && (
        <span className="text-xs text-gray-600 font-mono">
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
      {error && (
        <span className="text-xs text-whale-sell">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-whale-darker flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-whale-accent/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-whale-accent rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-transparent border-t-whale-gold rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <h2 className="font-display text-xl text-white mb-2">Connecting to Bot</h2>
        <p className="text-gray-500 text-sm">
          Waiting for data from <span className="font-mono text-whale-accent">{API_BASE_URL}</span>
        </p>
        <p className="text-gray-600 text-xs mt-4">
          Make sure the backend is running
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// WHALE BOT DASHBOARD COMPONENT
// ============================================================================

interface WhaleBotDashboardProps {
  onLogout: () => void;
}

export function WhaleBotDashboard({ onLogout }: WhaleBotDashboardProps) {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch state from API
  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/state/full`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BotState = await response.json();
      
      setBotState(data);
      setIsConnected(true);
      setLastUpdate(new Date());
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('Failed to fetch bot state:', err);
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setRetryCount(prev => prev + 1);
      
      // After 3 retries, fall back to mock data
      if (retryCount >= 3 && !botState) {
        setBotState(mockBotState);
      }
    }
  }, [retryCount, botState]);

  // Initial fetch and polling
  useEffect(() => {
    // Fetch immediately on mount
    fetchState();

    // Set up polling interval
    const intervalId = setInterval(fetchState, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchState]);

  // Show loading spinner while waiting for initial data
  if (!botState) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-whale-darker text-white">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-whale-darker via-whale-dark to-whale-darker pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-whale-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">
              Kalshi Whale Bot
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Real-time market intelligence & execution
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus 
              connected={isConnected} 
              lastUpdate={lastUpdate}
              error={error}
            />
            <button
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              title="Logout"
            >
              🔒
            </button>
          </div>
        </header>

        {/* Top Section - Bot HUD (visually dominant) */}
        <section>
          <BotHud
            overview={botState.overview}
            regime={botState.regime}
            markets={botState.markets}
            computeImportance={computeImportance}
          />
        </section>

        {/* Middle Section - 2 column grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WhaleRadar markets={botState.markets} />
          <FeatureInfluence
            markets={botState.markets}
            overview={botState.overview}
            computeImportance={computeImportance}
          />
        </section>

        {/* Bottom Section - Timeline and Table (more muted) */}
        <section className="space-y-6 opacity-90">
          <TimelineStrip timeline={botState.timeline} />
          <MarketsTable markets={botState.markets} />
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 pt-4 border-t border-whale-accent/10">
          <span>Kalshi Whale Bot Dashboard</span>
          <span className="mx-2">•</span>
          <span className="text-whale-accent">v1.0.0</span>
          <span className="mx-2">•</span>
          <span>{isConnected ? 'Live Data' : 'Offline Mode'}</span>
          {botState.markets.length > 0 && (
            <>
              <span className="mx-2">•</span>
              <span>{botState.markets.length} markets</span>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

export default WhaleBotDashboard;
