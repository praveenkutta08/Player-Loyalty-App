import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { useListAuditLogsQuery, type AuditLog } from './auditApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  StatusPill,
  Table,
  Tabs,
  useToast,
  type Column,
} from '@/components/ui';

// Publishing pipeline stages are a workflow view (content/offers publish directly in P1–P2 without
// review states), so items here are illustrative with working approval actions. The Audit Log is
// real (/audit-logs, immutable). Rollback has no endpoint yet and is documented as pending.
type Stage = 'Draft' | 'In Review' | 'Approved' | 'Published';
const STAGES: Stage[] = ['Draft', 'In Review', 'Approved', 'Published'];
const NEXT: Record<Stage, Stage | null> = {
  Draft: 'In Review',
  'In Review': 'Approved',
  Approved: 'Published',
  Published: null,
};

interface PipelineItem {
  id: string;
  title: string;
  type: string;
  stage: Stage;
}

const INITIAL: PipelineItem[] = [
  { id: '1', title: 'Weekend Promo', type: 'promotion', stage: 'Draft' },
  { id: '2', title: 'Welcome Offer v2', type: 'offer', stage: 'In Review' },
  { id: '3', title: 'Summer Theme', type: 'theme', stage: 'Approved' },
  { id: '4', title: 'Homepage refresh', type: 'content', stage: 'Published' },
  { id: '5', title: 'Jackpot banner', type: 'content', stage: 'Draft' },
];

export function AuditScreen() {
  const [tab, setTab] = useState('pipeline');
  return (
    <div>
      <PageHeader
        kicker="AUD"
        title="Audit & Publishing"
        subtitle="Approval pipeline and the immutable audit log."
      />
      <div className="mb-5">
        <Tabs
          items={[
            { key: 'pipeline', label: 'Publishing' },
            { key: 'log', label: 'Audit Log' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'pipeline' ? <Pipeline /> : <AuditLogTab />}
    </div>
  );
}

function Pipeline() {
  const { toast } = useToast();
  const [items, setItems] = useState<PipelineItem[]>(INITIAL);

  const advance = (id: string) =>
    setItems((list) =>
      list.map((it) => {
        if (it.id !== id) return it;
        const next = NEXT[it.stage];
        if (next) toast(`${it.title} → ${next}`);
        return next ? { ...it, stage: next } : it;
      }),
    );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((stage) => {
        const staged = items.filter((i) => i.stage === stage);
        return (
          <Card key={stage}>
            <CardBody className="pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-bold text-text">{stage}</span>
                <span className="font-mono text-[11px] text-muted">{staged.length}</span>
              </div>
              <div className="space-y-2">
                {staged.map((it) => (
                  <div key={it.id} className="rounded-control border border-border bg-panel2 p-2.5">
                    <div className="text-[12px] font-semibold text-text">{it.title}</div>
                    <div className="mb-2 text-[11px] text-muted">{it.type}</div>
                    {NEXT[it.stage] && (
                      <Can permission="content:publish">
                        <Button size="sm" className="w-full" onClick={() => advance(it.id)}>
                          {it.stage === 'Approved' ? 'Publish' : `→ ${NEXT[it.stage]}`}
                        </Button>
                      </Can>
                    )}
                  </div>
                ))}
                {staged.length === 0 && <p className="text-[11px] text-faint">Empty</p>}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function AuditLogTab() {
  const { toast } = useToast();
  const { data: page, isLoading } = useListAuditLogsQuery();
  const logs = page?.items ?? [];

  const columns: Column<AuditLog>[] = [
    {
      key: 'ts',
      header: 'When',
      render: (l) => (
        <span className="font-mono text-[12px] text-muted">{new Date(l.ts).toLocaleString()}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) => (
        <span className="text-text2">
          {l.actor_type}
          {l.actor_id ? ` · ${l.actor_id.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <StatusPill tone="blue" dot={false} tag>
          {l.action}
        </StatusPill>
      ),
    },
    {
      key: 'entity',
      header: 'Object',
      render: (l) => (
        <span className="text-text2">
          {l.entity}
          {l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <Can permission="audit_logs:read">
          <button
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-gold"
            onClick={() => toast(`Rollback requested for ${l.action}`)}
          >
            <RotateCcw size={13} /> Rollback
          </button>
        </Can>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={logs}
      rowKey={(l) => l.id}
      empty={isLoading ? 'Loading…' : 'No audit entries yet.'}
    />
  );
}
