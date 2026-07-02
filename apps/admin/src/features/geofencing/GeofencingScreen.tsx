import { MapPin, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  useCreateBeaconMutation,
  useCreateTriggerMutation,
  useCreateZoneMutation,
  useDeleteTriggerMutation,
  useDeleteZoneMutation,
  useListTriggersQuery,
  useListZonesQuery,
  type Trigger,
} from './geoApi';
import { MapView, type DraftPoint } from './MapView';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  StatusPill,
  Table,
  Tabs,
  useToast,
  type Column,
} from '@/components/ui';
import { useListOffersQuery } from '@/features/catalog/catalogApi';
import { SEGMENTS } from '@/features/shared/segments';

export function GeofencingScreen() {
  const [tab, setTab] = useState('zones');
  return (
    <div>
      <PageHeader
        kicker="GEO"
        title="Geofencing"
        subtitle="Define zones on the map and attach location triggers."
      />
      <div className="mb-5">
        <Tabs
          items={[
            { key: 'zones', label: 'Zones' },
            { key: 'triggers', label: 'Triggers' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'zones' ? <ZonesTab /> : <TriggersTab />}
    </div>
  );
}

function ZonesTab() {
  const { toast } = useToast();
  const { data: zones = [] } = useListZonesQuery();
  const [createZone] = useCreateZoneMutation();
  const [deleteZone] = useDeleteZoneMutation();
  const [createBeacon] = useCreateBeaconMutation();

  const [draft, setDraft] = useState<DraftPoint | null>(null);
  const [name, setName] = useState('');
  const [beacon, setBeacon] = useState({ zone_id: '', uuid_: '', major: '0', minor: '0' });

  const addZone = async () => {
    if (!draft || !name) return;
    try {
      await createZone({
        name,
        type: 'gps',
        center_lat: draft.lat,
        center_lng: draft.lng,
        radius_m: draft.radius,
        is_active: true,
      }).unwrap();
      toast(`Zone "${name}" created`);
      setName('');
      setDraft(null);
    } catch {
      toast('Create failed (is the backend running?)', 'error');
    }
  };

  const registerBeacon = async () => {
    if (!beacon.zone_id || !beacon.uuid_) return;
    try {
      await createBeacon({
        zone_id: beacon.zone_id,
        uuid_: beacon.uuid_,
        major: Number(beacon.major),
        minor: Number(beacon.minor),
      }).unwrap();
      toast('Beacon registered');
      setBeacon({ zone_id: '', uuid_: '', major: '0', minor: '0' });
    } catch {
      toast('Beacon failed', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <MapView
          zones={zones}
          draft={draft}
          onPick={(lng, lat) => setDraft({ lng, lat, radius: draft?.radius ?? 40 })}
        />
        <p className="mt-2 text-[12px] text-muted">
          Click the map to drop a point, then set a radius and name to create a GPS zone.
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="New zone" />
          <CardBody className="space-y-3 pt-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Steakhouse"
              />
            </Field>
            <div>
              <div className="mb-1 flex items-center justify-between text-label uppercase text-muted">
                <span>Radius</span>
                <span className="font-mono text-text2">{draft?.radius ?? 40} m</span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={draft?.radius ?? 40}
                disabled={!draft}
                onChange={(e) =>
                  setDraft(draft ? { ...draft, radius: Number(e.target.value) } : draft)
                }
                className="w-full accent-[var(--gold-fill)]"
              />
            </div>
            <div className="text-[12px] text-muted">
              {draft ? (
                <span className="font-mono">
                  {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                </span>
              ) : (
                'No point selected'
              )}
            </div>
            <Can permission="geofence_zones:create">
              <Button
                variant="primary"
                className="w-full"
                disabled={!draft || !name}
                onClick={() => void addZone()}
              >
                Create zone
              </Button>
            </Can>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Zones" />
          <CardBody className="pt-3">
            {zones.length === 0 && <p className="text-[12px] text-muted">No zones yet.</p>}
            <div className="space-y-2">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between rounded-control bg-panel2 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-gold" />
                    <div>
                      <div className="text-[13px] font-semibold text-text">{z.name}</div>
                      <div className="font-mono text-[11px] text-muted">{z.radius_m ?? '—'} m</div>
                    </div>
                  </div>
                  <Can permission="geofence_zones:delete">
                    <button
                      className="text-muted hover:text-red"
                      onClick={async () => {
                        try {
                          await deleteZone(z.id).unwrap();
                          toast('Zone deleted');
                        } catch {
                          toast('Delete failed', 'error');
                        }
                      }}
                      aria-label="Delete zone"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Register beacon" subtitle="iBeacon → zone" />
          <CardBody className="space-y-3 pt-3">
            <Field label="Zone">
              <Select
                value={beacon.zone_id}
                onChange={(e) => setBeacon({ ...beacon, zone_id: e.target.value })}
              >
                <option value="">Select zone…</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="UUID">
              <Input
                value={beacon.uuid_}
                onChange={(e) => setBeacon({ ...beacon, uuid_: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Major">
                <Input
                  type="number"
                  value={beacon.major}
                  onChange={(e) => setBeacon({ ...beacon, major: e.target.value })}
                />
              </Field>
              <Field label="Minor">
                <Input
                  type="number"
                  value={beacon.minor}
                  onChange={(e) => setBeacon({ ...beacon, minor: e.target.value })}
                />
              </Field>
            </div>
            <Can permission="geofence_zones:create">
              <Button
                className="w-full"
                disabled={!beacon.zone_id || !beacon.uuid_}
                onClick={() => void registerBeacon()}
              >
                Register
              </Button>
            </Can>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function TriggersTab() {
  const { toast } = useToast();
  const { data: zones = [] } = useListZonesQuery();
  const { data: triggers = [] } = useListTriggersQuery();
  const { data: offers = [] } = useListOffersQuery();
  const [createTrigger] = useCreateTriggerMutation();
  const [deleteTrigger] = useDeleteTriggerMutation();

  const [form, setForm] = useState({
    zone_id: '',
    name: '',
    event: 'dwell',
    dwellMinutes: '10',
    offer_id: '',
    segment: 'all',
    frequency_cap_per_day: '1',
    quiet_hours_start: '',
    quiet_hours_end: '',
  });

  const applyTemplate = () => {
    const steakhouse = zones.find((z) => z.name.toLowerCase().includes('steak'));
    setForm({
      zone_id: steakhouse?.id ?? zones[0]?.id ?? '',
      name: 'Steakhouse dwell',
      event: 'dwell',
      dwellMinutes: '10',
      offer_id: offers[0]?.id ?? '',
      segment: 'all',
      frequency_cap_per_day: '1',
      quiet_hours_start: '',
      quiet_hours_end: '',
    });
  };

  const create = async () => {
    if (!form.zone_id || !form.name) return;
    try {
      await createTrigger({
        zone_id: form.zone_id,
        name: form.name,
        event: form.event as 'enter' | 'exit' | 'dwell',
        dwell_seconds: form.event === 'dwell' ? Number(form.dwellMinutes) * 60 : null,
        offer_id: form.offer_id || null,
        segment: form.segment === 'all' ? null : form.segment,
        frequency_cap_per_day: form.frequency_cap_per_day
          ? Number(form.frequency_cap_per_day)
          : null,
        quiet_hours_start: form.quiet_hours_start ? Number(form.quiet_hours_start) : null,
        quiet_hours_end: form.quiet_hours_end ? Number(form.quiet_hours_end) : null,
        is_active: true,
      }).unwrap();
      toast('Trigger created');
      setForm({ ...form, name: '' });
    } catch {
      toast('Create failed (is the backend running?)', 'error');
    }
  };

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? '—';

  const columns: Column<Trigger>[] = [
    {
      key: 'name',
      header: 'Trigger',
      render: (t) => (
        <div>
          <div className="font-semibold text-text">{t.name}</div>
          <div className="text-[12px] text-muted">{zoneName(t.zone_id)}</div>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (t) => (
        <StatusPill tone="blue" dot={false} tag>
          {t.event}
          {t.event === 'dwell' && t.dwell_seconds ? ` ${t.dwell_seconds / 60}m` : ''}
        </StatusPill>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (t) => <span className="text-text2">{t.segment ?? 'all'}</span>,
    },
    {
      key: 'cap',
      header: 'Cap/day',
      align: 'right',
      render: (t) => <span className="font-mono text-text2">{t.frequency_cap_per_day ?? '∞'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <Can permission="location_triggers:delete">
          <button
            className="text-muted hover:text-red"
            onClick={async () => {
              try {
                await deleteTrigger(t.id).unwrap();
                toast('Trigger deleted');
              } catch {
                toast('Delete failed', 'error');
              }
            }}
            aria-label="Delete"
          >
            <Trash2 size={15} />
          </button>
        </Can>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      <Table columns={columns} rows={triggers} rowKey={(t) => t.id} empty="No triggers yet." />

      <Card>
        <CardHeader
          title="Rule builder"
          action={
            <button
              onClick={applyTemplate}
              className="inline-flex items-center gap-1 text-[12px] text-gold hover:underline"
            >
              <Sparkles size={13} /> Steakhouse template
            </button>
          }
        />
        <CardBody className="space-y-3 pt-3">
          <Field label="Zone">
            <Select
              value={form.zone_id}
              onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
            >
              <option value="">Select zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event">
              <Select
                value={form.event}
                onChange={(e) => setForm({ ...form, event: e.target.value })}
              >
                <option value="enter">Enter</option>
                <option value="exit">Exit</option>
                <option value="dwell">Dwell</option>
              </Select>
            </Field>
            {form.event === 'dwell' && (
              <Field label="Dwell (min)">
                <Input
                  type="number"
                  value={form.dwellMinutes}
                  onChange={(e) => setForm({ ...form, dwellMinutes: e.target.value })}
                />
              </Field>
            )}
          </div>
          <Field label="Offer">
            <Select
              value={form.offer_id}
              onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
            >
              <option value="">No offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Cap / day">
              <Input
                type="number"
                value={form.frequency_cap_per_day}
                onChange={(e) => setForm({ ...form, frequency_cap_per_day: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quiet start (hr)">
              <Input
                type="number"
                value={form.quiet_hours_start}
                onChange={(e) => setForm({ ...form, quiet_hours_start: e.target.value })}
                placeholder="22"
              />
            </Field>
            <Field label="Quiet end (hr)">
              <Input
                type="number"
                value={form.quiet_hours_end}
                onChange={(e) => setForm({ ...form, quiet_hours_end: e.target.value })}
                placeholder="8"
              />
            </Field>
          </div>
          <Can permission="location_triggers:create">
            <Button
              variant="primary"
              className="w-full"
              disabled={!form.zone_id || !form.name}
              onClick={() => void create()}
            >
              Create trigger
            </Button>
          </Can>
        </CardBody>
      </Card>
    </div>
  );
}
