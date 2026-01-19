import { useState, useEffect, FormEvent } from "react";
import { WhaleBotDashboard } from "./WhaleBotDashboard";

// =============================================================================
// API Configuration
// =============================================================================

const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || "";

// =============================================================================
// Password Gate Component
// =============================================================================

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (password === DASHBOARD_PASSWORD) {
      // Store auth in session storage (clears on tab close)
      sessionStorage.setItem("kalshi_auth", "true");
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-whale-darker flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-whale-darker via-whale-dark to-whale-darker pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-whale-accent/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Login Card */}
      <div 
        className={`relative z-10 bg-whale-card border border-whale-accent/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐋</div>
          <h1 className="font-display text-2xl font-bold text-white">Kalshi Whale Bot</h1>
          <p className="text-gray-500 text-sm mt-1">Trading Dashboard</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
              Dashboard Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter password"
              className={`w-full bg-whale-darker border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-whale-accent/50 transition-all ${
                error ? "border-whale-sell" : "border-whale-accent/30"
              }`}
              autoFocus
            />
            {error && (
              <p className="text-whale-sell text-xs mt-2">Incorrect password</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-whale-accent/20 hover:bg-whale-accent/30 border border-whale-accent/50 text-whale-accent font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-whale-accent/20"
          >
            Access Dashboard
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-600 mt-6">
          Protected access only
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main App
// =============================================================================

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    // If no password is configured, allow access
    if (!DASHBOARD_PASSWORD) {
      setAuthenticated(true);
      return;
    }
    
    // Check session storage for existing auth
    const authStatus = sessionStorage.getItem("kalshi_auth");
    if (authStatus === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("kalshi_auth");
    setAuthenticated(false);
  };

  // If no password set, show dashboard directly
  if (!DASHBOARD_PASSWORD) {
    return <WhaleBotDashboard onLogout={() => {}} />;
  }

  // Show password gate or dashboard based on auth status
  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />;
  }

  return <WhaleBotDashboard onLogout={handleLogout} />;
}

export default App;
