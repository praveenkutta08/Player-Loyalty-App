import type { OfferOut } from './offersApi';
import type { RewardItemOut } from '../rewards/rewardsApi';

/** Offers tab stack: segmented list → offer/promotion detail → redemption confirmation, plus the
 * rewards marketplace + reward detail reached from the "My Rewards" segment (P4.12). */
export type OffersStackParamList = {
  OffersHome: { tab?: 'foryou' | 'offers' | 'promotions' | 'rewards' } | undefined;
  OfferDetail: { offer: OfferOut };
  PromotionDetail: { promotion: OfferOut };
  RedemptionConfirmation: { title: string; code: string };
  RewardsMarketplace: undefined;
  RewardDetail: { item: RewardItemOut };
};
