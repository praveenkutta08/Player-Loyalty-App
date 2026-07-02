import { Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

interface FormState {
  content_type: (typeof TYPES)[number];
  title: string;
  body: string;
  media_url: string;
  segment: string;
  publish_at: string;
}

const EMPTY: FormState = {
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
  const [form, setForm] = useState<FormState>(EMPTY);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setForm({
      content_type: (item.content_type as FormState['content_type']) ?? 'banner',
      title: item.title,
      body: item.body ?? '',
      media_url: item.media_url ?? '',
      segment: item.segment ?? 'all',
      publish_at: item.publish_at ? item.publish_at.slice(0, 16) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    const body = {
      content_type: form.content_type,
      title: form.title,
      body: form.body || null,
      media_url: form.media_url || null,
      segment: form.segment === 'all' ? null : form.segment,
      publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
    };
    try {
      if (editing) await updateContent({ id: editing.id, body }).unwrap();
      else await createContent(body).unwrap();
      toast(editing ? 'Content updated' : 'Content created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

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
            <Button variant="primary" disabled={!form.title} onClick={() => void save()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select
                value={form.content_type}
                onChange={(e) =>
                  setForm({ ...form, content_type: e.target.value as FormState['content_type'] })
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Segment">
              <Select
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
              >
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Body">
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Media URL">
              <Input
                value={form.media_url}
                onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                placeholder="From Media Library"
              />
            </Field>
            <Field label="Schedule (publish at)">
              <Input
                type="datetime-local"
                value={form.publish_at}
                onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
              />
            </Field>
          </div>
        </div>
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
