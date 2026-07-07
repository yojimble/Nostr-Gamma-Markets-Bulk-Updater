import type { NPool } from '@nostrify/nostrify';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.plebeian.market',
  'wss://nos.lol',
];

/**
 * Fetch the user's relay list from their NIP-65 profile (kind 10002).
 * Returns `r` tag URLs (read + write — we both query and publish listings),
 * or an empty array if no relay list is found.
 */
export async function fetchProfileRelays(nostr: NPool, pubkey: string): Promise<string[]> {
  const events = await nostr.query(
    [{ kinds: [10002], authors: [pubkey], limit: 5 }],
    { signal: AbortSignal.timeout(10000) },
  );

  const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
  if (!latest) return [];

  const urls = latest.tags
    .filter(([t, url]) => t === 'r' && typeof url === 'string' && url.startsWith('wss://'))
    .map(([, url]) => url.replace(/\/$/, ''));

  return [...new Set(urls)].slice(0, 8);
}
