import { GripVertical, Home, Layers, QrCode, Ticket, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardBody, CardHeader, Input, Toggle, useToast } from '@/components/ui';
import { useGetConfigQuery, useUpdateConfigMutation } from '@/features/casinos/configApi';
import { useUpdateAppearanceMutation } from '@/features/theme/appearanceApi';

// Navigation Builder — reorderable bottom-tab items, persisted into the tenant config's
// `navigation.tabs` blob (Option B default: Home, Offers, center Scan/Play, Account, More).
// P7.2 adds the "Bar style" picker (manifest `navigation.style`) — a VISUAL treatment only:
// elevation/radius/blur are fixed per-style presets, never free-form fields, and the Option B
// structure + center-action fallback are identical in both styles.
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

export const BAR_STYLES = [
  {
    key: 'editorial' as const,
    label: 'Editorial',
    hint: 'Classic docked bar, hairline top border, label-forward. The default.',
  },
  {
    key: 'floatingPill' as const,
    label: 'Floating Pill',
    hint: 'Detached pill above the home indicator; fixed radius/elevation preset.',
  },
];
export type BarStyle = (typeof BAR_STYLES)[number]['key'];

export function NavigationBuilder() {
  const { toast } = useToast();
  const { data: config } = useGetConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateConfigMutation();
  const [updateAppearance] = useUpdateAppearanceMutation();

  const [tabs, setTabs] = useState<NavTab[]>(DEFAULT_TABS);
  const [barStyle, setBarStyle] = useState<BarStyle>('editorial');
  const dragIndex = useRef<number | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !config) return;
    const nav = (config.navigation ?? {}) as { tabs?: NavTab[]; style?: string };
    if (Array.isArray(nav.tabs) && nav.tabs.length > 0) setTabs(nav.tabs);
    if (nav.style === 'floatingPill' || nav.style === 'editorial') setBarStyle(nav.style);
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
      // Bar style publishes through the branding-gated appearance channel (P7.1).
      if (((config?.navigation ?? {}) as { style?: string }).style !== barStyle) {
        await updateAppearance({ navigation_style: barStyle }).unwrap();
      }
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
        <div className="space-y-5">
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

          {/* Bar style (P7.2) — a visual skin only; structure & center action are unchanged. */}
          <Can permission="branding:update">
            <Card>
              <CardHeader
                title="Bar style"
                subtitle="Visual treatment only — tab structure and the Scan/Play fallback never change."
              />
              <CardBody className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                {BAR_STYLES.map((style) => (
                  <button
                    key={style.key}
                    onClick={() => setBarStyle(style.key)}
                    data-testid={`bar-style-${style.key}`}
                    className={`rounded-card border p-3 text-left ${
                      barStyle === style.key ? 'border-gold bg-gold-dim' : 'border-border bg-panel2'
                    }`}
                  >
                    <BarStylePreview style={style.key} tabs={enabledTabs} />
                    <div className="mt-2 text-[13px] font-semibold text-text">{style.label}</div>
                    <div className="text-[11px] text-muted">{style.hint}</div>
                  </button>
                ))}
              </CardBody>
            </Card>
          </Can>
        </div>

        {/* Phone preview — renders the CURRENT tabs in the selected bar style. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 text-label uppercase text-muted">Preview</div>
          <div className="w-[260px] rounded-[28px] border-4 border-panel2 bg-bg p-3">
            <div className="flex h-[360px] items-end justify-center">
              <BarStylePreview style={barStyle} tabs={enabledTabs} large />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The two fixed style presets rendered with the tenant's current tabs. */
function BarStylePreview({
  style,
  tabs,
  large = false,
}: {
  style: BarStyle;
  tabs: NavTab[];
  large?: boolean;
}) {
  const floating = style === 'floatingPill';
  return (
    <div className={`w-full ${floating ? 'px-3 pb-2' : ''}`}>
      <div
        className={
          floating
            ? 'flex w-full items-center justify-around rounded-full border border-border bg-panel py-2 shadow-md'
            : 'flex w-full items-center justify-around border-t border-border bg-panel py-2'
        }
      >
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon] ?? Home;
          return (
            <div key={tab.id} className="flex flex-col items-center gap-1">
              <Icon size={large ? 18 : 13} className="text-gold" />
              {(!floating || large) && (
                <span className={`${large ? 'text-[9px]' : 'text-[7px]'} text-text2`}>
                  {tab.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
