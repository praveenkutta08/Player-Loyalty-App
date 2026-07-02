import { Bell, Plus, Send } from 'lucide-react';
import { useState } from 'react';

import {
  useCreateNotificationMutation,
  useListNotificationsQuery,
  useSendNotificationMutation,
  type Notification,
} from './notificationsApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  StatusPill,
  Table,
  Textarea,
  Toggle,
  useToast,
  type Column,
} from '@/components/ui';
import { perf } from '@/features/catalog/performance';
import { SEGMENTS, STATUS_TONE } from '@/features/shared/segments';

// Channels are a UI concern; the backend delivers push via the PushPort. In-app/email/SMS are
// composed here and noted as pending backend channel support.
const CHANNELS = ['push', 'in_app', 'email', 'sms'] as const;
const CHANNEL_LABEL: Record<string, string> = {
  push: 'Push',
  in_app: 'In-App',
  email: 'Email',
  sms: 'SMS',
};

interface Composer {
  title: string;
  body: string;
  segment: string;
  channel: (typeof CHANNELS)[number];
  deepLinkType: string;
  deepLinkId: string;
  schedule_at: string;
  abEnabled: boolean;
  bodyB: string;
}

const EMPTY: Composer = {
  title: '',
  body: '',
  segment: 'all',
  channel: 'push',
  deepLinkType: '',
  deepLinkId: '',
  schedule_at: '',
  abEnabled: false,
  bodyB: '',
};

export function NotificationsScreen() {
  const { toast } = useToast();
  const { data: campaigns = [], isLoading } = useListNotificationsQuery();
  const [createNotification] = useCreateNotificationMutation();
  const [sendNotification] = useSendNotificationMutation();
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<Composer>(EMPTY);

  const save = async () => {
    try {
      await createNotification({
        title: c.title,
        body: c.body,
        segment: c.segment === 'all' ? null : c.segment,
        deep_link: c.deepLinkType ? { type: c.deepLinkType, id: c.deepLinkId } : null,
        schedule_at: c.schedule_at ? new Date(c.schedule_at).toISOString() : null,
      }).unwrap();
      toast('Campaign created');
      setOpen(false);
      setC(EMPTY);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

  const columns: Column<Notification>[] = [
    {
      key: 'title',
      header: 'Campaign',
      render: (n) => (
        <div>
          <div className="font-semibold text-text">{n.title}</div>
          <div className="max-w-md truncate text-[12px] text-muted">{n.body}</div>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: () => (
        <StatusPill tone="blue" dot={false} tag>
          Push
        </StatusPill>
      ),
    },
    {
      key: 'segment',
      header: 'Audience',
      render: (n) => <span className="text-text2">{n.segment ?? 'all'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (n) => <StatusPill tone={STATUS_TONE[n.status] ?? 'neutral'}>{n.status}</StatusPill>,
    },
    {
      key: 'open',
      header: 'Open rate',
      align: 'right',
      render: (n) => (
        <span className="font-mono text-text2">
          {n.status === 'sent' ? perf(n.id).conversion : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (n) => (
        <Can permission="push_campaigns:publish">
          {n.status !== 'sent' && (
            <Button
              size="sm"
              icon={<Send size={14} />}
              onClick={async () => {
                try {
                  const res = await sendNotification(n.id).unwrap();
                  toast(`Sent to ${res.delivered}/${res.total}`);
                } catch {
                  toast('Send failed', 'error');
                }
              }}
            >
              Send
            </Button>
          )}
        </Can>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="NOT"
        title="Notifications"
        subtitle="Compose and send multi-channel campaigns."
        actions={
          <Can permission="push_campaigns:create">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              Compose
            </Button>
          </Can>
        }
      />

      <Table
        columns={columns}
        rows={campaigns}
        rowKey={(n) => n.id}
        empty={isLoading ? 'Loading…' : 'No campaigns yet.'}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Compose campaign"
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!c.title || !c.body} onClick={() => void save()}>
              Save campaign
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Channel">
                <Select
                  value={c.channel}
                  onChange={(e) => setC({ ...c, channel: e.target.value as Composer['channel'] })}
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {CHANNEL_LABEL[ch]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Audience">
                <Select value={c.segment} onChange={(e) => setC({ ...c, segment: e.target.value })}>
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Title">
              <Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
            </Field>
            <Field label={c.abEnabled ? 'Body (Variant A)' : 'Body'}>
              <Textarea value={c.body} onChange={(e) => setC({ ...c, body: e.target.value })} />
            </Field>

            <div className="flex items-center justify-between rounded-control border border-border bg-panel2 px-3 py-2">
              <div>
                <div className="text-[13px] font-semibold text-text">A/B test</div>
                <div className="text-[11px] text-muted">Send two variants to compare</div>
              </div>
              <Toggle
                checked={c.abEnabled}
                onChange={(v) => setC({ ...c, abEnabled: v })}
                label="A/B test"
              />
            </div>
            {c.abEnabled && (
              <Field label="Body (Variant B)">
                <Textarea value={c.bodyB} onChange={(e) => setC({ ...c, bodyB: e.target.value })} />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Deep link type">
                <Input
                  value={c.deepLinkType}
                  onChange={(e) => setC({ ...c, deepLinkType: e.target.value })}
                  placeholder="offer / promotion / game"
                />
              </Field>
              <Field label="Deep link id">
                <Input
                  value={c.deepLinkId}
                  onChange={(e) => setC({ ...c, deepLinkId: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Schedule (optional)">
              <Input
                type="datetime-local"
                value={c.schedule_at}
                onChange={(e) => setC({ ...c, schedule_at: e.target.value })}
              />
            </Field>
          </div>

          {/* Live push preview */}
          <div>
            <div className="mb-2 text-label uppercase text-muted">Preview</div>
            <div className="rounded-2xl border border-border bg-panel2 p-3">
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-dim text-gold">
                  <Bell size={16} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-text">
                    {c.title || 'Notification title'}
                  </div>
                  <div className="text-[12px] text-text2">
                    {c.body || 'Your message preview appears here.'}
                  </div>
                  <div className="mt-1 text-[10px] text-faint">
                    {CHANNEL_LABEL[c.channel]} · {c.segment}
                  </div>
                </div>
              </div>
            </div>
            {c.channel !== 'push' && (
              <p className="mt-2 text-[11px] text-faint">
                {CHANNEL_LABEL[c.channel]} delivery is composed here; the MVP backend delivers via
                the push adapter.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
