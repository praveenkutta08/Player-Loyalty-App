import { Crown, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  useCreateRewardMutation,
  useDeleteRewardMutation,
  useListRewardsQuery,
  useUpdateRewardMutation,
  type RewardItem,
} from './rewardsApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  StatusPill,
  Table,
  Tabs,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui';
import { STATUS_TONE } from '@/features/shared/segments';

// 5-tier ladder + earning rules + bonus campaigns are loyalty config (no dedicated backend model
// in P1–P2); the Marketplace tab is real CRUD against /rewards/admin.
const TIERS = [
  { name: 'Bronze', threshold: 0, members: 42, color: '#b08968' },
  { name: 'Silver', threshold: 5000, members: 31, color: '#c7ccd3' },
  { name: 'Gold', threshold: 20000, members: 18, color: '#E6B450' },
  { name: 'Platinum', threshold: 60000, members: 7, color: '#8b929c' },
  { name: 'Diamond', threshold: 150000, members: 2, color: '#6aa6e8' },
];

const RULES = [
  { action: 'Slot play', rate: '1 pt / $1 wagered' },
  { action: 'Table play', rate: '1 pt / $2 wagered' },
  { action: 'Dining spend', rate: '2 pts / $1' },
  { action: 'Hotel night', rate: '500 pts / stay' },
];

const BONUS = [
  { name: 'Double Points Weekend', scope: 'All members', live: true },
  { name: 'Birthday Bonus', scope: 'Per member', live: true },
  { name: 'Welcome 1000', scope: 'New members', live: false },
];

export function RewardsScreen() {
  const [tab, setTab] = useState('tiers');
  return (
    <div>
      <PageHeader
        kicker="RWD"
        title="Rewards"
        subtitle="Loyalty tiers, points rules and the marketplace."
      />
      <div className="mb-5">
        <Tabs
          items={[
            { key: 'tiers', label: 'Tiers' },
            { key: 'rules', label: 'Points Rules' },
            { key: 'marketplace', label: 'Marketplace' },
            { key: 'bonus', label: 'Bonus Campaigns' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'tiers' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((t) => (
            <Card key={t.name} accent={t.color}>
              <CardBody>
                <Crown size={18} style={{ color: t.color }} />
                <div className="mt-2 text-[15px] font-bold text-text">{t.name}</div>
                <div className="font-mono text-[12px] text-muted">
                  {t.threshold.toLocaleString()}+ pts
                </div>
                <div className="display mt-2 text-[22px] font-semibold text-text">{t.members}%</div>
                <div className="text-[11px] text-faint">of members</div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <Card>
          <CardHeader title="Points Earning Rules" />
          <CardBody className="pt-3">
            <div className="divide-y divide-border-soft">
              {RULES.map((r) => (
                <div key={r.action} className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] font-medium text-text">{r.action}</span>
                  <span className="font-mono text-[12px] text-gold">{r.rate}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'marketplace' && <Marketplace />}

      {tab === 'bonus' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BONUS.map((b) => (
            <Card key={b.name}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-bold text-text">{b.name}</div>
                  <div className="text-[12px] text-muted">{b.scope}</div>
                </div>
                <StatusPill tone={b.live ? 'green' : 'neutral'}>
                  {b.live ? 'Live' : 'Off'}
                </StatusPill>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface RewardForm {
  title: string;
  category: string;
  points_cost: string;
  stock: string;
  image_url: string;
  terms: string;
}

const EMPTY: RewardForm = {
  title: '',
  category: '',
  points_cost: '100',
  stock: '',
  image_url: '',
  terms: '',
};

function Marketplace() {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useListRewardsQuery();
  const [createReward] = useCreateRewardMutation();
  const [updateReward] = useUpdateRewardMutation();
  const [deleteReward] = useDeleteRewardMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RewardItem | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (i: RewardItem) => {
    setEditing(i);
    setForm({
      title: i.title,
      category: i.category ?? '',
      points_cost: String(i.points_cost),
      stock: i.stock == null ? '' : String(i.stock),
      image_url: i.image_url ?? '',
      terms: i.terms ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    const body = {
      title: form.title,
      category: form.category || null,
      points_cost: Number(form.points_cost),
      stock: form.stock ? Number(form.stock) : null,
      image_url: form.image_url || null,
      terms: form.terms || null,
    };
    try {
      if (editing) await updateReward({ id: editing.id, body }).unwrap();
      else await createReward(body).unwrap();
      toast(editing ? 'Item updated' : 'Item created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

  const columns: Column<RewardItem>[] = [
    {
      key: 'title',
      header: 'Item',
      render: (i) => <span className="font-semibold text-text">{i.title}</span>,
    },
    {
      key: 'cat',
      header: 'Category',
      render: (i) => <span className="text-text2">{i.category ?? '—'}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (i) => (
        <span className="font-mono text-gold">{i.points_cost.toLocaleString()} pts</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (i) => <span className="font-mono text-text2">{i.stock ?? '∞'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <StatusPill tone={STATUS_TONE[i.status] ?? 'neutral'}>{i.status}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1.5">
          <Can permission="content:update">
            <button
              className="text-muted hover:text-text"
              onClick={() => openEdit(i)}
              aria-label="Edit"
            >
              <Pencil size={15} />
            </button>
            {i.status !== 'published' && (
              <button
                className="text-muted hover:text-green"
                onClick={async () => {
                  try {
                    await updateReward({ id: i.id, body: { status: 'published' } }).unwrap();
                    toast('Published');
                  } catch {
                    toast('Publish failed', 'error');
                  }
                }}
                aria-label="Publish"
              >
                <Send size={15} />
              </button>
            )}
          </Can>
          <Can permission="content:delete">
            <button
              className="text-muted hover:text-red"
              onClick={async () => {
                try {
                  await deleteReward(i.id).unwrap();
                  toast('Deleted');
                } catch {
                  toast('Delete failed', 'error');
                }
              }}
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Can permission="content:create">
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openNew}>
            New item
          </Button>
        </Can>
      </div>
      <Table
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        empty={isLoading ? 'Loading…' : 'No marketplace items yet.'}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit item' : 'New item'}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!form.title} onClick={() => void save()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="Points cost">
              <Input
                type="number"
                value={form.points_cost}
                onChange={(e) => setForm({ ...form, points_cost: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock (blank = ∞)">
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>
            <Field label="Image URL">
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Terms">
            <Textarea
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
