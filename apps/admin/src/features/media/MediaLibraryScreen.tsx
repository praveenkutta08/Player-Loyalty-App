import { FileText, Film, Image as ImageIcon, LayoutGrid, List, Search, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { usePresignMediaMutation } from './mediaApi';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardBody, Input, Select, StatusPill, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';

type AssetType = 'IMG' | 'VID' | 'PDF' | 'SVG';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  sizeKb: number;
  usage: number;
  folder: string;
}

const FOLDERS = ['All', 'Branding', 'Promotions', 'Games', 'Hotel'];

// Client-side asset catalog (no media-list endpoint in P1–P2). Uploads are real via presign.
const DEMO: Asset[] = [
  { id: 'a1', name: 'hero-welcome.jpg', type: 'IMG', sizeKb: 420, usage: 3, folder: 'Branding' },
  { id: 'a2', name: 'logo-gold.svg', type: 'SVG', sizeKb: 12, usage: 8, folder: 'Branding' },
  { id: 'a3', name: 'promo-weekend.jpg', type: 'IMG', sizeKb: 380, usage: 2, folder: 'Promotions' },
  { id: 'a4', name: 'jackpot-teaser.mp4', type: 'VID', sizeKb: 8400, usage: 1, folder: 'Games' },
  { id: 'a5', name: 'terms-2026.pdf', type: 'PDF', sizeKb: 96, usage: 5, folder: 'Branding' },
  { id: 'a6', name: 'suite-gallery.jpg', type: 'IMG', sizeKb: 512, usage: 4, folder: 'Hotel' },
];

const TYPE_ICON = { IMG: ImageIcon, VID: Film, PDF: FileText, SVG: ImageIcon };
const TYPE_TONE = { IMG: 'blue', VID: 'purple', PDF: 'red', SVG: 'green' } as const;

function extType(name: string): AssetType {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'mp4' || ext === 'mov' || ext === 'webm') return 'VID';
  if (ext === 'pdf') return 'PDF';
  if (ext === 'svg') return 'SVG';
  return 'IMG';
}

export function MediaLibraryScreen() {
  const { toast } = useToast();
  const [presign] = usePresignMediaMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>(DEMO);
  const [folder, setFolder] = useState('All');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = assets.filter(
    (a) =>
      (folder === 'All' || a.folder === folder) &&
      (typeFilter === 'all' || a.type === typeFilter) &&
      (!search || a.name.toLowerCase().includes(search.toLowerCase())),
  );

  const usedKb = assets.reduce((s, a) => s + a.sizeKb, 0);
  const quotaKb = 5 * 1024 * 1024; // 5 GB
  const usedPct = Math.min(100, (usedKb / quotaKb) * 100);

  const onUpload = async (file: File) => {
    try {
      const res = await presign({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      }).unwrap();
      await fetch(res.upload_url, { method: 'PUT', body: file }).catch(() => undefined);
      setAssets((a) => [
        {
          id: res.key,
          name: file.name,
          type: extType(file.name),
          sizeKb: Math.round(file.size / 1024),
          usage: 0,
          folder: folder === 'All' ? 'Branding' : folder,
        },
        ...a,
      ]);
      toast('Uploaded');
    } catch {
      toast('Upload failed (is the backend running?)', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        kicker="MED"
        title="Media Library"
        subtitle="Assets referenced by content, theme and the homepage."
        actions={
          <Can permission="content:update">
            <Button
              variant="primary"
              size="sm"
              icon={<Upload size={16} />}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
          </Can>
        }
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUpload(f);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_1fr]">
        {/* Folder rail + storage */}
        <div className="space-y-4">
          <Card>
            <CardBody className="pt-4">
              <div className="kicker mb-2">Folders</div>
              <div className="space-y-1">
                {FOLDERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFolder(f)}
                    className={cn(
                      'block w-full rounded-control px-3 py-1.5 text-left text-[13px]',
                      folder === f ? 'bg-gold-dim text-gold' : 'text-text2 hover:bg-panel2',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="pt-4">
              <div className="kicker mb-2">Storage</div>
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full bg-gold-fill"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="text-[11px] text-muted">{(usedKb / 1024).toFixed(1)} MB of 5 GB</div>
            </CardBody>
          </Card>
        </div>

        {/* Toolbar + grid */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="w-56">
              <Input
                placeholder="Search assets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={15} />}
              />
            </div>
            <div className="w-36">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="IMG">Images</option>
                <option value="VID">Video</option>
                <option value="PDF">PDF</option>
                <option value="SVG">SVG</option>
              </Select>
            </div>
            <div className="ml-auto flex gap-1">
              <button
                className={cn(
                  'rounded-control border border-border p-2',
                  view === 'grid' ? 'text-gold' : 'text-muted',
                )}
                onClick={() => setView('grid')}
                aria-label="Grid"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={cn(
                  'rounded-control border border-border p-2',
                  view === 'list' ? 'text-gold' : 'text-muted',
                )}
                onClick={() => setView('list')}
                aria-label="List"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {view === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((a) => {
                const Icon = TYPE_ICON[a.type];
                return (
                  <Card key={a.id}>
                    <div className="relative flex h-24 items-center justify-center rounded-t-card bg-panel2">
                      <Icon size={26} className="text-muted" />
                      <span className="absolute left-2 top-2">
                        <StatusPill tone={TYPE_TONE[a.type]} dot={false} tag>
                          {a.type}
                        </StatusPill>
                      </span>
                    </div>
                    <CardBody className="p-3">
                      <div className="truncate text-[12px] font-semibold text-text">{a.name}</div>
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>{(a.sizeKb / 1024).toFixed(1)} MB</span>
                        <span>{a.usage} uses</span>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardBody className="divide-y divide-border-soft p-0">
                {filtered.map((a) => {
                  const Icon = TYPE_ICON[a.type];
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Icon size={16} className="text-muted" />
                      <span className="flex-1 text-[13px] text-text">{a.name}</span>
                      <StatusPill tone={TYPE_TONE[a.type]} dot={false} tag>
                        {a.type}
                      </StatusPill>
                      <span className="w-20 text-right font-mono text-[11px] text-muted">
                        {(a.sizeKb / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
