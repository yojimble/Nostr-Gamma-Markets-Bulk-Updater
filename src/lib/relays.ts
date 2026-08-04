import type { NPool } from '@nostrify/nostrify';

/**
 * The relays this app knows about: Plebeian Market's main relay plus its
 * DEFAULT_PUBLIC_RELAYS (the relays it publishes listings to), and Primal.
 * Single source of truth — `DEFAULT_RELAYS` and the RelaySelector presets are
 * both derived from this, so they can't drift apart.
 */
export const RELAY_PRESETS = [
  { url: 'wss://relay.plebeian.market', name: 'Plebeian Market' },
  { url: 'wss://sendit.nosflare.com', name: 'Sendit' },
  { url: 'wss://nostr.mom', name: 'nostr.mom' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://relay.nostr.net', name: 'nostr.net' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.minibits.cash', name: 'Minibits' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
] as const;

/**
 * Read/write set used by default. A merchant's inventory is found even when
 * their NIP-65 relay list points somewhere else.
 */
export const DEFAULT_RELAYS: string[] = RELAY_PRESETS.map((r) => r.url);

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
