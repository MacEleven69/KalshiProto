/**
 * Whale Bot Legacy Components
 * Ported from the original Kalshi Whale Bot dashboard
 */

export { default as BotHud } from './BotHud';
export { default as WhaleRadar } from './WhaleRadar';
export { default as FeatureInfluence } from './FeatureInfluence';
export { default as TimelineStrip } from './TimelineStrip';
export { default as MarketsTable } from './MarketsTable';

// Re-export types for convenience
export type {
  MarketState,
  WhaleEvent,
  RegimeState,
  BotOverview,
  TimelineEvent,
  BotState,
} from '../types';
