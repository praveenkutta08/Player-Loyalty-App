import { Crown, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  useCreateRewardMutation,
  useDeleteRewardMutation,
  useListRewardsQuery,
  useUpdateRewardMutation,
  type RewardItem,
} from './rewardsApi';

import { usePresignMediaMutation } from '@/features/media/mediaApi';
import {
  useListThemesQuery,
  useUpdateThemeMutation,
  type ThemeUpdate,
} from '@/features/theme/themesApi';

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

      {tab === 'tiers' && <TiersTab />}

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

/**
 * Tiers tab — per-tier member-card art. Uploads presign→PUT to object storage, then store the
 * public media_url on the ACTIVE theme's tokens (`tierCards.<tier>`); the mobile app reads it from
 * the manifest theme (extra-allow passthrough) and renders it on the wallet member card + tier
 * screen. Activating/refreshing the theme bumps the manifest version devices poll (GOLDEN #5).
 */
function TiersTab() {
  const { toast } = useToast();
  const { data: themes = [] } = useListThemesQuery();
  const [updateTheme] = useUpdateThemeMutation();
  const [presign] = usePresignMediaMutation();
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const active = themes.find((t) => t.is_active) ?? null;
  const tierCards =
    ((active?.tokens as Record<string, unknown> | undefined)?.tierCards as
      | Record<string, string>
      | undefined) ?? {};

  const saveTokens = async (tokens: Record<string, unknown>, ok: string) => {
    if (!active) return;
    await updateTheme({ id: active.id, body: { tokens } as ThemeUpdate }).unwrap();
    toast(ok);
  };

  const onUpload = async (tierKey: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    if (!active) {
      toast('Create and activate a theme under Appearance first, then upload tier art.', 'error');
      return;
    }
    setBusyTier(tierKey);
    try {
      const res = await presign({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      }).unwrap();
      const put = await fetch(res.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) {
        toast(`Upload failed (${put.status}) — image not stored.`, 'error');
        return;
      }
      const tokens = { ...(active.tokens as Record<string, unknown>) };
      tokens.tierCards = { ...tierCards, [tierKey]: res.media_url };
      await saveTokens(tokens, 'Tier card updated');
    } catch {
      toast('Save failed (permission or backend?).', 'error');
    } finally {
      setBusyTier(null);
    }
  };

  const onRemove = async (tierKey: string) => {
    if (!active) return;
    setBusyTier(tierKey);
    try {
      const next = { ...tierCards };
      delete next[tierKey];
      const tokens = { ...(active.tokens as Record<string, unknown>), tierCards: next };
      await saveTokens(tokens, 'Tier card removed');
    } catch {
      toast('Save failed.', 'error');
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <>
      {!active && (
        <p className="mb-3 text-[12px] text-muted">
          No active theme yet — create and activate one under Appearance to store tier card art.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TIERS.map((t) => {
          const key = t.name.toLowerCase();
          const img = tierCards[key];
          return (
            <Card key={t.name} accent={t.color}>
              <CardBody>
                <div className="mb-2 aspect-[1.6] overflow-hidden rounded-md border border-[var(--token-border-ghost)] bg-[var(--token-bg-container)]">
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                      No card art
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Crown size={16} style={{ color: t.color }} />
                  <span className="text-[15px] font-bold text-text">{t.name}</span>
                </div>
                <div className="font-mono text-[12px] text-muted">
                  {t.threshold.toLocaleString()}+ pts
                </div>
                <input
                  ref={(el) => {
                    fileRefs.current[key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(key, f);
                    e.target.value = '';
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    disabled={busyTier === key}
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    {busyTier === key ? 'Uploading…' : img ? 'Replace' : 'Upload card'}
                  </Button>
                  {img && (
                    <Button type="button" disabled={busyTier === key} onClick={() => void onRemove(key)}>
                      Remove
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
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
  const [presign] = usePresignMediaMutation();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RewardItem | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY);

  // Presign → PUT to object storage → store the public media_url (reuses the CMS media presign).
  const onPickImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await presign({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      }).unwrap();
      const put = await fetch(res.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) {
        toast(`Upload failed (${put.status}) — image not stored.`, 'error');
        return;
      }
      setForm((f) => ({ ...f, image_url: res.media_url }));
      toast('Image uploaded');
    } catch {
      toast('Upload failed — image not stored.', 'error');
    } finally {
      setUploading(false);
    }
  };

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
            <Field label="Image">
              <div className="flex items-center gap-3">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--token-border-ghost)] bg-[var(--token-bg-container)]">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onPickImage(f);
                      e.target.value = '';
                    }}
                  />
                  <Button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? 'Uploading…' : form.image_url ? 'Replace' : 'Upload image'}
                  </Button>
                  {form.image_url && (
                    <Button type="button" onClick={() => setForm({ ...form, image_url: '' })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <Input
                className="mt-2"
                value={form.image_url}
                placeholder="…or paste an image URL"
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
