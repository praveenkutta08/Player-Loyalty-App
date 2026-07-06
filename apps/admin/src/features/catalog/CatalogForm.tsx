import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Offer, OfferCreate } from './catalogApi';

import { usePresignMediaMutation } from '@/features/media/mediaApi';

import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { SEGMENTS } from '@/features/shared/segments';

export type CatalogFormValues = OfferCreate & { title: string };

// Form-shape schema (M13): datetime fields are the datetime-local string; mapped to ISO on
// submit. Derived from the generated OfferCreate contract so the fields can't drift from the API.
const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 chars'),
    description: z.string().max(2000).optional().default(''),
    image_url: z
      .string()
      .trim()
      .refine((v) => v === '' || /^https?:\/\/|^\//.test(v), 'Enter a URL or media path')
      .optional()
      .default(''),
    segment: z.string().default('all'),
    start_local: z.string().optional().default(''),
    end_local: z.string().optional().default(''),
    terms: z.string().max(4000).optional().default(''),
  })
  .refine(
    (v) => !v.start_local || !v.end_local || new Date(v.end_local) > new Date(v.start_local),
    { path: ['end_local'], message: 'End must be after start' },
  );

type FormShape = z.input<typeof schema>;

function forInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}
function toIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

function defaults(offer: Offer | null): FormShape {
  return {
    title: offer?.title ?? '',
    description: offer?.description ?? '',
    image_url: offer?.image_url ?? '',
    segment: offer?.segment ?? 'all',
    start_local: forInput(offer?.start_at),
    end_local: forInput(offer?.end_at),
    terms: offer?.terms ?? '',
  };
}

/** Shared create/edit form for both offers and promotions (RHF + zod, M13). */
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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: defaults(editing),
  });

  const { toast } = useToast();
  const [presign] = usePresignMediaMutation();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageUrl = watch('image_url');

  // Rehydrate when the modal opens for a different record.
  useEffect(() => {
    if (open) reset(defaults(editing));
  }, [open, editing, reset]);

  // Presign → PUT to object storage → store the public media_url on the offer (reuses the CMS
  // media presign; same pattern as the Media Library). A failed PUT aborts, never silently "works".
  const onPickImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await presign({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      }).unwrap();
      const put = await fetch(res.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) {
        toast(`Upload failed (${put.status}) — image not stored.`, 'error');
        return;
      }
      setValue('image_url', res.media_url, { shouldValidate: true, shouldDirty: true });
      toast('Image uploaded');
    } catch {
      toast('Upload failed — image not stored.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = handleSubmit(async (v) => {
    await onSave({
      title: v.title.trim(),
      description: v.description?.trim() || null,
      image_url: v.image_url?.trim() || null,
      segment: v.segment === 'all' ? null : v.segment,
      start_at: toIso(v.start_local ?? ''),
      end_at: toIso(v.end_local ?? ''),
      terms: v.terms?.trim() || null,
    });
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${noun}` : `New ${noun}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={isSubmitting} onClick={() => void submit()}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Field label="Title">
          <Input {...register('title')} />
          {errors.title && <p className="mt-1 text-[12px] text-red">{errors.title.message}</p>}
        </Field>
        <Field label="Description">
          <Textarea {...register('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Segment">
            <Select {...register('segment')}>
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Image">
            <div className="flex items-center gap-3">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--token-border-ghost)] bg-[var(--token-bg-container)]">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickImage(f);
                    e.target.value = '';
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload image'}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      onClick={() =>
                        setValue('image_url', '', { shouldValidate: true, shouldDirty: true })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {/* Keep a URL field so an external/CDN link can still be pasted; upload just fills it. */}
            <Input
              {...register('image_url')}
              placeholder="…or paste an image URL"
              className="mt-2"
            />
            {errors.image_url && (
              <p className="mt-1 text-[12px] text-red">{errors.image_url.message}</p>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts">
            <Input type="datetime-local" {...register('start_local')} />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" {...register('end_local')} />
            {errors.end_local && (
              <p className="mt-1 text-[12px] text-red">{errors.end_local.message}</p>
            )}
          </Field>
        </div>
        <Field label="Terms">
          <Textarea {...register('terms')} />
        </Field>
      </form>
    </Modal>
  );
}
