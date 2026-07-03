import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Permission, Role, ROLE_PERMISSIONS } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

// The canonical matrix is generated from the backend Python matrix (app/rbac/matrix.py) and
// committed at packages/shared-types/rbac-matrix.json; the backend pytest suite asserts Python
// matches it, and this test asserts the TS mirror matches it too — so the two enforcement
// vocabularies (M8) can never silently drift. Read at runtime (not a JSON import) so it needs
// no resolveJsonModule / rootDir gymnastics.
const here = dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(
  readFileSync(resolve(here, '../../../packages/shared-types/rbac-matrix.json'), 'utf-8'),
) as { permissions: string[]; roles: Record<string, string[]> };

describe('RBAC matrix parity (M8): shared-types/rbac.ts vs canonical JSON', () => {
  it('has the exact same permission set, order included', () => {
    expect(Object.values(Permission)).toEqual(canonical.permissions);
  });

  it('has the exact same roles', () => {
    expect(Object.values(Role).sort()).toEqual(Object.keys(canonical.roles).sort());
  });

  it('grants each role exactly the canonical permissions', () => {
    for (const role of Object.values(Role)) {
      const actual = ROLE_PERMISSIONS[role].map((p) => p as string);
      const expected = canonical.roles[role];
      expect(expected, `role ${role} missing from canonical JSON`).toBeDefined();
      // Compare as sets — declaration order per role is not contractual, membership is.
      expect([...actual].sort()).toEqual([...(expected ?? [])].sort());
    }
  });
});
