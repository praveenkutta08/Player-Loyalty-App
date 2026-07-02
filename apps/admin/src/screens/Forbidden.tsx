import { Lock } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui';

/** Shown when an authenticated admin lacks the permission a route requires (mirrors the API 403). */
export function Forbidden({ permission }: { permission?: string }) {
  return (
    <div>
      <PageHeader kicker="403" title="Access restricted" />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-dim text-red">
            <Lock size={22} />
          </span>
          <div className="text-[14px] font-semibold text-text">
            You don’t have permission to view this screen.
          </div>
          <p className="max-w-sm text-[13px] text-muted">
            This action requires{' '}
            <span className="font-mono text-text2">{permission ?? 'a permission'}</span> you have
            not been granted. Ask a Platform Admin to update your role. The server enforces this
            independently.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
