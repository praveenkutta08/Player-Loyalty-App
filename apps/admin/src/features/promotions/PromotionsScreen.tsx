import { ChevronLeft, ChevronRight, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  Modal,
  StatusPill,
  Table,
  Tabs,
  useToast,
  type Column,
} from '@/components/ui';
import {
  useCreatePromotionMutation,
  useDeletePromotionMutation,
  useListPromotionsQuery,
  usePublishPromotionMutation,
  useUpdatePromotionMutation,
  type Offer,
} from '@/features/catalog/catalogApi';
import { CatalogForm, type CatalogFormValues } from '@/features/catalog/CatalogForm';
import { perf } from '@/features/catalog/performance';
import { STATUS_TONE } from '@/features/shared/segments';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function PromotionsScreen() {
  const { toast } = useToast();
  const { data: promos = [], isLoading } = useListPromotionsQuery();
  const [createPromotion] = useCreatePromotionMutation();
  const [updatePromotion] = useUpdatePromotionMutation();
  const [publishPromotion] = usePublishPromotionMutation();
  const [deletePromotion] = useDeletePromotionMutation();

  const [tab, setTab] = useState('list');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [detail, setDetail] = useState<Offer | null>(null);

  const save = async (values: CatalogFormValues) => {
    try {
      if (editing) await updatePromotion({ id: editing.id, body: values }).unwrap();
      else await createPromotion(values).unwrap();
      toast(editing ? 'Promotion updated' : 'Promotion created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

  const columns: Column<Offer>[] = [
    {
      key: 'title',
      header: 'Promotion',
      render: (p) => (
        <div>
          <div className="font-semibold text-text">{p.title}</div>
          <div className="text-[12px] text-muted">{p.segment ?? 'all'} · audience</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusPill tone={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</StatusPill>,
    },
    {
      key: 'window',
      header: 'Schedule',
      render: (p) => (
        <span className="font-mono text-[12px] text-muted">
          {p.start_at ? new Date(p.start_at).toLocaleDateString() : '—'} →{' '}
          {p.end_at ? new Date(p.end_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'redeemed',
      header: 'Redeemed',
      align: 'right',
      render: (p) => (
        <span className="font-mono text-text2">{perf(p.id).redeemed.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Can permission="promotions:update">
            <button
              className="text-muted hover:text-text"
              onClick={() => {
                setEditing(p);
                setOpen(true);
              }}
              aria-label="Edit"
            >
              <Pencil size={15} />
            </button>
          </Can>
          <Can permission="promotions:publish">
            {p.status !== 'published' && (
              <button
                className="text-muted hover:text-green"
                onClick={async () => {
                  try {
                    await publishPromotion(p.id).unwrap();
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
          <Can permission="promotions:delete">
            <button
              className="text-muted hover:text-red"
              onClick={async () => {
                try {
                  await deletePromotion(p.id).unwrap();
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
      <PageHeader
        kicker="PRO"
        title="Promotions"
        subtitle="Time-boxed promotions with a list and calendar view."
        actions={
          <Can permission="promotions:create">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              New promotion
            </Button>
          </Can>
        }
      />

      <div className="mb-5">
        <Tabs
          items={[
            { key: 'list', label: 'List' },
            { key: 'calendar', label: 'Calendar' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'list' ? (
        <Table
          columns={columns}
          rows={promos}
          rowKey={(p) => p.id}
          onRowClick={setDetail}
          empty={isLoading ? 'Loading…' : 'No promotions yet.'}
        />
      ) : (
        <PromotionsCalendar promos={promos} onSelect={setDetail} />
      )}

      <CatalogForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        noun="promotion"
        onSave={save}
      />

      <PromotionDetailModal promo={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function PromotionsCalendar({
  promos,
  onSelect,
}: {
  promos: Offer[];
  onSelect: (p: Offer) => void;
}) {
  // Opens on the current month (navigable month-to-month) instead of a pinned demo date.
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const first = new Date(ym.year, ym.month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map: Record<number, Offer[]> = {};
    for (const p of promos) {
      if (!p.start_at) continue;
      const d = new Date(p.start_at);
      if (d.getFullYear() === ym.year && d.getMonth() === ym.month) {
        (map[d.getDate()] ??= []).push(p);
      }
    }
    return map;
  }, [promos, ym]);

  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) => {
    const m = ym.month + delta;
    setYm({ year: ym.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="display text-[18px] font-semibold text-text">
            {MONTHS[ym.month]} {ym.year}
          </h3>
          <div className="flex gap-1">
            <button
              className="rounded-control border border-border p-1.5 text-muted hover:text-text"
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="rounded-control border border-border p-1.5 text-muted hover:text-text"
              onClick={() => shift(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-label uppercase text-faint">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-[76px] rounded-control border border-border-soft p-1.5 ${day ? 'bg-panel2' : 'bg-transparent'}`}
            >
              {day && <div className="mb-1 font-mono text-[11px] text-muted">{day}</div>}
              <div className="space-y-1">
                {(byDay[day ?? -1] ?? []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p)}
                    className="block w-full truncate rounded bg-gold-dim px-1.5 py-0.5 text-left text-[10px] font-semibold text-gold"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function PromotionDetailModal({ promo, onClose }: { promo: Offer | null; onClose: () => void }) {
  if (!promo) return null;
  const p = perf(promo.id);
  return (
    <Modal open={!!promo} onClose={onClose} title={promo.title} width="max-w-2xl">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <StatusPill tone="purple" dot={false} tag>
              promotion
            </StatusPill>
            <StatusPill tone={STATUS_TONE[promo.status] ?? 'neutral'}>{promo.status}</StatusPill>
          </div>
          {promo.description && <p className="mb-4 text-[13px] text-text2">{promo.description}</p>}
          <div
            className="mb-4 h-28 rounded-card"
            style={{ background: 'linear-gradient(135deg, var(--purple), var(--gold))' }}
          />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Views', value: p.views.toLocaleString() },
              { label: 'Redeemed', value: p.redeemed.toLocaleString() },
              { label: 'Conversion', value: p.conversion },
            ].map((s) => (
              <div key={s.label} className="rounded-card border border-border bg-panel2 p-3">
                <div className="kicker mb-1">{s.label}</div>
                <div className="display text-[20px] font-semibold text-text">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-panel2 p-3">
            <div className="kicker mb-2">Audience</div>
            <div className="text-[13px] text-text2">{promo.segment ?? 'All players'}</div>
          </div>
          <div className="rounded-card border border-border bg-panel2 p-3">
            <div className="kicker mb-2">Schedule</div>
            <div className="text-[12px] text-text2">
              {promo.start_at ? new Date(promo.start_at).toLocaleString() : '—'}
            </div>
            <div className="text-[12px] text-text2">
              {promo.end_at ? new Date(promo.end_at).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
