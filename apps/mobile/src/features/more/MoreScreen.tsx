import React from 'react';

import { ThemeSettingsScreen } from '../settings/ThemeSettingsScreen';

/**
 * More tab (M1). Full menu (support chat, legal, about) lands in P4.14; for now it surfaces the
 * appearance + manifest screen (M4) so theming and feature flags are demoable.
 */
export function MoreScreen(): React.JSX.Element {
  return <ThemeSettingsScreen />;
}
