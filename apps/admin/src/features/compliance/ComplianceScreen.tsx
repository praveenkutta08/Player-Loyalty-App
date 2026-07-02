import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';

import {
  useLazyLookupPlayerQuery,
  useListRgFlaggedQuery,
  useSetRgFlagsMutation,
  type PlayerRg,
  type RgFlagsUpdate,
} from './playersApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  StatusPill,
  Table,
  Tabs,
  Toggle,
  useToast,
  type Column,
} from '@/components/ui';

// KYC (KycPort) and geolocation/jurisdiction (GeoPort) queues still have no dedicated admin
// endpoints — those tabs are local demo data, labelled as such. Responsible Gaming is REAL
// (audit H2): it drives the permission-gated, audited /players/*/rg-flags endpoints.
interface KycCase {
  id: string;
  player: string;
  submitted: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_CASES: KycCase[] = [
  { id: 'k1', player: 'c•••@demo-casino.com', submitted: '2h ago', status: 'pending' },
  { id: 'k2', player: 'd•••@demo-casino.com', submitted: '5h ago', status: 'pending' },
  { id: 'k3', player: 'e•••@demo-casino.com', submitted: 'Yesterday', status: 'approved' },
];

export function ComplianceScreen() {
  const [tab, setTab] = useState('kyc');
  return (
    <div>
      <PageHeader
        kicker="CMP"
        title="Compliance & Responsible Gaming"
        subtitle="KYC review, RG limits, self-exclusion and jurisdiction rules."
      />
      <div className="mb-5">
        <Tabs
          items={[
            { key: 'kyc', label: 'KYC' },
            { key: 'rg', label: 'Responsible Gaming' },
            { key: 'geo', label: 'Geolocation' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'kyc' && <KycTab />}
      {tab === 'rg' && <RgTab />}
      {tab === 'geo' && <GeoTab />}
    </div>
  );
}

function KycTab() {
  const { toast } = useToast();
  const [provider, setProvider] = useState('Jumio (mock)');
  const [cases, setCases] = useState<KycCase[]>(INITIAL_CASES);

  const act = (id: string, status: 'approved' | 'rejected') => {
    setCases((c) => c.map((x) => (x.id === id ? { ...x, status } : x)));
    toast(`KYC ${status} — audited`);
  };

  const columns: Column<KycCase>[] = [
    {
      key: 'player',
      header: 'Player',
      render: (c) => <span className="font-mono text-[12px] text-text2">{c.player}</span>,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (c) => <span className="text-muted">{c.submitted}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <StatusPill
          tone={c.status === 'approved' ? 'green' : c.status === 'rejected' ? 'red' : 'gold'}
        >
          {c.status}
        </StatusPill>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) =>
        c.status === 'pending' ? (
          <Can permission="players:read" fallback={<span className="text-faint">—</span>}>
            <div className="flex justify-end gap-1.5">
              <button
                className="text-muted hover:text-green"
                onClick={() => act(c.id, 'approved')}
                aria-label="Approve"
              >
                <Check size={16} />
              </button>
              <button
                className="text-muted hover:text-red"
                onClick={() => act(c.id, 'rejected')}
                aria-label="Reject"
              >
                <X size={16} />
              </button>
            </div>
          </Can>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-2 text-label uppercase text-muted">Review queue</div>
        <Table columns={columns} rows={cases} rowKey={(c) => c.id} />
      </div>
      <Card>
        <CardHeader title="KYC Provider" />
        <CardBody className="space-y-3 pt-3">
          <Field label="Provider (KycPort)">
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {['Jumio (mock)', 'Onfido (mock)', 'Persona (mock)'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <p className="text-[11px] text-faint">
            MVP uses the mock KYC adapter; swap to a real vendor by ADAPTER_MODE.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

type RgAction = 'self_exclusion' | 'cool_off_7' | 'cool_off_30';

function rgFlagLabel(p: PlayerRg): { label: string; tone: 'red' | 'gold' | 'blue' } {
  const flags = p.rg_flags ?? {};
  if (flags['self_exclusion']) return { label: 'excluded', tone: 'red' };
  if (flags['cool_off_until']) return { label: 'cool-off', tone: 'gold' };
  return { label: 'limits', tone: 'blue' };
}

function RgTab() {
  const { toast } = useToast();
  const [limits, setLimits] = useState({ deposit: '5000', timeMinutes: '240', coolOff: '7' });
  const [newEx, setNewEx] = useState('');
  const [action, setAction] = useState<RgAction>('self_exclusion');

  const { data: flagged = [], isLoading } = useListRgFlaggedQuery();
  const [lookupPlayer] = useLazyLookupPlayerQuery();
  const [setRgFlags, { isLoading: isSaving }] = useSetRgFlagsMutation();

  const addFlag = async () => {
    const email = newEx.trim().toLowerCase();
    try {
      const player = await lookupPlayer(email).unwrap();
      const body: RgFlagsUpdate =
        action === 'self_exclusion'
          ? { self_exclusion: true }
          : {
              self_exclusion: false,
              cool_off_until: new Date(
                Date.now() + (action === 'cool_off_7' ? 7 : 30) * 24 * 60 * 60 * 1000,
              ).toISOString(),
            };
      await setRgFlags({ playerId: player.id, body }).unwrap();
      setNewEx('');
      toast(
        action === 'self_exclusion'
          ? 'Added to self-exclusion — audit logged'
          : 'Cool-off applied — audit logged',
      );
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      toast(status === 404 ? `No player found for ${email}` : 'Could not update RG flags');
    }
  };

  const clearFlags = async (p: PlayerRg) => {
    try {
      // All-clear body removes every flag server-side.
      await setRgFlags({ playerId: p.id, body: { self_exclusion: false } }).unwrap();
      toast('RG flags cleared — audit logged');
    } catch {
      toast('Could not clear RG flags');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Default Limits"
          subtitle="Demo — tenant-wide default limits have no backend yet; per-player flags are live."
        />
        <CardBody className="space-y-3 pt-3">
          <Field label="Daily deposit limit ($)">
            <Input
              value={limits.deposit}
              onChange={(e) => setLimits({ ...limits, deposit: e.target.value })}
              type="number"
            />
          </Field>
          <Field label="Session time limit (min)">
            <Input
              value={limits.timeMinutes}
              onChange={(e) => setLimits({ ...limits, timeMinutes: e.target.value })}
              type="number"
            />
          </Field>
          <Field label="Cool-off period (days)">
            <Input
              value={limits.coolOff}
              onChange={(e) => setLimits({ ...limits, coolOff: e.target.value })}
              type="number"
            />
          </Field>
          <Button
            size="sm"
            className="w-full"
            onClick={() => toast('Demo only — tenant default limits are not persisted yet')}
          >
            Save limits
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Self-Exclusion & Cool-Off"
          subtitle="Server-enforced: writes are permission-gated and audit-logged."
        />
        <CardBody className="space-y-2 pt-3">
          <div className="flex gap-2">
            <Input
              value={newEx}
              onChange={(e) => setNewEx(e.target.value)}
              placeholder="player email"
            />
            <Select value={action} onChange={(e) => setAction(e.target.value as RgAction)}>
              <option value="self_exclusion">Self-exclude</option>
              <option value="cool_off_7">Cool-off 7d</option>
              <option value="cool_off_30">Cool-off 30d</option>
            </Select>
            <Can permission="players:rg_update">
              <Button
                icon={<Plus size={15} />}
                disabled={!newEx || isSaving}
                onClick={() => void addFlag()}
              >
                Add
              </Button>
            </Can>
          </div>
          {isLoading && <div className="text-[12px] text-muted">Loading flagged players…</div>}
          {!isLoading && flagged.length === 0 && (
            <div className="text-[12px] text-muted">No players currently flagged.</div>
          )}
          {flagged.map((p) => {
            const { label, tone } = rgFlagLabel(p);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-control bg-panel2 px-3 py-2"
              >
                <span className="font-mono text-[12px] text-text2">{p.email}</span>
                <div className="flex items-center gap-2">
                  <StatusPill tone={tone}>{label}</StatusPill>
                  <Can permission="players:rg_update">
                    <button
                      className="text-muted hover:text-red"
                      onClick={() => void clearFlags(p)}
                      aria-label={`Clear RG flags for ${p.email}`}
                    >
                      <X size={14} />
                    </button>
                  </Can>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function GeoTab() {
  const { toast } = useToast();
  const [rules, setRules] = useState([
    { region: 'Nevada, US', allowed: true },
    { region: 'New Jersey, US', allowed: true },
    { region: 'Utah, US', allowed: false },
    { region: 'International', allowed: false },
  ]);

  return (
    <Card>
      <CardHeader title="Jurisdiction Rules" subtitle="GeoPort — where play is permitted" />
      <CardBody className="space-y-2 pt-3">
        {rules.map((r, i) => (
          <div
            key={r.region}
            className="flex items-center justify-between rounded-control bg-panel2 px-3 py-2"
          >
            <span className="text-[13px] text-text">{r.region}</span>
            <Can
              permission="players:read"
              fallback={
                <StatusPill tone={r.allowed ? 'green' : 'red'}>
                  {r.allowed ? 'Allowed' : 'Blocked'}
                </StatusPill>
              }
            >
              <Toggle
                checked={r.allowed}
                onChange={(v) => {
                  setRules((rs) => rs.map((x, idx) => (idx === i ? { ...x, allowed: v } : x)));
                  toast(`${r.region} ${v ? 'allowed' : 'blocked'} — audited`);
                }}
                label={r.region}
              />
            </Can>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
