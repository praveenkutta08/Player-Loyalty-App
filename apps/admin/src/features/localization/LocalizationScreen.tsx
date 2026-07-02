import { Plus } from 'lucide-react';
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
  Select,
  Table,
  useToast,
  type Column,
} from '@/components/ui';

// Localization config. No localization endpoint in the P1–P2 backend; managed locally and
// documented as pending. Feeds the mobile app's language options + regional formats.
interface Language {
  code: string;
  name: string;
  flag: string;
  progress: number;
}

const INITIAL: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', progress: 100 },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', progress: 82 },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', progress: 64 },
  { code: 'fr', name: 'French', flag: '🇫🇷', progress: 40 },
];

export function LocalizationScreen() {
  const { toast } = useToast();
  const [langs, setLangs] = useState<Language[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', flag: '🏳️' });
  const [regional, setRegional] = useState({
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    firstDay: 'Sunday',
    numberFormat: '1,234.56',
  });

  const columns: Column<Language>[] = [
    {
      key: 'lang',
      header: 'Language',
      render: (l) => (
        <span className="flex items-center gap-2 font-semibold text-text">
          <span className="text-[16px]">{l.flag}</span> {l.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (l) => <span className="font-mono text-[12px] text-muted">{l.code}</span>,
    },
    {
      key: 'progress',
      header: 'Translation',
      render: (l) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-gold-fill" style={{ width: `${l.progress}%` }} />
          </div>
          <span className="font-mono text-[12px] text-text2">{l.progress}%</span>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="LOC"
        title="Localization"
        subtitle="Languages and regional formats for the app."
        actions={
          <Can permission="content:update">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              Add language
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Table columns={columns} rows={langs} rowKey={(l) => l.code} />

        <Card>
          <CardHeader title="Regional Formats" />
          <CardBody className="space-y-3 pt-3">
            <Field label="Currency">
              <Select
                value={regional.currency}
                onChange={(e) => setRegional({ ...regional, currency: e.target.value })}
              >
                {['USD', 'EUR', 'GBP', 'CNY'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Timezone">
              <Input
                value={regional.timezone}
                onChange={(e) => setRegional({ ...regional, timezone: e.target.value })}
              />
            </Field>
            <Field label="Date format">
              <Select
                value={regional.dateFormat}
                onChange={(e) => setRegional({ ...regional, dateFormat: e.target.value })}
              >
                {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="First day of week">
              <Select
                value={regional.firstDay}
                onChange={(e) => setRegional({ ...regional, firstDay: e.target.value })}
              >
                {['Sunday', 'Monday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Can permission="content:update">
              <Button size="sm" className="w-full" onClick={() => toast('Regional formats saved')}>
                Save formats
              </Button>
            </Can>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add language"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!form.name || !form.code}
              onClick={() => {
                setLangs((l) => [...l, { ...form, progress: 0 }]);
                toast(`${form.name} added`);
                setForm({ name: '', code: '', flag: '🏳️' });
                setOpen(false);
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="de"
              />
            </Field>
          </div>
          <Field label="Flag emoji">
            <Input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
