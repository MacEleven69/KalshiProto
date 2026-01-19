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

const FeatureBar = ({ 
  label, 
  value, 
  normalizedValue, 
  format = (v) => v.toFixed(2),
  colorClass = "bg-whale-accent"
}: FeatureBarProps) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{format(value)}</span>
      </div>
      <div className="h-2 bg-whale-darker rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(normalizedValue * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

export function FeatureInfluence({ markets, overview, computeImportance }: FeatureInfluenceProps) {
  // Find most important market
  const marketWithImportance = markets
    .map((m) => ({ market: m, importance: computeImportance(m, overview) }))
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

  // Compute min/max for normalization across all markets
  const normalize = (key: keyof MarketState, value: number): number => {
    const values = markets.map((m) => m[key] as number).filter((v) => typeof v === "number");
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  };

  const features = [
    {
      label: "Imbalance Strength",
      value: market.imbalance_strength,
      normalized: normalize("imbalance_strength", market.imbalance_strength),
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: market.imbalance_strength > 0.2 ? "bg-whale-gold" : "bg-whale-accent",
    },
    {
      label: "Bid Ratio",
      value: market.bid_ratio,
      normalized: market.bid_ratio, // Already 0-1
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: market.bid_ratio > 0.55 ? "bg-whale-buy" : market.bid_ratio < 0.45 ? "bg-whale-sell" : "bg-whale-accent",
    },
    {
      label: "Max Whale Size",
      value: market.recent_whale_max_size,
      normalized: normalize("recent_whale_max_size", market.recent_whale_max_size),
      format: (v: number) => v.toLocaleString(),
      color: market.recent_whale_max_size > 5000 ? "bg-whale-gold" : "bg-whale-accent",
    },
    {
      label: "Volume 24h",
      value: market.volume_24h,
      normalized: normalize("volume_24h", market.volume_24h),
      format: (v: number) => v.toLocaleString(),
      color: "bg-cyan-500",
    },
    {
      label: "Open Interest",
      value: market.open_interest,
      normalized: normalize("open_interest", market.open_interest),
      format: (v: number) => v.toLocaleString(),
      color: "bg-purple-500",
    },
  ];

  const directionColor = {
    BUY: "text-whale-buy",
    SELL: "text-whale-sell",
    HOLD: "text-whale-hold",
  }[market.signal_direction];

  return (
    <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-whale-accent/10">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Feature Influence
        </h2>
        <span className={`font-bold ${directionColor}`}>
          {market.signal_direction}
        </span>
      </div>

      {/* Market info */}
      <div className="mb-4 p-3 bg-whale-darker rounded-lg">
        <div className="font-mono text-whale-accent text-sm font-bold">
          {market.ticker.slice(0, 25)}
        </div>
        <div className="text-gray-400 text-xs mt-1 truncate">
          {market.title}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="text-xs">
            <span className="text-gray-500">Score: </span>
            <span className="font-mono text-white">{(market.signal_score * 100).toFixed(1)}%</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Position: </span>
            <span className="font-mono text-whale-gold">${market.position_notional}</span>
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
        {market.imbalance_strength > 0.15 
          ? "Strong order book imbalance"
          : market.recent_whale_count > 0
            ? "Recent whale activity"
            : "Volume and interest levels"}
      </div>
    </div>
  );
}

export default FeatureInfluence;
