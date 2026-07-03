import { Role } from '@repo/shared-types';
import { Check, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store';
import { Can } from '@/auth/Can';
import { ROLE_LABELS, roleMatrix, SCOPED_ROLES } from '@/auth/rbac';
import { DemoBanner } from '@/components/DemoBanner';
import { PageHeader } from '@/components/PageHeader';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  Select,
  StatusPill,
  Table,
  useToast,
  type Column,
} from '@/components/ui';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantScope: string[]; // tenant ids; empty = all (super-admin)
  active: boolean;
  lastLogin: string;
}

// Seeded to match the backend demo seed (app/seed.py). Admin-user CRUD endpoints are not part of
// the P1–P2 backend surface yet, so this screen manages users in local state; when the
// admin_users API lands it swaps to RTK Query hooks (GOLDEN RULE #7) with no UI change.
const INITIAL_USERS: AdminUserRow[] = [
  {
    id: 'u1',
    name: 'Sridhar K',
    email: 'super@demo-casino.com',
    role: Role.SuperAdmin,
    tenantScope: [],
    active: true,
    lastLogin: '2m ago',
  },
  {
    id: 'u2',
    name: 'Alex Morgan',
    email: 'accountmgr@demo-casino.com',
    role: Role.AccountManager,
    tenantScope: ['demo-casino', 'aurora-bay'],
    active: true,
    lastLogin: '1h ago',
  },
  {
    id: 'u3',
    name: 'Jordan Lee',
    email: 'tenantadmin@demo-casino.com',
    role: Role.TenantAdmin,
    tenantScope: ['demo-casino'],
    active: true,
    lastLogin: 'Yesterday',
  },
  {
    id: 'u4',
    name: 'Riley Chen',
    email: 'marketer@demo-casino.com',
    role: Role.MarketerEditor,
    tenantScope: ['demo-casino'],
    active: false,
    lastLogin: '3d ago',
  },
];

const ROLE_TONE: Record<Role, 'gold' | 'purple' | 'blue' | 'neutral'> = {
  [Role.SuperAdmin]: 'gold',
  [Role.AccountManager]: 'purple',
  [Role.TenantAdmin]: 'blue',
  [Role.MarketerEditor]: 'neutral',
};

export function UsersRolesScreen() {
  const { toast } = useToast();
  const tenants = useAppSelector((s) => s.session.tenants);
  const [users, setUsers] = useState<AdminUserRow[]>(INITIAL_USERS);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.SuperAdmin);
  const [inviteOpen, setInviteOpen] = useState(false);

  const roleCounts = useMemo(() => {
    const counts = {} as Record<Role, number>;
    for (const role of Object.values(Role)) counts[role] = 0;
    for (const u of users) counts[u.role] += 1;
    return counts;
  }, [users]);

  const matrix = useMemo(() => roleMatrix(selectedRole), [selectedRole]);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id;

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={u.name} />
          <div>
            <div className="font-semibold text-text">{u.name}</div>
            <div className="text-[12px] text-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <StatusPill tone={ROLE_TONE[u.role]} dot={false} tag>
          {ROLE_LABELS[u.role]}
        </StatusPill>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (u) =>
        u.tenantScope.length === 0 ? (
          <span className="text-muted">All casinos</span>
        ) : (
          <span className="text-text2">{u.tenantScope.map(tenantName).join(', ')}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <StatusPill tone={u.active ? 'green' : 'neutral'}>
          {u.active ? 'Active' : 'Disabled'}
        </StatusPill>
      ),
    },
    {
      key: 'last',
      header: 'Last login',
      render: (u) => <span className="font-mono text-[12px] text-muted">{u.lastLogin}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <Can permission="admin_users:assign" fallback={<span className="text-faint">—</span>}>
          <Select
            value={u.role}
            onChange={(e) => {
              const role = e.target.value as Role;
              setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
              toast(`${u.name} is now ${ROLE_LABELS[role]}`);
            }}
            className="w-44"
          >
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Can>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="USR"
        title="Users & Roles"
        subtitle="Manage admin users, assign roles, and review each role's permissions."
        actions={
          <Can permission="admin_users:create">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setInviteOpen(true)}
            >
              Invite user
            </Button>
          </Can>
        }
      />

      <DemoBanner>
        Preview data — the admin-users API isn’t built yet, so this list and the invite/role actions
        are local-only demo state. The <strong>Roles</strong> matrix on the right is real (from
        shared-types). Changes here are not persisted.
      </DemoBanner>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <Table columns={columns} rows={users} rowKey={(u) => u.id} />

        <Card>
          <CardHeader title="Roles" subtitle="Permissions Matrix (Appendix C)" />
          <CardBody className="pt-3">
            <div className="mb-4 space-y-1">
              {Object.values(Role).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-[13px] ${
                    selectedRole === role ? 'bg-gold-dim text-gold' : 'text-text2 hover:bg-panel2'
                  }`}
                >
                  <span className="font-semibold">{ROLE_LABELS[role]}</span>
                  <span className="font-mono text-[11px] text-muted">{roleCounts[role]}</span>
                </button>
              ))}
            </div>

            <div className="mb-2 text-label uppercase text-muted">
              {ROLE_LABELS[selectedRole]} · permissions
            </div>
            <div className="space-y-3">
              {matrix.map((grant) => (
                <div key={grant.resource}>
                  <div className="mb-1 text-[12px] font-semibold text-text">{grant.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {grant.actions.map((a) => (
                      <span
                        key={a.action}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${
                          a.granted ? 'bg-green-dim text-green' : 'bg-panel2 text-faint'
                        }`}
                      >
                        {a.granted ? <Check size={11} /> : <X size={11} />}
                        {a.action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tenants={tenants}
        onInvite={(user) => {
          setUsers((prev) => [...prev, user]);
          toast(`Invited ${user.email}`);
          setInviteOpen(false);
        }}
      />
    </div>
  );
}

function InviteUserModal({
  open,
  onClose,
  tenants,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  tenants: { id: string; name: string }[];
  onInvite: (user: AdminUserRow) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(Role.TenantAdmin);
  const [scope, setScope] = useState<string[]>([]);

  const scoped = SCOPED_ROLES.has(role);

  const reset = () => {
    setEmail('');
    setName('');
    setRole(Role.TenantAdmin);
    setScope([]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite admin user"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!email || (scoped && scope.length === 0)}
            onClick={() => {
              onInvite({
                id: `u${Math.round(performance.now())}`,
                name: name || email.split('@')[0]!,
                email,
                role,
                tenantScope: scoped ? scope : [],
                active: true,
                lastLogin: 'Never',
              });
              reset();
            }}
          >
            Send invite
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@casino.com"
          />
        </Field>
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        {scoped && (
          <div>
            <div className="mb-1.5 text-label uppercase text-muted">Assigned casinos</div>
            <div className="space-y-1.5">
              {tenants.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-[13px] text-text2">
                  <input
                    type="checkbox"
                    checked={scope.includes(t.id)}
                    onChange={(e) =>
                      setScope((prev) =>
                        e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id),
                      )
                    }
                  />
                  {t.name}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-faint">
              Scoped roles only see their assigned casinos (enforced by RLS server-side).
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
