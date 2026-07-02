import { Plus } from 'lucide-react';
import { useState } from 'react';

import { useCreateFaqMutation, useListFaqQuery } from './supportApi';

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
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui';

// FAQ knowledge base is real (/support/faq). System prompt, guardrails, canned replies and
// escalation routing have no dedicated backend config in P1–P2 — managed locally and documented
// as pending. The chat assistant already enforces refuse-transactional + escalation server-side.
export function SupportScreen() {
  const { toast } = useToast();
  const { data: faqs = [], isLoading } = useListFaqQuery();
  const [createFaq] = useCreateFaqMutation();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are the casino support assistant. Answer only from the knowledge base. Never perform ' +
      'transactions or reveal PII; escalate anything you cannot answer confidently.',
  );
  const [guardrails, setGuardrails] = useState({
    refuseTransactional: true,
    escalateLowConfidence: true,
  });

  const addFaq = async () => {
    try {
      await createFaq({ question: q, answer: a, is_active: true }).unwrap();
      toast('FAQ added');
      setQ('');
      setA('');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        kicker="SUP"
        title="Support Assistant"
        subtitle="Knowledge base, guardrails and escalation routing."
        actions={
          <Can permission="content:update">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              Add FAQ
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Knowledge Base / FAQ" subtitle={`${faqs.length} entries`} />
          <CardBody className="space-y-3 pt-3">
            {isLoading && <p className="text-[12px] text-muted">Loading…</p>}
            {!isLoading && faqs.length === 0 && (
              <p className="text-[12px] text-muted">No FAQ entries yet.</p>
            )}
            {faqs.map((f) => (
              <div key={f.id} className="rounded-control border border-border bg-panel2 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-text">{f.question}</div>
                  <StatusPill tone={f.is_active ? 'green' : 'neutral'}>
                    {f.is_active ? 'Active' : 'Off'}
                  </StatusPill>
                </div>
                <div className="mt-1 text-[12px] text-muted">{f.answer}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="System Prompt & Guardrails" />
            <CardBody className="space-y-3 pt-3">
              <Can
                permission="content:update"
                fallback={<p className="text-[12px] text-muted">{systemPrompt}</p>}
              >
                <Field label="System prompt">
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </Field>
              </Can>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text2">Refuse transactional requests</span>
                <Toggle
                  checked={guardrails.refuseTransactional}
                  onChange={(v) => setGuardrails({ ...guardrails, refuseTransactional: v })}
                  label="Refuse transactional"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text2">Escalate on low confidence</span>
                <Toggle
                  checked={guardrails.escalateLowConfidence}
                  onChange={(v) => setGuardrails({ ...guardrails, escalateLowConfidence: v })}
                  label="Escalate low confidence"
                />
              </div>
              <Can permission="content:update">
                <Button size="sm" className="w-full" onClick={() => toast('Guardrails saved')}>
                  Save guardrails
                </Button>
              </Can>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Escalation & Deflection" />
            <CardBody className="pt-3">
              <div className="mb-3 flex items-center justify-between rounded-control bg-panel2 px-3 py-2">
                <span className="text-[12px] text-muted">Deflection rate</span>
                <span className="display text-[20px] font-semibold text-green">78%</span>
              </div>
              <Field label="Escalation routing">
                <Input defaultValue="support-tickets@casino.com" />
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add FAQ entry"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!q || !a} onClick={() => void addFaq()}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Question">
            <Input value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Answer">
            <Textarea value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
