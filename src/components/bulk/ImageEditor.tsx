import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImageOff, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUploadFile } from '@/hooks/useUploadFile';
import { cn } from '@/lib/utils';
import type { ListingImage } from '@/lib/gamma';

interface ImageEditorProps {
  images: ListingImage[];
  onChange: (images: ListingImage[]) => void;
}

/** Read the URL and pixel dimensions out of the uploader's NIP-94 tags. */
function imageFromUploadTags(tags: string[][]): ListingImage {
  const url = tags.find(([t]) => t === 'url')?.[1] ?? tags[0]?.[1] ?? '';
  return { url, dimensions: tags.find(([t]) => t === 'dim')?.[1] ?? '' };
}

export function ImageEditor({ images, onChange }: ImageEditorProps) {
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [newUrl, setNewUrl] = useState('');
  // Index being replaced, or -1 when the picker should append.
  const targetIndex = useRef(-1);
  const fileInput = useRef<HTMLInputElement>(null);

  const replaceAt = (index: number, image: ListingImage) =>
    onChange(images.map((img, i) => (i === index ? image : img)));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const index = targetIndex.current;
    try {
      const image = imageFromUploadTags(await uploadFile(file));
      if (!image.url) throw new Error('Uploader returned no URL');
      if (index >= 0) replaceAt(index, image);
      else onChange([...images, image]);
    } catch (err) {
      console.error('image upload failed', err);
      toast.error('Upload failed. Try a different file or check your signer.');
    }
  };

  const pickFile = (index: number) => {
    targetIndex.current = index;
    fileInput.current?.click();
  };

  const move = (index: number, delta: number) => {
    const next = [...images];
    const [img] = next.splice(index, 1);
    next.splice(index + delta, 0, img);
    onChange(next);
  };

  const addUrl = () => {
    const url = newUrl.trim();
    if (!url) return;
    onChange([...images, { url, dimensions: '' }]);
    setNewUrl('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Images{images.length > 0 && <span className="text-muted-foreground"> · {images.length}</span>}
        </p>
        {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
          {isUploading ? 'Uploading…' : 'Upload image'}
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
          The first image is the listing's main image. Changes are published with the rest of your edits.
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // Allow re-selecting the same file after a failed upload.
          e.target.value = '';
        }}
      />
    </div>
  );
}
