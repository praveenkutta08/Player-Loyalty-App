import { zodResolver } from '@hookform/resolvers/zod';
import { Crown, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateGameMutation,
  useDeleteGameMutation,
  useListGamesQuery,
  useUpdateGameMutation,
  type Game,
} from './gamesApi';

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
  Select,
  StatusPill,
  Table,
  Toggle,
  useToast,
  type Column,
} from '@/components/ui';
import { STATUS_TONE } from '@/features/shared/segments';

// Leaderboard is player-scoped on the backend (/leaderboard needs a player token); shown here as
// a representative read-only view. Catalog curation is real CRUD against /games/admin.
const LEADERBOARD = [
  { rank: 1, player: 'a1f9…', points: 148200 },
  { rank: 2, player: 'c7b2…', points: 132750 },
  { rank: 3, player: 'e3d8…', points: 119400 },
  { rank: 4, player: 'b5a1…', points: 98120 },
  { rank: 5, player: 'f0c4…', points: 87330 },
];

// Form-shape schema (M13). Numeric inputs stay strings in the form and coerce on submit; jackpot
// amount is required (and positive) only when the game is flagged as a jackpot.
const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 chars'),
    category: z.enum(['slots', 'tables']),
    provider: z.string().trim().max(120).optional().default(''),
    thumbnail_url: z.string().trim().max(2000).optional().default(''),
    volatility: z.string().default('medium'),
    is_jackpot: z.boolean().default(false),
    jackpot_amount: z.string().optional().default(''),
    featured: z.boolean().default(false),
    sort_order: z
      .string()
      .default('0')
      .refine((v) => v === '' || Number.isFinite(Number(v)), 'Enter a number'),
  })
  .refine((v) => !v.is_jackpot || Number(v.jackpot_amount) > 0, {
    path: ['jackpot_amount'],
    message: 'Enter a jackpot amount greater than 0',
  });

type GameForm = z.input<typeof schema>;

const EMPTY: GameForm = {
  title: '',
  category: 'slots',
  provider: '',
  thumbnail_url: '',
  volatility: 'medium',
  is_jackpot: false,
  jackpot_amount: '',
  featured: false,
  sort_order: '0',
};

function defaults(g: Game | null): GameForm {
  if (!g) return EMPTY;
  return {
    title: g.title,
    category: (g.category as 'slots' | 'tables') ?? 'slots',
    provider: g.provider ?? '',
    thumbnail_url: g.thumbnail_url ?? '',
    volatility: g.volatility ?? 'medium',
    is_jackpot: g.is_jackpot,
    jackpot_amount: g.jackpot_amount_cents == null ? '' : String(g.jackpot_amount_cents / 100),
    featured: g.featured,
    sort_order: String(g.sort_order),
  };
}

