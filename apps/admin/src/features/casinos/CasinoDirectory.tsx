import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatUsd, propertyStats } from './demoStats';
import { Monogram } from './Monogram';

import type { TenantOut } from '@/auth/types';

import { useListTenantsQuery } from '@/auth/authApi';
import { Input, Select, StatusPill, Table, type Column, type Tone } from '@/components/ui';

const STATUS_TONE: Record<string, Tone> = {
  active: 'green',
  draft: 'gold',
  suspended: 'red',
  inactive: 'neutral',
};

export function CasinoDirectory({ onOpen }: { onOpen: (tenant: TenantOut) => void }) {
  const { data: tenants = [], isLoading } = useListTenantsQuery();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const rows = useMemo(
    () =>
      tenants.filter((t) => {
        const matchesSearch =
          !search ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || t.status === status;
        return matchesSearch && matchesStatus;
      }),
    [tenants, search, status],
  );

  const columns: Column<TenantOut>[] = [
    {
      key: 'property',
      header: 'Property',
      render: (t) => (
        <div className="flex items-center gap-3">
          <Monogram name={t.name} size={36} />
          <div>
            <div className="font-semibold text-text">{t.name}</div>
            <div className="font-mono text-[11px] text-muted">{t.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusPill tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status}</StatusPill>,
    },
    {
      key: 'members',
      header: 'Members',
      align: 'right',
      render: (t) => (
        <span className="font-mono text-text2">{propertyStats(t.id).members.toLocaleString()}</span>
      ),
    },
    {
      key: 'rev',
      header: 'Rev · MTD',
      align: 'right',
      render: (t) => (
        <span className="font-mono font-semibold text-text">
          {formatUsd(propertyStats(t.id).revenueMtdCents)}
        </span>
      ),
    },
    {
      key: 'app',
      header: 'App',
      align: 'right',
      render: (t) => (
        <span className="font-mono text-[12px] text-muted">v{propertyStats(t.id).appVersion}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search casinos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
          <SlidersHorizontal size={14} />
          {rows.length} of {tenants.length}
        </span>
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        onRowClick={onOpen}
        empty={isLoading ? 'Loading casinos…' : 'No casinos match your filters.'}
      />
    </div>
  );
}
