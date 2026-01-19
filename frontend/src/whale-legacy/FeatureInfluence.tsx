import { MarketState, BotOverview } from "../types";

interface FeatureInfluenceProps {
  markets: MarketState[];
  overview: BotOverview;
  computeImportance: (m: MarketState, overview: BotOverview) => number;
}

interface FeatureBarProps {
  label: string;
  value: number;
  normalizedValue: number; // 0-1
  format?: (v: number) => string;
  colorClass?: string;
}

// =============================================================================
// HELPER: Safe number extraction (handles undefined/null/NaN)
// =============================================================================

function safeNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

// =============================================================================
// FEATURE BAR COMPONENT
// =============================================================================

const FeatureBar = ({ 
  label, 
  value, 
  normalizedValue, 
  format = (v) => safeNum(v).toFixed(2),
  colorClass = "bg-whale-accent"
}: FeatureBarProps) => {
  const safeValue = safeNum(value);
  const safeNormalized = safeNum(normalizedValue, 0.5);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{format(safeValue)}</span>
      </div>
      <div className="h-2 bg-whale-darker rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(safeNormalized * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// FEATURE INFLUENCE COMPONENT
// =============================================================================

export function FeatureInfluence({ markets, overview, computeImportance }: FeatureInfluenceProps) {
  // Ensure markets is an array
  const safeMarkets = Array.isArray(markets) ? markets : [];
  
  // Find most important market
  const marketWithImportance = safeMarkets
    .map((m) => ({ market: m, importance: safeNum(computeImportance(m, overview)) }))
    .sort((a, b) => b.importance - a.importance)[0];

  if (!marketWithImportance) {
    return (
      <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
        <h2 className="font-display text-lg font-bold text-white mb-4">Feature Influence</h2>
        <div className="text-center py-8 text-gray-500">
          <span className="text-3xl mb-2 block">📊</span>
          <span>No markets to analyze</span>
        </div>
      </div>
    );
  }

  const { market } = marketWithImportance;

  // Safe extraction of market fields
  const imbalanceStrength = safeNum(market.imbalance_strength);
  const bidRatio = safeNum(market.bid_ratio, 0.5);
  const recentWhaleMaxSize = safeNum(market.recent_whale_max_size);
  const volume24h = safeNum(market.volume_24h);
  const openInterest = safeNum(market.open_interest);
  const signalScore = safeNum(market.signal_score, 0.5);
  const positionNotional = safeNum(market.position_notional);
  const recentWhaleCount = safeNum(market.recent_whale_count);
  const signalDirection = market.signal_direction || "HOLD";
  const ticker = market.ticker || "UNKNOWN";
  const title = market.title || "—";

  // Compute min/max for normalization across all markets (with safe handling)
  const normalize = (key: keyof MarketState, value: number): number => {
    const values = safeMarkets
      .map((m) => m[key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    
    if (values.length === 0) return 0.5;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 0.5;
    
    const safeValue = safeNum(value);
    return (safeValue - min) / (max - min);
  };

  // Safe format functions that handle undefined/NaN
  const formatPercent = (v: number) => `${(safeNum(v) * 100).toFixed(1)}%`;
  const formatNumber = (v: number) => safeNum(v).toLocaleString();

  const features = [
    {
      label: "Imbalance Strength",
      value: imbalanceStrength,
      normalized: normalize("imbalance_strength", imbalanceStrength),
      format: formatPercent,
      color: imbalanceStrength > 0.2 ? "bg-whale-gold" : "bg-whale-accent",
    },
    {
      label: "Bid Ratio",
      value: bidRatio,
      normalized: bidRatio, // Already 0-1
      format: formatPercent,
      color: bidRatio > 0.55 ? "bg-whale-buy" : bidRatio < 0.45 ? "bg-whale-sell" : "bg-whale-accent",
    },
    {
      label: "Max Whale Size",
      value: recentWhaleMaxSize,
      normalized: normalize("recent_whale_max_size", recentWhaleMaxSize),
      format: formatNumber,
      color: recentWhaleMaxSize > 5000 ? "bg-whale-gold" : "bg-whale-accent",
    },
    {
      label: "Volume 24h",
      value: volume24h,
      normalized: normalize("volume_24h", volume24h),
      format: formatNumber,
      color: "bg-cyan-500",
    },
    {
      label: "Open Interest",
      value: openInterest,
      normalized: normalize("open_interest", openInterest),
      format: formatNumber,
      color: "bg-purple-500",
    },
  ];

  const directionColor = {
    BUY: "text-whale-buy",
    SELL: "text-whale-sell",
    HOLD: "text-whale-hold",
  }[signalDirection] || "text-whale-hold";

  return (
    <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-whale-accent/10">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Feature Influence
        </h2>
        <span className={`font-bold ${directionColor}`}>
          {signalDirection}
        </span>
      </div>

      {/* Market info */}
      <div className="mb-4 p-3 bg-whale-darker rounded-lg">
        <div className="font-mono text-whale-accent text-sm font-bold">
          {ticker.slice(0, 25)}
        </div>
        <div className="text-gray-400 text-xs mt-1 truncate">
          {title}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="text-xs">
            <span className="text-gray-500">Score: </span>
            <span className="font-mono text-white">{(signalScore * 100).toFixed(1)}%</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Position: </span>
            <span className="font-mono text-whale-gold">${positionNotional.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Feature bars */}
      <div className="space-y-3">
        {features.map((f) => (
          <FeatureBar
            key={f.label}
            label={f.label}
            value={f.value}
            normalizedValue={f.normalized}
            format={f.format}
            colorClass={f.color}
          />
        ))}
      </div>

      {/* Interpretation hint */}
      <div className="mt-4 pt-3 border-t border-whale-accent/10 text-xs text-gray-500">
        <span className="font-semibold text-gray-400">Key Driver: </span>
        {imbalanceStrength > 0.15 
          ? "Strong order book imbalance"
          : recentWhaleCount > 0
            ? "Recent whale activity"
            : "Volume and interest levels"}
      </div>
    </div>
  );
}

export default FeatureInfluence;
