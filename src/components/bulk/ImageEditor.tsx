import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImageOff, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { uploadBatch } from '@/lib/blossom';
import { cn } from '@/lib/utils';
import type { ListingImage } from '@/lib/gamma';

/**
 * Read a file's pixel size as "<width>x<height>" (the `image` tag's
 * dimensions format). Blossom servers don't report dimensions, so they are
 * measured locally before upload. Empty string if the browser can't decode it.
 */
async function measureImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = `${bitmap.width}x${bitmap.height}`;
    bitmap.close();
    return dims;
  } catch {
    return '';
  }
}

/** Same as `measureImage`, for an image URL. Gives up after 5 s. */
function measureUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(''), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth ? `${img.naturalWidth}x${img.naturalHeight}` : '');
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve('');
    };
    img.src = url;
  });
}

interface ImageEditorProps {
  images: ListingImage[];
  onChange: (images: ListingImage[]) => void;
}

export function ImageEditor({ images, onChange }: ImageEditorProps) {
  const { user } = useCurrentUser();
  const [newUrl, setNewUrl] = useState('');
  /** Batch progress while uploading; null when idle. */
  const [progress, setProgress] = useState<{ done: number; total: number; signed: boolean } | null>(null);
  const isUploading = progress !== null;
  // Index being replaced, or -1 when the picker should append.
  const targetIndex = useRef(-1);
  const fileInput = useRef<HTMLInputElement>(null);

  const replaceAt = (index: number, image: ListingImage) =>
    onChange(images.map((img, i) => (i === index ? image : img)));

  /**
   * Upload one file (replace) or several (append). The whole selection is
   * authorized with one signature, so the signer prompts once per batch.
   * Successful uploads are kept even if others fail.
   */
  const handleFiles = async (files: File[]) => {
    if (files.length === 0 || !user) return;
    const index = targetIndex.current;

    setProgress({ done: 0, total: files.length, signed: false });
    const dimensions = await Promise.all(files.map(measureImage));
    let results;
    try {
      results = await uploadBatch(files, user.signer, (done, total) => setProgress({ done, total, signed: true }));
    } catch (err) {
      // Signing was refused or failed — nothing was uploaded.
      console.error('upload authorization failed', err);
      toast.error('Upload not authorized. Check your signer and try again.');
      return;
    } finally {
      setProgress(null);
    }

    const uploaded: ListingImage[] = results.flatMap((r, i) =>
      r.blob ? [{ url: r.blob.url, dimensions: dimensions[i] }] : [],
    );
    const failed = results.length - uploaded.length;
    for (const r of results) if (r.error) console.error(`image upload failed: ${r.file.name}`, r.error);

    if (uploaded.length > 0) {
      if (index >= 0) replaceAt(index, uploaded[0]);
      else onChange([...images, ...uploaded]);
    }
    if (failed > 0) {
      toast.error(
        files.length === 1
          ? 'Upload failed. Try a different file or check your signer.'
          : `${failed} of ${files.length} uploads failed. Try those files again or check your signer.`,
      );
    }
  };

  const pickFile = (index: number) => {
    targetIndex.current = index;
    // Replacing swaps one image; appending takes any number.
    if (fileInput.current) {
      fileInput.current.multiple = index < 0;
      fileInput.current.click();
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...images];
    const [img] = next.splice(index, 1);
    next.splice(index + delta, 0, img);
    onChange(next);
  };

  const addUrl = async () => {
    const url = newUrl.trim();
    if (!url) return;
    setNewUrl('');
    onChange([...images, { url, dimensions: await measureUrl(url) }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Images{images.length > 0 && <span className="text-muted-foreground"> · {images.length}</span>}
        </p>
        {progress && (
          <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress.signed && progress.total > 1 && `${Math.min(progress.done + 1, progress.total)}/${progress.total}`}
          </span>
        )}
      </div>

      {images.length === 0 && (
        <p className="text-sm text-muted-foreground">No images on this listing yet.</p>
      )}

      <div className="space-y-2">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="flex items-start gap-2">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
              {image.url ? (
                <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <ImageOff className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
              )}
              {index === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[9px] leading-3 text-white">
                  main
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                className="h-8 text-xs"
                value={image.url}
                onChange={(e) => replaceAt(index, { ...image, url: e.target.value })}
                placeholder="https://…"
              />
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Replace with an upload"
                  disabled={isUploading}
                  onClick={() => pickFile(index)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Move down"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Remove image"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {image.dimensions && (
                  <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                    {image.dimensions}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isUploading}
          onClick={() => pickFile(-1)}
        >
          <Plus className={cn('mr-2 h-4 w-4', isUploading && 'hidden')} />
          {!progress
            ? 'Upload images'
            : !progress.signed
              ? 'Waiting for signature…'
              : `Uploading${progress.total > 1 ? ` ${Math.min(progress.done + 1, progress.total)} of ${progress.total}` : ''}…`}
        </Button>
        <div className="flex gap-1">
          <Input
            className="h-8 text-xs"
            value={newUrl}
            placeholder="…or paste an image URL"
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button variant="secondary" size="sm" className="h-8" onClick={addUrl} disabled={!newUrl.trim()}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Select several files at once — they upload together after a single signature. The first image is the listing's main image. Changes are published with the rest of your edits.
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files ?? []));
          // Allow re-selecting the same files after a failed upload.
          e.target.value = '';
        }}
      />
    </div>
  );
}
