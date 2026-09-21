import type { NostrSigner } from '@nostrify/nostrify';
import { N64 } from '@nostrify/nostrify/utils';

export const BLOSSOM_SERVER = 'https://blossom.primal.net/';

/** Blossom BlobDescriptor returned by `PUT /upload`. */
export interface BlobDescriptor {
  url: string;
  sha256: string;
  size: number;
  type?: string;
}

export interface BatchUploadResult {
  file: File;
  blob?: BlobDescriptor;
  error?: unknown;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Upload several files to a Blossom server with a single signature.
 *
 * A BUD-02 upload authorization (kind 24242) may carry one `x` tag per blob
 * hash, so one signed event covers the whole batch — the signer is asked
 * once instead of once per file. Uploads run one after another; a failed
 * file doesn't stop the rest. `onProgress` fires once signing is done
 * (done = 0) and after each file.
 */
export async function uploadBatch(
  files: File[],
  signer: NostrSigner,
  onProgress?: (done: number, total: number) => void,
  server = BLOSSOM_SERVER,
): Promise<BatchUploadResult[]> {
  const hashes = await Promise.all(files.map(sha256Hex));

  const now = Math.floor(Date.now() / 1000);
  const event = await signer.signEvent({
    kind: 24242,
    content: files.length === 1 ? `Upload ${files[0].name}` : `Upload ${files.length} images`,
    created_at: now,
    tags: [
      ['t', 'upload'],
      ...[...new Set(hashes)].map((x) => ['x', x]),
      // Long enough for a large batch on a slow connection.
      ['expiration', String(now + 15 * 60)],
    ],
  });
  const authorization = `Nostr ${N64.encodeEvent(event)}`;
  onProgress?.(0, files.length);

  const results: BatchUploadResult[] = [];
  for (const file of files) {
    try {
      const response = await fetch(new URL('/upload', server), {
        method: 'PUT',
        body: file,
        headers: { authorization, 'content-type': file.type },
      });
      if (!response.ok) {
        throw new Error(response.headers.get('x-reason') ?? `HTTP ${response.status}`);
      }
      const blob = (await response.json()) as BlobDescriptor;
      if (!blob.url) throw new Error('Server returned no URL');
      results.push({ file, blob });
    } catch (error) {
      results.push({ file, error });
    }
    onProgress?.(results.length, files.length);
  }
  return results;
}
