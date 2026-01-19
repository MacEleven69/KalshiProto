/**
 * KalshiProto Dashboard Types
 */

export type MarketState = {
  ticker: string;
  title: string;
  category?: string;
  yes_bid: number;
  yes_ask: number;
  spread: number;
  volume_24h: number;
  open_interest: number;
  bid_ratio: number;
  imbalance_strength: number;
  recent_whale_count: number;
  recent_whale_max_size: number;
  signal_direction: "BUY" | "SELL" | "HOLD";
  signal_score: number;
  position_notional: number;
  pnl_unrealized: number;
};

export type WhaleEvent = {
  timestamp: string;
  ticker: string;
  side_bias: "BUY_BIAS" | "SELL_BIAS" | null;
  imbalance_strength: number;
  max_bid_size: number;
  max_ask_size: number;
};

export type RegimeState = {
  id: number;
  name: string;
};

export type BotOverview = {
  mode: "PAPER" | "LIVE";
  equity: number;
  daily_pnl: number;
  total_exposure: number;
  open_positions: number;
};

export type TimelineEvent = {
  timestamp: string;
  type: "OPEN" | "CLOSE" | "WHALE" | "REGIME_CHANGE";
  ticker?: string;
  details?: string;
};

export type BotState = {
  overview: BotOverview;
  regime: RegimeState;
  markets: MarketState[];
  whales: WhaleEvent[];
  timeline: TimelineEvent[];
};
