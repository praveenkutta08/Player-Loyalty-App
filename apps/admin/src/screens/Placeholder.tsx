import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui';

/**
 * Stand-in for screens not yet built. Each Phase-3 prompt replaces its route's placeholder with
 * the real screen. Keeps the shell fully navigable from P3.1 onward.
 */
export function Placeholder({ id, title }: { id: string; title: string }) {
  return (
    <div>
      <PageHeader
        kicker={id}
        title={title}
        subtitle="This screen is scheduled in the Phase 3 build playbook."
      />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-dim text-gold">
            <Construction size={22} />
          </span>
          <div className="text-[14px] font-semibold text-text">{title}</div>
          <p className="max-w-sm text-[13px] text-muted">
            Design tokens, shell, and navigation are live. The full {title} experience arrives with
            its dedicated build prompt.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
