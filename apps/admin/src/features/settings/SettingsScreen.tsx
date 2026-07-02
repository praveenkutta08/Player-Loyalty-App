import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  StatusPill,
  Tabs,
  Toggle,
  useToast,
} from '@/components/ui';

// Integrations map to our adapter ports. The P1–P2 backend has no platform-config/credentials
// endpoint, so these are managed locally and documented as pending a platform-config API.
const INTEGRATIONS = [
  { vendor: 'IGT Gaming', port: 'CMP → gaming', connected: true },
  { vendor: 'Agilysys PMS', port: 'reservations', connected: true },
  { vendor: 'Comarch', port: 'LoyaltyPort', connected: true },
  { vendor: 'Stripe', port: 'PaymentPort', connected: false },
  { vendor: 'Twilio', port: 'push / SMS', connected: true },
  { vendor: 'Okta', port: 'SSO', connected: false },
  { vendor: 'Mapbox', port: 'GeoPort', connected: true },
];

export function SettingsScreen() {
  const [tab, setTab] = useState('integrations');
  return (
    <div>
      <PageHeader
        kicker="SET"
        title="Settings & Integrations"
        subtitle="Adapter integrations, API keys and security."
      />
      <div className="mb-5">
        <Tabs
          items={[
            { key: 'integrations', label: 'Integrations' },
            { key: 'keys', label: 'API Keys' },
            { key: 'security', label: 'Security & Auth' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'integrations' && <Integrations />}
      {tab === 'keys' && <ApiKeys />}
      {tab === 'security' && <Security />}
    </div>
  );
}

function Integrations() {
  const { toast } = useToast();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {INTEGRATIONS.map((it) => (
        <Card key={it.vendor}>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-text">{it.vendor}</span>
              <StatusPill tone={it.connected ? 'green' : 'neutral'}>
                {it.connected ? 'Connected' : 'Off'}
              </StatusPill>
            </div>
            <div className="text-[11px] text-muted">{it.port}</div>
            <Can permission="platform_config:read">
              <Field label="API credential">
                <Input type="password" defaultValue="••••••••••••" />
              </Field>
              <button
                className="text-[12px] text-gold hover:underline"
                onClick={() => toast(`${it.vendor} credentials saved`)}
              >
                Save
              </button>
            </Can>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function ApiKeys() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const keys = [
    { label: 'Publishable key', value: 'pk_live_9f2a…c71d' },
    { label: 'Secret key', value: 'sk_live_••••••••••••' },
    { label: 'Webhook secret', value: 'whsec_••••••••' },
  ];
  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopied(label);
    toast('Copied');
  };
  return (
    <Card>
      <CardHeader title="API Keys" subtitle="Masked; copy to reveal in clipboard" />
      <CardBody className="space-y-3 pt-3">
        {keys.map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-3 rounded-control bg-panel2 px-3 py-2.5"
          >
            <span className="w-40 text-[13px] text-text2">{k.label}</span>
            <span className="flex-1 font-mono text-[12px] text-muted">{k.value}</span>
            <button
              className="inline-flex items-center gap-1 text-[12px] text-gold"
              onClick={() => copy(k.label, k.value)}
            >
              {copied === k.label ? <Check size={13} /> : <Copy size={13} />} Copy
            </button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function Security() {
  const { toast } = useToast();
  const [sec, setSec] = useState({ sso: false, mfa: true, ipAllowlist: '', sessionTimeout: '30' });
  return (
    <Card>
      <CardHeader title="Security & Auth" />
      <CardBody className="space-y-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text2">Single sign-on (SSO)</span>
          <Toggle checked={sec.sso} onChange={(v) => setSec({ ...sec, sso: v })} label="SSO" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-text2">Require MFA</span>
          <Toggle checked={sec.mfa} onChange={(v) => setSec({ ...sec, mfa: v })} label="MFA" />
        </div>
        <Field label="IP allowlist (comma-separated)">
          <Input
            value={sec.ipAllowlist}
            onChange={(e) => setSec({ ...sec, ipAllowlist: e.target.value })}
            placeholder="203.0.113.0/24"
          />
        </Field>
        <Field label="Session timeout (min)">
          <Input
            type="number"
            value={sec.sessionTimeout}
            onChange={(e) => setSec({ ...sec, sessionTimeout: e.target.value })}
          />
        </Field>
        <Can permission="platform_config:read">
          <button
            className="text-[12px] text-gold hover:underline"
            onClick={() => toast('Security settings saved')}
          >
            Save security settings
          </button>
        </Can>
      </CardBody>
    </Card>
  );
}
