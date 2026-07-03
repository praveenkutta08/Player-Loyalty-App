import { useEffect } from 'react';
import { Linking } from 'react-native';

import { navigateToTarget } from '../../app/navigation/navigationRef';

import { resolveDeepLink } from './deepLinks';

/**
 * OS deep-link entry points (LOW): a `casino://…` URL opened from outside the app (browser,
 * another app, quit state) is routed through the SAME resolver push uses, so the two paths can't
 * diverge. Handles both the cold-start URL (getInitialURL) and warm foreground/background opens
 * (the 'url' event). Only active once authenticated (mounted by RootNavigator).
 */
export function useDeepLinks(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const handle = (url: string | null) => {
      if (url) navigateToTarget(resolveDeepLink({ url }));
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [enabled]);
}
