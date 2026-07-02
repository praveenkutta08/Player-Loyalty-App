import { BedDouble, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';

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
  Toggle,
  useToast,
} from '@/components/ui';

// Room-type catalog + amenities + digital-key config. The P1–P2 backend has no hotel-catalog
// endpoint (reservations + digital keys are player-side); this manages catalog config locally and
// is documented as pending a hotel-catalog API. Digital keys issue against real reservations.
interface RoomType {
  id: string;
  name: string;
  ratePerNight: number;
  available: number;
  occupancy: string;
}

const INITIAL: RoomType[] = [
  { id: 'r1', name: 'Deluxe King', ratePerNight: 189, available: 24, occupancy: '2 guests' },
  { id: 'r2', name: 'Luxe Suite', ratePerNight: 349, available: 8, occupancy: '4 guests' },
  { id: 'r3', name: 'High-Roller Villa', ratePerNight: 1200, available: 2, occupancy: '6 guests' },
];

const AMENITIES = ['Spa', 'Pool', 'Room service', 'Gym', 'Concierge', 'Parking'];

export function HotelScreen() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomType[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ratePerNight: '',
    available: '',
    occupancy: '2 guests',
  });

  const add = () => {
    setRooms((r) => [
      ...r,
      {
        id: `r${r.length + 1}-${form.name}`,
        name: form.name,
        ratePerNight: Number(form.ratePerNight),
        available: Number(form.available),
        occupancy: form.occupancy,
      },
    ]);
    toast(`Room type "${form.name}" added`);
    setForm({ name: '', ratePerNight: '', available: '', occupancy: '2 guests' });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        kicker="HTL"
        title="Hotel"
        subtitle="Room types, amenities and digital room keys."
        actions={
          <Can permission="reservations:update">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              Add room type
            </Button>
          </Can>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id}>
            <div className="h-24 rounded-t-card bg-gradient-to-br from-gold-bright to-gold-fill" />
            <CardBody>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[14px] font-bold text-text">{room.name}</span>
                <StatusPill tone={room.available > 5 ? 'green' : 'gold'}>
                  {room.available} left
                </StatusPill>
              </div>
              <div className="mb-2 text-[12px] text-muted">
                <BedDouble size={13} className="mr-1 inline" />
                {room.occupancy}
              </div>
              <div className="display text-[22px] font-semibold text-text">
                ${room.ratePerNight}
                <span className="text-[12px] font-normal text-muted"> / night</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Amenities" />
          <CardBody className="flex flex-wrap gap-2 pt-3">
            {AMENITIES.map((a) => (
              <StatusPill key={a} tone="neutral" dot={false} tag>
                {a}
              </StatusPill>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Digital Room Keys"
            subtitle="Issued against confirmed hotel bookings"
          />
          <CardBody className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-control bg-gold-dim text-gold">
                <KeyRound size={18} />
              </span>
              <div>
                <StatusPill tone="green">Enabled</StatusPill>
                <div className="mt-1 text-[12px] text-muted">Mobile key via the DigitalKeyPort</div>
              </div>
            </div>
            <Toggle checked onChange={() => {}} label="Digital keys" />
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add room type"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!form.name} onClick={add}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rate / night ($)">
              <Input
                type="number"
                value={form.ratePerNight}
                onChange={(e) => setForm({ ...form, ratePerNight: e.target.value })}
              />
            </Field>
            <Field label="Available">
              <Input
                type="number"
                value={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Occupancy">
            <Input
              value={form.occupancy}
              onChange={(e) => setForm({ ...form, occupancy: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
