import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { groupsForScope } from '@/app/nav';
import { ThemeProvider } from '@/theme/ThemeProvider';

describe('navigation scope filtering', () => {
  it('shows Casino Directory only in platform scope', () => {
    const platform = groupsForScope('platform').flatMap((g) => g.items.map((i) => i.id));
    const casino = groupsForScope('casino').flatMap((g) => g.items.map((i) => i.id));
    expect(platform).toContain('CAS1');
    expect(casino).not.toContain('CAS1');
    // Shared items appear in both scopes.
    expect(platform).toContain('DSH');
    expect(casino).toContain('DSH');
  });

  it('drops empty groups after filtering', () => {
    for (const group of groupsForScope('casino')) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});

describe('ThemeProvider', () => {
  it('applies the dark theme to the document by default', () => {
    render(
      <ThemeProvider>
        <div>probe</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
