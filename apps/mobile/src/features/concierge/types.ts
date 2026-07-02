import type { components } from '@repo/api-client';

/** Concierge answer envelope + parts, typed from the OpenAPI contract (golden rule #7). */
export type ConciergeEnvelope = components['schemas']['ConciergeEnvelope'];
export type Reason = components['schemas']['ReasonOut'];
export type Signal = components['schemas']['SignalOut'];
export type Cta = components['schemas']['CtaOut'];
export type RankedOffer = components['schemas']['RankedOfferOut'];
export type ConciergeOffers = components['schemas']['ConciergeOffersOut'];
export type ConciergePlan = components['schemas']['ConciergePlanOut'];
export type ItineraryStep = components['schemas']['ItineraryStepOut'];
export type AnswerSummary = components['schemas']['AnswerSummaryOut'];