export function GamesScreen() {
  const { toast } = useToast();
  const { data: games = [], isLoading } = useListGamesQuery();
  const [createGame] = useCreateGameMutation();
  const [updateGame] = useUpdateGameMutation();
  const [deleteGame] = useDeleteGameMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GameForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const isJackpot = watch('is_jackpot');

  const openNew = () => {
    setEditing(null);
    reset(EMPTY);
    setOpen(true);
  };
  const openEdit = (g: Game) => {
    setEditing(g);
    reset(defaults(g));
    setOpen(true);
  };

  const save = handleSubmit(async (form) => {
    const body = {
      title: form.title.trim(),
      category: form.category,
      provider: form.provider?.trim() || null,
      thumbnail_url: form.thumbnail_url?.trim() || null,
      volatility: form.volatility || null,
      is_jackpot: !!form.is_jackpot,
      jackpot_amount_cents:
        form.is_jackpot && form.jackpot_amount ? Number(form.jackpot_amount) * 100 : null,
      featured: !!form.featured,
      sort_order: Number(form.sort_order),
    };
    try {
      if (editing) await updateGame({ id: editing.id, body }).unwrap();
      else await createGame(body).unwrap();
      toast(editing ? 'Game updated' : 'Game created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  });

  const columns: Column<Game>[] = [
    {
      key: 'title',
      header: 'Game',
      render: (g) => (
        <div className="flex items-center gap-2">
          {g.featured && <Star size={13} className="text-gold" fill="currentColor" />}
          <span className="font-semibold text-text">{g.title}</span>
          {g.is_jackpot && (
            <StatusPill tone="gold" dot={false} tag>
              Jackpot
            </StatusPill>
          )}
        </div>
      ),
    },
    {
      key: 'cat',
      header: 'Category',
      render: (g) => <span className="text-text2">{g.category}</span>,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (g) => <span className="text-text2">{g.provider ?? '—'}</span>,
    },
    {
      key: 'vol',
      header: 'Volatility',
      render: (g) => <span className="text-muted">{g.volatility ?? '—'}</span>,
    },
    {
      key: 'jackpot',
      header: 'Jackpot',
      align: 'right',
      render: (g) =>
        g.is_jackpot && g.jackpot_amount_cents != null ? (
          <span className="font-mono text-gold">
            ${(g.jackpot_amount_cents / 100).toLocaleString()}
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (g) => <StatusPill tone={STATUS_TONE[g.status] ?? 'neutral'}>{g.status}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (g) => (
        <div className="flex items-center justify-end gap-1.5">
          <Can permission="content:update">
            <button
              className="text-muted hover:text-text"
              onClick={() => openEdit(g)}
              aria-label="Edit"
            >
              <Pencil size={15} />
            </button>
          </Can>
          <Can permission="content:delete">
            <button
              className="text-muted hover:text-red"
              onClick={async () => {
                try {
                  await deleteGame(g.id).unwrap();
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
        kicker="GAM"
        title="Games"
        subtitle="Curate the catalog, jackpots and featured games."
        actions={
          <Can permission="content:create">
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openNew}>
              New game
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Table
          columns={columns}
          rows={games}
          rowKey={(g) => g.id}
          empty={isLoading ? 'Loading…' : 'No games yet.'}
        />

        <Card>
          <CardHeader title="Leaderboard" subtitle="Top players (read-only)" />
          <CardBody className="pt-3">
            <div className="space-y-2">
              {LEADERBOARD.map((e) => (
                <div key={e.rank} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      e.rank === 1 ? 'bg-gold-fill text-gold-ink' : 'bg-panel2 text-text2'
                    }`}
                  >
                    {e.rank === 1 ? <Crown size={12} /> : e.rank}
                  </span>
                  <span className="flex-1 font-mono text-[12px] text-text2">{e.player}</span>
                  <span className="font-mono text-[12px] text-gold">
                    {e.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit game' : 'New game'}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={isSubmitting} onClick={() => void save()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <Field label="Title">
            <Input {...register('title')} />
            {errors.title && <p className="mt-1 text-[12px] text-red">{errors.title.message}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select {...register('category')}>
                <option value="slots">Slots</option>
                <option value="tables">Tables</option>
              </Select>
            </Field>
            <Field label="Provider">
              <Input {...register('provider')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Volatility">
              <Select {...register('volatility')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input type="number" {...register('sort_order')} />
              {errors.sort_order && (
                <p className="mt-1 text-[12px] text-red">{errors.sort_order.message}</p>
              )}
            </Field>
          </div>
          <div className="flex items-center gap-6">
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-[13px] text-text2">
                  <Toggle checked={!!field.value} onChange={field.onChange} label="Featured" />
                  Featured
                </label>
              )}
            />
            <Controller
              control={control}
              name="is_jackpot"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-[13px] text-text2">
                  <Toggle checked={!!field.value} onChange={field.onChange} label="Jackpot" />
                  Jackpot
                </label>
              )}
            />
          </div>
          {isJackpot && (
            <Field label="Jackpot amount ($)">
              <Input type="number" {...register('jackpot_amount')} />
              {errors.jackpot_amount && (
                <p className="mt-1 text-[12px] text-red">{errors.jackpot_amount.message}</p>
              )}
            </Field>
          )}
        </form>
      </Modal>
    </div>
  );
}
