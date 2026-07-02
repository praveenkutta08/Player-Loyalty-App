import { Check, Plus, Upload, X } from 'lucide-react';
import { useState } from 'react';

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

// KYC (KycPort), Responsible Gaming and geolocation/jurisdiction (GeoPort) config + review queues.
// The P1–P2 backend exposes these via player-side adapters; admin config/queues have no dedicated
// endpoints yet, so this is local + documented as pending. All actions are treated as audited.
interface KycCase {
  id: string;
  player: string;
  submitted: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_CASES: KycCase[] = [
  { id: 'k1', player: 'c•••@demo.test', submitted: '2h ago', status: 'pending' },
  { id: 'k2', player: 'd•••@demo.test', submitted: '5h ago', status: 'pending' },
  { id: 'k3', player: 'e•••@demo.test', submitted: 'Yesterday', status: 'approved' },
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

function RgTab() {
  const { toast } = useToast();
  const [limits, setLimits] = useState({ deposit: '5000', timeMinutes: '240', coolOff: '7' });
  const [exclusions, setExclusions] = useState<string[]>(['g•••@demo.test']);
  const [newEx, setNewEx] = useState('');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Default Limits" />
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
          <Can permission="players:read">
            <Button size="sm" className="w-full" onClick={() => toast('RG limits saved — audited')}>
              Save limits
            </Button>
          </Can>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Self-Exclusion List"
          action={
            <button
              className="inline-flex items-center gap-1 text-[12px] text-gold"
              onClick={() => toast('Exported')}
            >
              <Upload size={13} /> Export
            </button>
          }
        />
        <CardBody className="space-y-2 pt-3">
          <div className="flex gap-2">
            <Input
              value={newEx}
              onChange={(e) => setNewEx(e.target.value)}
              placeholder="player email"
            />
            <Can permission="players:read">
              <Button
                icon={<Plus size={15} />}
                disabled={!newEx}
                onClick={() => {
                  setExclusions((x) => [...x, newEx]);
                  setNewEx('');
                  toast('Added to self-exclusion — audited');
                }}
              >
                Add
              </Button>
            </Can>
          </div>
          {exclusions.map((e) => (
            <div
              key={e}
              className="flex items-center justify-between rounded-control bg-panel2 px-3 py-2"
            >
              <span className="font-mono text-[12px] text-text2">{e}</span>
              <StatusPill tone="red">excluded</StatusPill>
            </div>
          ))}
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
