import { Asset, PerpetualMarket } from '@/constants/abacus';
import { STRING_KEYS } from '@/constants/localization';

export type MarketData = {
  asset: Asset;
  tickSizeDecimals: number;
} & PerpetualMarket &
  PerpetualMarket['perpetual'] &
  PerpetualMarket['configs'];

export enum MarketFilters {
  ALL = 'all',
  LAYER_1 = 'Layer 1',
  DEFI = 'Defi',
}

export const MARKET_FILTER_LABELS = {
  [MarketFilters.ALL]: STRING_KEYS.ALL,
  [MarketFilters.LAYER_1]: STRING_KEYS.LAYER_1,
  [MarketFilters.DEFI]: STRING_KEYS.DEFI,
};

export const DEFAULT_MARKETID = 'ETH-USD';

export enum FundingDirection {
  ToShort = 'ToShort',
  ToLong = 'ToLong',
  None = 'None',
}
