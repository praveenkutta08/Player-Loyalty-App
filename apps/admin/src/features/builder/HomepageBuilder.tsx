import { GripVertical, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardBody, Field, Input, useToast } from '@/components/ui';
import { useGetConfigQuery, useUpdateConfigMutation } from '@/features/casinos/configApi';

// Homepage Builder — composes the mobile home module list, persisted into the tenant config's
// `navigation.home` blob (surfaced in the manifest; manifest-driven theming, GOLDEN RULE #5).
const WIDGETS = [
  'Hero',
  'Carousel',
  'Promotions',
  'Loyalty Card',
  'Events',
  'Dining',
  'Hotel',
  'Video',
  'News',
  'Quick Actions',
  'Personalized',
  'Recommends',
];

interface Module {
  id: string;
  type: string;
  title: string;
}

export function HomepageBuilder() {
  const { toast } = useToast();
  const { data: config } = useGetConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateConfigMutation();

  const [modules, setModules] = useState<Module[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const seeded = useRef(false);
  const counter = useRef(0);

  // Seed from persisted home layout once.
  useEffect(() => {
    if (seeded.current || !config) return;
    const nav = (config.navigation ?? {}) as { home?: Module[] };
    if (Array.isArray(nav.home)) setModules(nav.home);
    seeded.current = true;
  }, [config]);

  const addWidget = (type: string) => {
    counter.current += 1;
    setModules((m) => [...m, { id: `${type}-${counter.current}`, type, title: type }]);
  };

  const removeModule = (id: string) => {
    setModules((m) => m.filter((x) => x.id !== id));
    if (selected === id) setSelected(null);
  };

  const onDrop = (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === targetIndex) return;
    setModules((m) => {
      const next = [...m];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
  };

  const publish = async () => {
    try {
      const navigation = { ...(config?.navigation ?? {}), home: modules };
      await updateConfig({ navigation }).unwrap();
      toast('Home layout published — manifest bumped');
    } catch {
      toast('Publish failed (is the backend running?)', 'error');
    }
  };

  const selectedModule = modules.find((m) => m.id === selected);

  return (
    <div>
      <PageHeader
        kicker="HPB"
        title="Homepage Builder"
        subtitle="Compose the mobile home screen — drag widgets onto the canvas."
        actions={
          <Can permission="content:update">
            <Button size="sm" variant="primary" disabled={saving} onClick={() => void publish()}>
              Publish
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_260px]">
        {/* Palette */}
        <Card>
          <CardBody className="pt-4">
            <div className="kicker mb-2">Widgets</div>
            <div className="grid grid-cols-2 gap-2">
              {WIDGETS.map((w) => (
                <button
                  key={w}
                  draggable
                  onDragStart={() => (dragIndex.current = null)}
                  onClick={() => addWidget(w)}
                  className="flex items-center justify-center gap-1 rounded-control border border-border bg-panel2 px-2 py-3 text-center text-[11px] font-semibold text-text2 hover:border-gold hover:text-gold"
                  title={`Add ${w}`}
                >
                  <Plus size={12} /> {w}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Phone canvas */}
        <div className="flex justify-center">
          <div className="w-[300px] rounded-[28px] border-4 border-panel2 bg-bg p-3">
            <div className="mb-2 flex justify-center">
              <span className="h-1.5 w-16 rounded-full bg-panel2" />
            </div>
            <div className="space-y-2">
              {modules.length === 0 && (
                <div className="rounded-card border border-dashed border-border p-8 text-center text-[12px] text-muted">
                  Click or drag widgets to build the home screen.
                </div>
              )}
              {modules.map((m, i) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  onClick={() => setSelected(m.id)}
                  className={`flex items-center gap-2 rounded-card border p-3 ${
                    selected === m.id ? 'border-gold bg-gold-dim' : 'border-border bg-panel'
                  }`}
                >
                  <GripVertical size={14} className="cursor-grab text-muted" />
                  <span className="flex-1 text-[12px] font-semibold text-text">{m.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModule(m.id);
                    }}
                    className="text-muted hover:text-red"
                    aria-label="Remove"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Properties */}
        <Card>
          <CardBody className="pt-4">
            <div className="kicker mb-2">Properties</div>
            {selectedModule ? (
              <div className="space-y-3">
                <Field label="Widget">
                  <Input value={selectedModule.type} disabled />
                </Field>
                <Field label="Headline">
                  <Input
                    value={selectedModule.title}
                    onChange={(e) =>
                      setModules((m) =>
                        m.map((x) =>
                          x.id === selectedModule.id ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            ) : (
              <p className="text-[12px] text-muted">Select a widget to edit its properties.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
