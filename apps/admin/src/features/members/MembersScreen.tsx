import { Download, Eye, EyeOff, Search } from 'lucide-react';
import { useState } from 'react';

import { MEMBERS, mask, maskEmail, type Member } from './demoMembers';

import { useHasPermission } from '@/auth/useAuth';
import { DemoBanner } from '@/components/DemoBanner';
import { PageHeader } from '@/components/PageHeader';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  Select,
  StatusPill,
  Table,
  useToast,
  type Column,
  type Tone,
} from '@/components/ui';

const STATUS_TONE: Record<string, Tone> = {
  active: 'green',
  suspended: 'gold',
  self_excluded: 'red',
};
const KYC_TONE: Record<string, Tone> = { verified: 'green', pending: 'gold', rejected: 'red' };

export function MembersScreen() {
  const { toast } = useToast();
  // Wallet/transaction detail + unmask/export are limited to elevated roles (finance/admin/support),
  // which in the matrix are the wallet:read holders. Marketers lack players:read (route-gated).
  const elevated = useHasPermission('wallet:read');

  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [selected, setSelected] = useState<Member | null>(null);

  const rows = MEMBERS.filter(
    (m) =>
      (tier === 'all' || m.tier === tier) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase())),
  );

  const columns: Column<Member>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} />
          <div>
            <div className="font-semibold text-text">{m.name}</div>
            <div className="font-mono text-[11px] text-muted">{maskEmail(m.email)}</div>
          </div>
        </div>
      ),
    },
    { key: 'tier', header: 'Tier', render: (m) => <span className="text-text2">{m.tier}</span> },
    {
      key: 'kyc',
      header: 'KYC',
      render: (m) => <StatusPill tone={KYC_TONE[m.kyc] ?? 'neutral'}>{m.kyc}</StatusPill>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => (
        <StatusPill tone={STATUS_TONE[m.status] ?? 'neutral'}>
          {m.status.replace('_', ' ')}
        </StatusPill>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      render: (m) => <span className="font-mono text-text2">{m.points.toLocaleString()}</span>,
    },
  ];

  return (
    <div>
      <PageHeader kicker="MBR" title="Members" subtitle="Player 360 — PII masked by default." />

      <DemoBanner>
        Preview data — there is no admin player-list API yet, so these records are static demo data.
        Unmask/export are local-only and do <strong>not</strong> write to the audit log.
      </DemoBanner>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <div className="w-40">
          <Select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">All tiers</option>
            {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>

      <Table columns={columns} rows={rows} rowKey={(m) => m.id} onRowClick={setSelected} />

      <MemberProfile
        member={selected}
        elevated={elevated}
        onClose={() => setSelected(null)}
        onAudit={(action, m) => toast(`${action} for ${m.name} (demo — not persisted)`)}
      />
    </div>
  );
}

function MemberProfile({
  member,
  elevated,
  onClose,
  onAudit,
}: {
  member: Member | null;
  elevated: boolean;
  onClose: () => void;
  onAudit: (action: string, m: Member) => void;
}) {
  const [unmasked, setUnmasked] = useState(false);

  if (!member) return null;

  const toggleUnmask = () => {
    if (!unmasked) onAudit('PII unmask', member); // elevated + audited
    setUnmasked((u) => !u);
  };

  const pii = (raw: string, masked: string) => (unmasked && elevated ? raw : masked);

  return (
    <Modal
      open={!!member}
      onClose={() => {
        setUnmasked(false);
        onClose();
      }}
      title={member.name}
      width="max-w-2xl"
      footer={
        elevated ? (
          <>
            <Button
              icon={unmasked ? <EyeOff size={15} /> : <Eye size={15} />}
              onClick={toggleUnmask}
            >
              {unmasked ? 'Mask PII' : 'Unmask PII'}
            </Button>
            <Button
              variant="primary"
              icon={<Download size={15} />}
              onClick={() => onAudit('PII export', member)}
            >
              Export
            </Button>
          </>
        ) : (
          <span className="text-[12px] text-faint">
            Elevated role required to unmask or export.
          </span>
        )
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="space-y-2 pt-3 text-[13px]">
            <Row label="Email" value={pii(member.email, maskEmail(member.email))} />
            <Row label="Date of birth" value={pii(member.dob, mask(member.dob))} />
            <Row label="Gov ID" value={pii(member.govId, mask(member.govId))} />
            <Row label="Segment" value={member.segment} />
            <Row label="Location consent" value={member.locationConsent ? 'Granted' : 'Denied'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Loyalty" />
          <CardBody className="space-y-2 pt-3 text-[13px]">
            <Row label="Tier" value={member.tier} />
            <Row label="Points" value={member.points.toLocaleString()} />
            <Row label="KYC" value={member.kyc} />
            <Row label="Status" value={member.status.replace('_', ' ')} />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Wallet & Transactions" subtitle="Limited to finance/admin/support" />
          <CardBody className="pt-3 text-[13px]">
            {elevated ? (
              <>
                <Row label="Balance" value={`$${(member.walletCents / 100).toLocaleString()}`} />
                <div className="mt-2 text-[12px] text-muted">
                  Full ledger loads from the wallet API (append-only). Recent: fund, cashout,
                  transfer.
                </div>
              </>
            ) : (
              <p className="text-[12px] text-faint">
                You do not have wallet:read; transaction detail is hidden.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-soft py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
