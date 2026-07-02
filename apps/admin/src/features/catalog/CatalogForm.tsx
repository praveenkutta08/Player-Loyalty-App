import { useState } from 'react';

import type { Offer, OfferCreate } from './catalogApi';

import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { SEGMENTS } from '@/features/shared/segments';

export interface CatalogFormValues extends OfferCreate {
  title: string;
}

function toForm(offer: Offer | null): CatalogFormValues {
  return {
    title: offer?.title ?? '',
    description: offer?.description ?? '',
    image_url: offer?.image_url ?? '',
    segment: offer?.segment ?? 'all',
    start_at: offer?.start_at ?? null,
    end_at: offer?.end_at ?? null,
    terms: offer?.terms ?? '',
  };
}

function forInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

/** Shared create/edit form for both offers and promotions. */
export function CatalogForm({
  open,
  onClose,
  editing,
  noun,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Offer | null;
  noun: string;
  onSave: (values: CatalogFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<CatalogFormValues>(() => toForm(editing));
  const [key, setKey] = useState(editing?.id ?? 'new');

  // Reset local form when the modal opens for a different record.
  const currentKey = editing?.id ?? 'new';
  if (open && key !== currentKey) {
    setKey(currentKey);
    setForm(toForm(editing));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${noun}` : `New ${noun}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.title}
            onClick={() =>
              void onSave({
                ...form,
                description: form.description || null,
                image_url: form.image_url || null,
                segment: form.segment === 'all' ? null : form.segment,
                terms: form.terms || null,
              })
            }
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Segment">
            <Select
              value={form.segment ?? 'all'}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
            >
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Image URL">
            <Input
              value={form.image_url ?? ''}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="From Media Library"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={forInput(form.start_at)}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </Field>
          <Field label="Ends">
            <Input
              type="datetime-local"
              value={forInput(form.end_at)}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </Field>
        </div>
        <Field label="Terms">
          <Textarea
            value={form.terms ?? ''}
            onChange={(e) => setForm({ ...form, terms: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}
