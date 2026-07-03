import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateContentMutation,
  useDeleteContentMutation,
  useListContentQuery,
  usePublishContentMutation,
  useUpdateContentMutation,
  type ContentItem,
} from './contentApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  StatusPill,
  Table,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui';
import { SEGMENTS, STATUS_TONE } from '@/features/shared/segments';

const TYPES = ['banner', 'article', 'promo_card', 'announcement'] as const;

// RHF + zod (M13). `publish_at` is the datetime-local string; mapped to ISO on submit.
const schema = z.object({
  content_type: z.enum(TYPES),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 chars'),
  body: z.string().max(8000).optional().default(''),
  media_url: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/|^\//.test(v), 'Enter a URL or media path')
    .optional()
    .default(''),
  segment: z.string().default('all'),
  publish_at: z.string().optional().default(''),
});
type FormShape = z.input<typeof schema>;

const EMPTY: FormShape = {
  content_type: 'banner',
  title: '',
  body: '',
  media_url: '',
  segment: 'all',
  publish_at: '',
};

export function ContentScreen() {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useListContentQuery();
  const [createContent] = useCreateContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [publishContent] = usePublishContentMutation();
  const [deleteContent] = useDeleteContentMutation();

  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const openNew = () => {
    setEditing(null);
    reset(EMPTY);
    setOpen(true);
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    reset({
      content_type: (TYPES as readonly string[]).includes(item.content_type)
        ? (item.content_type as FormShape['content_type'])
        : 'banner',
      title: item.title,
      body: item.body ?? '',
      media_url: item.media_url ?? '',
      segment: item.segment ?? 'all',
      publish_at: item.publish_at ? item.publish_at.slice(0, 16) : '',
    });
    setOpen(true);
  };

  const save = handleSubmit(async (v) => {
    const body = {
      content_type: v.content_type,
      title: v.title.trim(),
      body: v.body?.trim() || null,
      media_url: v.media_url?.trim() || null,
      segment: v.segment === 'all' ? null : v.segment,
      publish_at: v.publish_at ? new Date(v.publish_at).toISOString() : null,
    };
    try {
      if (editing) await updateContent({ id: editing.id, body }).unwrap();
      else await createContent(body).unwrap();
      toast(editing ? 'Content updated' : 'Content created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  });

  const columns: Column<ContentItem>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (i) => (
        <div>
          <div className="font-semibold text-text">{i.title}</div>
          {i.body && <div className="max-w-md truncate text-[12px] text-muted">{i.body}</div>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (i) => (
        <StatusPill tone="blue" dot={false} tag>
          {i.content_type.replace('_', ' ')}
        </StatusPill>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (i) => <span className="text-text2">{i.segment ?? 'all'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <StatusPill tone={STATUS_TONE[i.status] ?? 'neutral'}>{i.status}</StatusPill>,
    },
    {
      key: 'schedule',
      header: 'Publish at',
      render: (i) => (
        <span className="font-mono text-[12px] text-muted">
          {i.publish_at ? new Date(i.publish_at).toLocaleString() : '—'}
        </span>
      ),
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
          </Can>
          <Can permission="content:publish">
            {i.status !== 'published' && (
              <button
                className="text-muted hover:text-green"
                onClick={async () => {
                  try {
                    await publishContent(i.id).unwrap();
                    toast('Published — manifest bumped');
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
                  await deleteContent(i.id).unwrap();
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
        kicker="CNT"
        title="Content"
        subtitle="Author, schedule and publish app content."
        actions={
          <Can permission="content:create">
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openNew}>
              New content
            </Button>
          </Can>
        }
      />

      <Table
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        empty={isLoading ? 'Loading…' : 'No content yet. Create your first item.'}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit content' : 'New content'}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select {...register('content_type')}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Segment">
              <Select {...register('segment')}>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Title">
            <Input {...register('title')} />
            {errors.title && <p className="mt-1 text-[12px] text-red">{errors.title.message}</p>}
          </Field>
          <Field label="Body">
            <Textarea {...register('body')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Media URL">
              <Input {...register('media_url')} placeholder="From Media Library" />
              {errors.media_url && (
                <p className="mt-1 text-[12px] text-red">{errors.media_url.message}</p>
              )}
            </Field>
            <Field label="Schedule (publish at)">
              <Input type="datetime-local" {...register('publish_at')} />
            </Field>
          </div>
        </form>
      </Modal>

      {items.length === 0 && !isLoading && (
        <Card className="mt-4 border-dashed">
          <p className="p-4 text-[12px] text-faint">
            Content reads/writes <span className="font-mono">/content</span> for the selected
            casino. Start the backend and pick a casino to manage live items.
          </p>
        </Card>
      )}
    </div>
  );
}
