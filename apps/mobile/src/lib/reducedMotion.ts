import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * OS reduced-motion preference. Decorative animation (orb drift, hero stagger, splash timelines)
 * must check this and render the final frame instead — one shared code path everywhere.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
