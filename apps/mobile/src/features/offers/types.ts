import type { OfferOut } from './offersApi';

/** Offers tab stack: segmented list → offer/promotion detail → redemption confirmation. */
export type OffersStackParamList = {
  OffersHome: { tab?: 'offers' | 'promotions' | 'rewards' } | undefined;
  OfferDetail: { offer: OfferOut };
  PromotionDetail: { promotion: OfferOut };
  RedemptionConfirmation: { title: string; code: string };
};
