import { Plus } from 'lucide-react';
import { useState } from 'react';

import { CasinoDetail } from './CasinoDetail';
import { CasinoDirectory } from './CasinoDirectory';
import { CasinoWizard } from './CasinoWizard';

import type { TenantOut } from '@/auth/types';

import { setActiveTenant } from '@/app/sessionSlice';
import { useAppDispatch } from '@/app/store';
import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Tabs } from '@/components/ui';

type View = { kind: 'directory' } | { kind: 'detail'; tenant: TenantOut } | { kind: 'wizard' };

export function CasinosScreen() {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>({ kind: 'directory' });

  const openDetail = (tenant: TenantOut) => {
    // Act on this property so its /config (feature flags) loads under the right X-Tenant.
    dispatch(setActiveTenant(tenant.id));
    setView({ kind: 'detail', tenant });
  };

  return (
    <div>
      <PageHeader
        kicker="CAS"
        title="Casino Management"
        subtitle="Provision and manage white-label casino properties."
        actions={
          view.kind === 'directory' && (
            <Can permission="tenants:create">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setView({ kind: 'wizard' })}
              >
                New Casino
              </Button>
            </Can>
          )
        }
      />

      {view.kind !== 'detail' && (
        <div className="mb-5">
          <Tabs
            items={[
              { key: 'directory', label: 'Directory' },
              { key: 'wizard', label: 'New Casino' },
            ]}
            value={view.kind}
            onChange={(k) => setView(k === 'wizard' ? { kind: 'wizard' } : { kind: 'directory' })}
          />
        </div>
      )}

      {view.kind === 'directory' && <CasinoDirectory onOpen={openDetail} />}
      {view.kind === 'detail' && (
        <CasinoDetail tenant={view.tenant} onBack={() => setView({ kind: 'directory' })} />
      )}
      {view.kind === 'wizard' && (
        <Can permission="tenants:create" fallback={<p className="text-muted">Not permitted.</p>}>
          <CasinoWizard onDone={() => setView({ kind: 'directory' })} />
        </Can>
      )}
    </div>
  );
}
