import { MarketState } from "../types";

interface WhaleRadarProps {
  markets: MarketState[];
}

function computeWhaleScore(m: MarketState): number {
  return m.recent_whale_count + m.recent_whale_max_size / 10000;
}

const WhaleRow = ({ market, score, maxScore }: { market: MarketState; score: number; maxScore: number }) => {
  const intensity = maxScore > 0 ? score / maxScore : 0;
  
  // Color based on intensity
  const barColor = intensity > 0.7 
    ? "bg-gradient-to-r from-whale-gold to-orange-500" 
    : intensity > 0.4 
      ? "bg-gradient-to-r from-whale-accent to-cyan-400"
      : "bg-gradient-to-r from-gray-600 to-gray-500";

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-whale-card/50 transition-colors group">
      {/* Ticker */}
      <div className="w-32 flex-shrink-0">
        <span className="font-mono text-sm text-whale-accent group-hover:text-white transition-colors truncate block">
          {market.ticker.slice(0, 15)}
        </span>
      </div>
      
      {/* Score */}
      <div className="w-16 flex-shrink-0">
        <span className="font-mono text-xs text-gray-400">
          {score.toFixed(2)}
        </span>
      </div>
      
      {/* Intensity bar */}
      <div className="flex-1 h-3 bg-whale-darker rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${intensity * 100}%` }}
        />
      </div>
      
      {/* Whale indicators */}
      <div className="w-20 flex-shrink-0 text-right">
        {market.recent_whale_count > 0 && (
          <span className="inline-flex items-center gap-1 text-whale-gold text-xs">
            <span>🐋</span>
            <span className="font-mono">{market.recent_whale_count}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export function WhaleRadar({ markets }: WhaleRadarProps) {
  // Compute whale scores and sort
  const scored = markets
    .map((m) => ({ market: m, score: computeWhaleScore(m) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const maxScore = Math.max(...scored.map((s) => s.score), 1);

  return (
    <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-whale-accent/10">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🐋</span>
          Whale Radar
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          Top {scored.length} markets
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-whale-gold to-orange-500" />
          <span>High Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-whale-accent to-cyan-400" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-600 to-gray-500" />
          <span>Low</span>
        </div>
      </div>

      {/* Whale list */}
      <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
        {scored.length > 0 ? (
          scored.map(({ market, score }) => (
            <WhaleRow
              key={market.ticker}
              market={market}
              score={score}
              maxScore={maxScore}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-3xl mb-2 block">🌊</span>
            <span>No whale activity detected</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhaleRadar;
