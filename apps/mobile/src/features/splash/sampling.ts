import { Animated } from 'react-native';

/**
 * Bridge from the pure timeline evaluators to core Animated (P7.3).
 *
 * The master clock is one Animated.Value driving 0→1 linearly over the (possibly rescaled)
 * duration. Element styles come from SAMPLING the pure evaluators at N points and feeding the
 * pairs to `interpolate` — the native driver animates transform/opacity on the UI thread while
 * the authoritative math stays in plain, unit-tested functions. Because a CMS rescale is linear,
 * sampling in normalized clock space is duration-independent: u → evaluate(u × T_native).
 */
export const SAMPLE_COUNT = 33;

export function sampleRange(
  progress: Animated.Value,
  evaluate: (tNative: number) => number,
  nativeDurationS: number,
  samples: number = SAMPLE_COUNT,
): Animated.AnimatedInterpolation<number> {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    inputRange.push(u);
    outputRange.push(evaluate(u * nativeDurationS));
  }
  return progress.interpolate({ inputRange, outputRange });
}
