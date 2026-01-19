import { MarketState, BotOverview, RegimeState } from "../types";

interface BotHudProps {
  overview: BotOverview;
  regime: RegimeState;
  markets: MarketState[];
  computeImportance: (m: MarketState, overview: BotOverview) => number;
}

const SignalBar = ({ score }: { score: number }) => {
  // Map score 0-1 to color (red at 0, yellow at 0.5, green at 1)
  const getBarColor = (s: number) => {
    if (s >= 0.6) return "bg-whale-buy";
    if (s <= 0.4) return "bg-whale-sell";
    return "bg-whale-gold";
  };

  return (
    <div className="w-full h-2 bg-whale-darker rounded-full overflow-hidden">
      <div
        className={`h-full ${getBarColor(score)} transition-all duration-300`}
        style={{ width: `${score * 100}%` }}
      />
    </div>
  );
};

const MarketCard = ({
  market,
  importance,
  rank,
}: {
  market: MarketState;
  importance: number;
  rank: number;
}) => {
  // Scale card size and opacity based on importance
  const sizeClass = rank === 0 ? "col-span-1 lg:col-span-2" : "col-span-1";
  const opacityClass = importance > 0.5 ? "bg-opacity-100" : importance > 0.3 ? "bg-opacity-80" : "bg-opacity-60";
  
  const directionColor = {
    BUY: "text-whale-buy",
    SELL: "text-whale-sell",
    HOLD: "text-whale-hold",
  }[market.signal_direction];

  const directionBg = {
    BUY: "bg-whale-buy/20 border-whale-buy/40",
    SELL: "bg-whale-sell/20 border-whale-sell/40",
    HOLD: "bg-whale-hold/20 border-whale-hold/40",
  }[market.signal_direction];

  return (
    <div
      className={`${sizeClass} ${opacityClass} bg-whale-card border border-whale-accent/20 rounded-xl p-4 
                  hover:border-whale-accent/50 transition-all duration-200 relative overflow-hidden`}
    >
      {/* Glow effect for high importance */}
      {importance > 0.6 && (
        <div className="absolute inset-0 bg-gradient-to-br from-whale-accent/10 to-transparent pointer-events-none" />
      )}
      
      <div className="relative z-10">
        {/* Ticker and title */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-mono text-whale-accent text-sm font-bold tracking-wide">
              {market.ticker.slice(0, 20)}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[180px]">
              {market.title}
            </p>
          </div>
          
          {/* Whale badge */}
          {market.recent_whale_count > 0 && (
            <div className="flex items-center gap-1 bg-whale-gold/20 px-2 py-0.5 rounded-full">
              <span className="text-whale-gold text-xs">🐋</span>
              <span className="text-whale-gold font-mono text-xs font-bold">
                {market.recent_whale_count}
              </span>
            </div>
          )}
        </div>

        {/* Signal direction and position */}
        <div className="flex items-center justify-between mb-3">
          <span className={`${directionBg} ${directionColor} px-3 py-1 rounded-lg font-bold text-sm border`}>
            {market.signal_direction}
          </span>
          <div className="text-right">
            <span className="text-gray-500 text-xs">Position</span>
            <p className="font-mono text-white font-bold">
              ${market.position_notional.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Signal score bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Signal Score</span>
            <span className="font-mono">{(market.signal_score * 100).toFixed(1)}%</span>
          </div>
          <SignalBar score={market.signal_score} />
        </div>

        {/* P&L indicator */}
        {market.pnl_unrealized !== 0 && (
          <div className={`mt-2 text-xs font-mono ${market.pnl_unrealized >= 0 ? 'text-whale-buy' : 'text-whale-sell'}`}>
            {market.pnl_unrealized >= 0 ? '+' : ''}${market.pnl_unrealized.toFixed(2)} unrealized
          </div>
        )}
      </div>
    </div>
  );
};

export function BotHud({ overview, regime, markets, computeImportance }: BotHudProps) {
  // Compute importance for all markets and get top 3
  const marketsWithImportance = markets
    .map((m) => ({ market: m, importance: computeImportance(m, overview) }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);

  const regimeColors: Record<string, string> = {
    calm: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    trending: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    chaotic: "bg-red-500/20 text-red-400 border-red-500/40",
  };

  const regimeColor = regimeColors[regime.name] || regimeColors.calm;

  return (
    <div className="bg-gradient-to-br from-whale-darker via-whale-dark to-whale-darker rounded-2xl p-6 border border-whale-accent/20">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-whale-accent/10">
        {/* Mode badge */}
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg tracking-wider border
            ${overview.mode === "LIVE" 
              ? "bg-whale-buy/20 text-whale-buy border-whale-buy/40" 
              : "bg-whale-accent/20 text-whale-accent border-whale-accent/40"}`}
          >
            {overview.mode} MODE
          </div>
          
          {/* Regime indicator */}
          <div className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${regimeColor}`}>
            {regime.name.toUpperCase()}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Equity</span>
            <p className="font-display text-2xl font-bold text-white">
              ${overview.equity.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Daily P&L</span>
            <p className={`font-display text-2xl font-bold ${overview.daily_pnl >= 0 ? 'text-whale-buy' : 'text-whale-sell'}`}>
              {overview.daily_pnl >= 0 ? '+' : ''}${overview.daily_pnl.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Exposure</span>
            <p className="font-display text-2xl font-bold text-whale-gold">
              ${overview.total_exposure.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Positions</span>
            <p className="font-display text-2xl font-bold text-white">
              {overview.open_positions}
            </p>
          </div>
        </div>
      </div>

      {/* Top Markets Cards */}
      <div>
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-3 font-semibold">
          Top Markets by Importance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketsWithImportance.map(({ market, importance }, idx) => (
            <MarketCard
              key={market.ticker}
              market={market}
              importance={importance}
              rank={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default BotHud;
