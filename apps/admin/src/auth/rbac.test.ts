import { Permission, Role, ROLE_PERMISSIONS } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

import { roleMatrix, SCOPED_ROLES } from './rbac';

describe('RBAC matrix (mirror of Appendix C)', () => {
  it('grants super-admin the unrestricted tenant permissions', () => {
    const perms = ROLE_PERMISSIONS[Role.SuperAdmin];
    expect(perms).toContain(Permission.TenantsCreate);
    expect(perms).toContain(Permission.AdminUsersAssign);
  });

  it('withholds tenant + player permissions from marketer/editor', () => {
    const perms = ROLE_PERMISSIONS[Role.MarketerEditor];
    expect(perms).not.toContain(Permission.TenantsRead);
    expect(perms).not.toContain(Permission.PlayersRead);
    // ...but they can publish content and promotions.
    expect(perms).toContain(Permission.ContentPublish);
    expect(perms).toContain(Permission.PromotionsPublish);
  });

  it('marks granted actions per resource in the checklist', () => {
    const matrix = roleMatrix(Role.MarketerEditor);
    const content = matrix.find((m) => m.resource === 'content');
    const publish = content?.actions.find((a) => a.action === 'publish');
    const del = content?.actions.find((a) => a.action === 'delete');
    expect(publish?.granted).toBe(true);
    expect(del?.granted).toBe(false);
  });

  it('treats every non super-admin role as tenant-scoped', () => {
    expect(SCOPED_ROLES.has(Role.SuperAdmin)).toBe(false);
    expect(SCOPED_ROLES.has(Role.TenantAdmin)).toBe(true);
    expect(SCOPED_ROLES.has(Role.MarketerEditor)).toBe(true);
  });
});
