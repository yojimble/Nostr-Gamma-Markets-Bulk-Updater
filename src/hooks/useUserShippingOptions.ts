import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from './useCurrentUser';
import { SHIPPING_KIND, parseShippingOption, tagValue, withoutDeleted, type ShippingOption } from '@/lib/gamma';
import type { NostrEvent } from '@nostrify/nostrify';

/** The user's published Gamma Markets shipping options (kind 30406). */
export function useUserShippingOptions() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery<ShippingOption[]>({
    queryKey: ['shipping-options', user?.pubkey ?? ''],
    enabled: !!user?.pubkey,
    queryFn: async ({ signal }) => {
      // Deletion requests are fetched alongside the options. Not filtered by
      // `#k`: Plebeian's kind 5 events for shipping carry only an `a` tag.
      const results = await nostr.query(
        [
          { kinds: [SHIPPING_KIND], authors: [user!.pubkey], limit: 200 },
          { kinds: [5], authors: [user!.pubkey], limit: 500 },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) },
      );
      const events = withoutDeleted(
        results.filter((ev) => ev.kind === SHIPPING_KIND),
        results.filter((ev) => ev.kind === 5),
      );

      // Keep only the latest event per d-tag (replaceable events can come
      // back stale from some relays).
      const latest = new Map<string, NostrEvent>();
      for (const ev of events) {
        const d = tagValue(ev.tags, 'd');
        if (d === undefined) continue;
        const existing = latest.get(d);
        if (!existing || ev.created_at > existing.created_at) {
          latest.set(d, ev);
        }
      }

      return [...latest.values()]
        .map(parseShippingOption)
        .filter((o): o is ShippingOption => o !== undefined)
        .sort((a, b) => a.title.localeCompare(b.title));
    },
  });
}
