import { Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Can } from '@/auth/Can';
import { PageHeader } from '@/components/PageHeader';
import { Button, StatusPill, Table, useToast, type Column } from '@/components/ui';
import {
  useCreateOfferMutation,
  useDeleteOfferMutation,
  useListOffersQuery,
  usePublishOfferMutation,
  useUpdateOfferMutation,
  type Offer,
} from '@/features/catalog/catalogApi';
import { CatalogForm, type CatalogFormValues } from '@/features/catalog/CatalogForm';
import { perf } from '@/features/catalog/performance';
import { STATUS_TONE } from '@/features/shared/segments';

export function OffersScreen() {
  const { toast } = useToast();
  const { data: offers = [], isLoading } = useListOffersQuery();
  const [createOffer] = useCreateOfferMutation();
  const [updateOffer] = useUpdateOfferMutation();
  const [publishOffer] = usePublishOfferMutation();
  const [deleteOffer] = useDeleteOfferMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);

  const save = async (values: CatalogFormValues) => {
    try {
      if (editing) await updateOffer({ id: editing.id, body: values }).unwrap();
      else await createOffer(values).unwrap();
      toast(editing ? 'Offer updated' : 'Offer created');
      setOpen(false);
    } catch {
      toast('Save failed (is the backend running?)', 'error');
    }
  };

  const columns: Column<Offer>[] = [
    {
      key: 'title',
      header: 'Offer',
      render: (o) => (
        <div>
          <div className="font-semibold text-text">{o.title}</div>
          <div className="text-[12px] text-muted">{o.segment ?? 'all'} segment</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusPill tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.status}</StatusPill>,
    },
    {
      key: 'window',
      header: 'Schedule',
      render: (o) => (
        <span className="font-mono text-[12px] text-muted">
          {o.start_at ? new Date(o.start_at).toLocaleDateString() : '—'} →{' '}
          {o.end_at ? new Date(o.end_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'redeemed',
      header: 'Redeemed',
      align: 'right',
      render: (o) => (
        <span className="font-mono text-text2">{perf(o.id).redeemed.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-1.5">
          <Can permission="offers:update">
            <button
              className="text-muted hover:text-text"
              onClick={() => {
                setEditing(o);
                setOpen(true);
              }}
              aria-label="Edit"
            >
              <Pencil size={15} />
            </button>
          </Can>
          <Can permission="offers:publish">
            {o.status !== 'published' && (
              <button
                className="text-muted hover:text-green"
                onClick={async () => {
                  try {
                    await publishOffer(o.id).unwrap();
                    toast('Published');
                  } catch {
                    toast('Publish failed', 'error');
                  }
                }}
                aria-label="Publish"
              >
                <Send size={15} />
              </button>
            )}
          </Can>
          <Can permission="offers:delete">
            <button
              className="text-muted hover:text-red"
              onClick={async () => {
                try {
                  await deleteOffer(o.id).unwrap();
                  toast('Deleted');
                } catch {
                  toast('Delete failed', 'error');
                }
              }}
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="OFR"
        title="Offers"
        subtitle="Redeemable offers, separate from promotions."
        actions={
          <Can permission="offers:create">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              New offer
            </Button>
          </Can>
        }
      />

      <Table
        columns={columns}
        rows={offers}
        rowKey={(o) => o.id}
        empty={isLoading ? 'Loading…' : 'No offers yet.'}
      />

      <CatalogForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        noun="offer"
        onSave={save}
      />
    </div>
  );
}
