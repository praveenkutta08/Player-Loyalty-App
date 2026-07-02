import { GripVertical, Home, Layers, QrCode, Ticket, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardBody, Input, Toggle, useToast } from '@/components/ui';
import { useGetConfigQuery, useUpdateConfigMutation } from '@/features/casinos/configApi';

// Navigation Builder — reorderable bottom-tab items, persisted into the tenant config's
// `navigation.tabs` blob (Option B default: Home, Offers, center Scan/Play, Account, More).
interface NavTab {
  id: string;
  label: string;
  deepLink: string;
  enabled: boolean;
  icon: string;
}

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  offers: Ticket,
  scan: QrCode,
  account: User,
  more: Layers,
};

const DEFAULT_TABS: NavTab[] = [
  { id: 'home', label: 'Home', deepLink: '/home', enabled: true, icon: 'home' },
  { id: 'offers', label: 'Offers', deepLink: '/offers', enabled: true, icon: 'offers' },
  { id: 'scan', label: 'Scan', deepLink: '/scan', enabled: true, icon: 'scan' },
  { id: 'account', label: 'Account', deepLink: '/account', enabled: true, icon: 'account' },
  { id: 'more', label: 'More', deepLink: '/more', enabled: true, icon: 'more' },
];

export function NavigationBuilder() {
  const { toast } = useToast();
  const { data: config } = useGetConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateConfigMutation();

  const [tabs, setTabs] = useState<NavTab[]>(DEFAULT_TABS);
  const dragIndex = useRef<number | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !config) return;
    const nav = (config.navigation ?? {}) as { tabs?: NavTab[] };
    if (Array.isArray(nav.tabs) && nav.tabs.length > 0) setTabs(nav.tabs);
    seeded.current = true;
  }, [config]);

  const onDrop = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === target) return;
    setTabs((t) => {
      const next = [...t];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  };

  const patch = (id: string, p: Partial<NavTab>) =>
    setTabs((t) => t.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = async () => {
    try {
      const navigation = { ...(config?.navigation ?? {}), tabs };
      await updateConfig({ navigation }).unwrap();
      toast('Navigation published — manifest bumped');
    } catch {
      toast('Publish failed (is the backend running?)', 'error');
    }
  };

  const enabledTabs = tabs.filter((t) => t.enabled);

  return (
    <div>
      <PageHeader
        kicker="NAV"
        title="Navigation Builder"
        subtitle="Reorder the mobile bottom-tab bar — drag to reorder."
        actions={
          <Can permission="content:update">
            <Button size="sm" variant="primary" disabled={saving} onClick={() => void save()}>
              Publish
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardBody className="space-y-2 pt-4">
            {tabs.map((tab, i) => {
              const Icon = ICONS[tab.icon] ?? Home;
              return (
                <div
                  key={tab.id}
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className={`flex items-center gap-3 rounded-control border border-border bg-panel2 p-2.5 ${
                    tab.enabled ? '' : 'opacity-50'
                  }`}
                >
                  <GripVertical size={15} className="cursor-grab text-muted" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel text-gold">
                    <Icon size={16} />
                  </span>
                  <Input
                    value={tab.label}
                    onChange={(e) => patch(tab.id, { label: e.target.value })}
                    className="w-28"
                  />
                  <Input
                    value={tab.deepLink}
                    onChange={(e) => patch(tab.id, { deepLink: e.target.value })}
                    className="flex-1 font-mono text-[12px]"
                  />
                  <Toggle
                    checked={tab.enabled}
                    onChange={(v) => patch(tab.id, { enabled: v })}
                    label={`Enable ${tab.label}`}
                  />
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Phone preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 text-label uppercase text-muted">Preview</div>
          <div className="w-[260px] rounded-[28px] border-4 border-panel2 bg-bg p-3">
            <div className="flex h-[360px] items-end">
              <div className="flex w-full items-center justify-around rounded-2xl bg-panel py-2">
                {enabledTabs.map((tab) => {
                  const Icon = ICONS[tab.icon] ?? Home;
                  return (
                    <div key={tab.id} className="flex flex-col items-center gap-1">
                      <Icon size={18} className="text-gold" />
                      <span className="text-[9px] text-text2">{tab.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
