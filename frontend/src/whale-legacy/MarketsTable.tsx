import { MarketState } from "../types";

interface MarketsTableProps {
  markets: MarketState[];
}

export function MarketsTable({ markets }: MarketsTableProps) {
  const directionStyle = {
    BUY: "text-whale-buy bg-whale-buy/10",
    SELL: "text-whale-sell bg-whale-sell/10",
    HOLD: "text-whale-hold bg-whale-hold/10",
  };

  return (
    <div className="bg-whale-card rounded-xl border border-whale-accent/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-whale-accent/10 bg-whale-darker/50">
        <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
          <span>📋</span>
          All Markets
          <span className="text-gray-500 font-normal">({markets.length})</span>
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-whale-darker/30">
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Bid
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Ask
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Spread
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Vol 24h
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                OI
              </th>
              <th className="px-4 py-2 text-center text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Signal
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Whales
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-whale-accent/5">
            {markets.map((market) => (
              <tr 
                key={market.ticker}
                className="hover:bg-whale-darker/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-whale-accent text-xs">
                    {market.ticker.slice(0, 20)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-300 truncate block max-w-[200px]">
                    {market.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-whale-buy text-xs">
                    {market.yes_bid}¢
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-whale-sell text-xs">
                    {market.yes_ask}¢
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-gray-400 text-xs">
                    {market.spread}¢
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-gray-300 text-xs">
                    {market.volume_24h.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-gray-300 text-xs">
                    {market.open_interest.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${directionStyle[market.signal_direction]}`}>
                    {market.signal_direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-whale-darker rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          market.signal_score >= 0.6 
                            ? "bg-whale-buy" 
                            : market.signal_score <= 0.4 
                              ? "bg-whale-sell" 
                              : "bg-whale-gold"
                        }`}
                        style={{ width: `${market.signal_score * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-gray-400 w-10">
                      {(market.signal_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {market.recent_whale_count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-whale-gold text-xs">
                      <span>🐋</span>
                      <span className="font-mono">{market.recent_whale_count}</span>
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {markets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-3xl mb-2 block">📭</span>
          <span>No markets available</span>
        </div>
      )}
    </div>
  );
}

export default MarketsTable;
