import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Gamma Markets spec (https://github.com/GammaMarkets/market-spec):
 * - kind 30402: product listing (shared with NIP-99 classifieds)
 * - kind 30406: shipping option
 *
 * A listing references shipping via:
 *   ["shipping_option", "30406:<pubkey>:<d-tag>", "<extra-cost>"]
 */

export const LISTING_KIND = 30402;
export const SHIPPING_KIND = 30406;

/**
 * The editor displays only the three Gamma `visibility` values. The NIP-99
 * `status` tag (active | sold) is still written for compatibility, but never
 * shown: hidden items get `status: sold`, everything else `status: active`.
 */
export type ListingStatus = 'on-sale' | 'hidden' | 'pre-order';

export const LISTING_STATUSES: ListingStatus[] = ['on-sale', 'hidden', 'pre-order'];

/**
 * One `image` tag: `["image", <url>, <dimensions>, <sorting-order>]`.
 * `dimensions` is "<width>x<height>" or an empty string when unknown; the
 * sorting order is not stored, since array position defines it.
 */
export interface ListingImage {
  url: string;
  dimensions: string;
}

/** The editable fields of a listing, decoded from event tags. */
export interface ListingData {
  title: string;
  priceAmount: string;
  priceCurrency: string;
  priceFrequency: string;
  /** Empty string means "no stock tag" (unmanaged inventory). */
  stock: string;
  status: ListingStatus;
  /** Comma-separated in the editor; split into `t` tags on serialize. */
  categories: string;
  location: string;
  summary: string;
  /** The event `content` — the full product description (markdown). */
  description: string;
  /** Address strings like "30406:<pubkey>:<d-tag>". */
  shippingRefs: string[];
  /** Product images, in display order — the first one is the primary image. */
  images: ListingImage[];
}

/** One row of the spreadsheet. */
export interface ListingRow {
  /** The `d` tag — the listing's unique identifier. */
  id: string;
  /** Original event; undefined for not-yet-published duplicates. */
  original?: NostrEvent;
  /** Tags carried over verbatim for new duplicates (image, spec, etc). */
  sourceTags: string[][];
  /** Values as they were loaded — used to detect edits. */
  base: ListingData;
  /** Current (possibly edited) values. */
  data: ListingData;
  isNew: boolean;
}

export function tagValue(tags: string[][], name: string): string | undefined {
  return tags.find(([t]) => t === name)?.[1];
}

export function tagValues(tags: string[][], name: string): string[] {
  return tags.filter(([t]) => t === name).map(([, v]) => v).filter((v): v is string => v !== undefined);
}

/**
 * Read `image` tags in display order. The spec sorts by the optional 4th
 * element (lowest to highest, with no fixed starting value); tags without one
 * keep their position in the tag list.
 */
export function parseImages(tags: string[][]): ListingImage[] {
  return tags
    .filter(([name, url]) => name === 'image' && !!url)
    .map(([, url, dimensions, order], index) => {
      const sort = Number(order);
      return {
        url,
        dimensions: dimensions ?? '',
        sort: order && Number.isFinite(sort) ? sort : index,
        index,
      };
    })
    .sort((a, b) => a.sort - b.sort || a.index - b.index)
    .map(({ url, dimensions }) => ({ url, dimensions }));
}

function readStatus(tags: string[][]): ListingStatus {
  const vis = tagValue(tags, 'visibility');
  if (vis === 'hidden' || vis === 'pre-order' || vis === 'on-sale') return vis;
  // No visibility tag: fall back to NIP-99 status — sold maps to hidden.
  if (tagValue(tags, 'status') === 'sold') return 'hidden';
  return 'on-sale';
}

export function parseListing(event: NostrEvent): ListingData {
  const priceTag = event.tags.find(([t]) => t === 'price');
  return {
    title: tagValue(event.tags, 'title') ?? '',
    priceAmount: priceTag?.[1] ?? '',
    priceCurrency: priceTag?.[2] ?? '',
    priceFrequency: priceTag?.[3] ?? '',
    // Gamma spec uses `stock`; some clients write `quantity` — read both.
    stock: tagValue(event.tags, 'stock') ?? tagValue(event.tags, 'quantity') ?? '',
    status: readStatus(event.tags),
    categories: tagValues(event.tags, 't').join(', '),
    location: tagValue(event.tags, 'location') ?? '',
    summary: tagValue(event.tags, 'summary') ?? '',
    description: event.content,
    shippingRefs: tagValues(event.tags, 'shipping_option'),
    images: parseImages(event.tags),
  };
}

export function splitCategories(categories: string): string[] {
  return [...new Set(
    categories
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  )];
}

/** Tag names owned by the editor — stripped and re-written on serialize. */
const MANAGED_TAGS = new Set([
  'title', 'price', 'stock', 'quantity', 'status', 'visibility',
  't', 'location', 'summary', 'shipping_option', 'd', 'client', 'image',
]);

/**
 * Build the full tag list for publishing a row. Unmanaged tags from the
 * source event (image, spec, weight, g, a, …) are preserved verbatim.
 */
export function serializeListing(row: ListingRow): string[][] {
  const carried = row.sourceTags.filter(([t]) => !MANAGED_TAGS.has(t));
  const { data } = row;
  const tags: string[][] = [['d', row.id], ...carried];

  tags.push(['title', data.title]);

  if (data.priceAmount.trim()) {
    const price = ['price', data.priceAmount.trim(), data.priceCurrency.trim().toUpperCase() || 'USD'];
    if (data.priceFrequency.trim()) price.push(data.priceFrequency.trim());
    tags.push(price);
  }

  if (data.stock.trim() !== '') {
    tags.push(['stock', data.stock.trim()]);
  }

  // Gamma `visibility` is the source of truth; the NIP-99 `status` tag is
  // written alongside for classified clients (hidden ↔ sold).
  tags.push(['visibility', data.status]);
  tags.push(['status', data.status === 'hidden' ? 'sold' : 'active']);

  for (const cat of splitCategories(data.categories)) {
    tags.push(['t', cat]);
  }

  if (data.location.trim()) tags.push(['location', data.location.trim()]);
  if (data.summary.trim()) tags.push(['summary', data.summary.trim()]);

  for (const ref of data.shippingRefs) {
    tags.push(['shipping_option', ref]);
  }

  // Array position is the source of truth for image order; the spec's sorting
  // field is rewritten as a dense 1-based sequence.
  data.images.forEach((img, i) => {
    tags.push(['image', img.url, img.dimensions, String(i + 1)]);
  });

  return tags;
}

function serializeImages(images: ListingImage[]): string {
  return images.map((i) => `${i.url}\u0000${i.dimensions}`).join('\n');
}

export function isRowDirty(row: ListingRow): boolean {
  if (row.isNew) return true;
  const a = row.base;
  const b = row.data;
  return (
    a.title !== b.title ||
    a.priceAmount !== b.priceAmount ||
    a.priceCurrency !== b.priceCurrency ||
    a.priceFrequency !== b.priceFrequency ||
    a.stock !== b.stock ||
    a.status !== b.status ||
    a.categories !== b.categories ||
    a.location !== b.location ||
    a.summary !== b.summary ||
    a.description !== b.description ||
    a.shippingRefs.join('\n') !== b.shippingRefs.join('\n') ||
    serializeImages(a.images) !== serializeImages(b.images)
  );
}

/** Copy listing data so edits to one row never mutate its `base` snapshot. */
export function cloneListingData(data: ListingData): ListingData {
  return {
    ...data,
    shippingRefs: [...data.shippingRefs],
    images: data.images.map((i) => ({ ...i })),
  };
}

export function eventToRow(event: NostrEvent): ListingRow {
  const data = parseListing(event);
  return {
    id: tagValue(event.tags, 'd') ?? '',
    original: event,
    sourceTags: event.tags,
    base: cloneListingData(data),
    data: cloneListingData(data),
    isNew: false,
  };
}

/**
 * Duplicate a row as a new unpublished listing. Every new listing gets a
 * fresh unique `d` identifier (UUID v4), per the requirement that created
 * listings never collide with existing ones.
 */
export function duplicateRow(row: ListingRow): ListingRow {
  const data: ListingData = {
    ...cloneListingData(row.data),
    title: row.data.title ? `${row.data.title} (copy)` : '(copy)',
  };
  return {
    id: crypto.randomUUID(),
    original: undefined,
    sourceTags: row.sourceTags,
    base: cloneListingData(data),
    data,
    isNew: true,
  };
}

/** Shipping option (kind 30406) summary for pickers. */
export interface ShippingOption {
  /** Address string "30406:<pubkey>:<d-tag>" used in shipping_option tags. */
  ref: string;
  d: string;
  title: string;
  priceAmount: string;
  priceCurrency: string;
  service: string;
  countries: string[];
}

export function parseShippingOption(event: NostrEvent): ShippingOption | undefined {
  const d = tagValue(event.tags, 'd');
  if (d === undefined) return undefined;
  const priceTag = event.tags.find(([t]) => t === 'price');
  return {
    ref: `${SHIPPING_KIND}:${event.pubkey}:${d}`,
    d,
    title: tagValue(event.tags, 'title') ?? d,
    priceAmount: priceTag?.[1] ?? '',
    priceCurrency: priceTag?.[2] ?? '',
    service: tagValue(event.tags, 'service') ?? '',
    countries: tagValues(event.tags, 'country'),
  };
}

/**
 * Drop events retracted by NIP-09 deletion requests (kind 5). Only deletions
 * signed by the event's own author count. An `e` tag removes that exact
 * event; an `a` tag removes every version of the address created at or
 * before the deletion — so a shipping option re-published afterwards under
 * the same `d` tag shows up again.
 */
export function withoutDeleted(events: NostrEvent[], deletions: NostrEvent[]): NostrEvent[] {
  const deletedIds = new Set<string>();
  /** Address "<kind>:<pubkey>:<d>" → newest deletion timestamp. */
  const deletedAddrs = new Map<string, number>();

  for (const del of deletions) {
    if (del.kind !== 5) continue;
    for (const [name, value] of del.tags) {
      if (!value) continue;
      if (name === 'e') {
        deletedIds.add(`${del.pubkey}:${value}`);
      } else if (name === 'a' && value.split(':')[1] === del.pubkey) {
        deletedAddrs.set(value, Math.max(deletedAddrs.get(value) ?? 0, del.created_at));
      }
    }
  }

  return events.filter((ev) => {
    if (deletedIds.has(`${ev.pubkey}:${ev.id}`)) return false;
    const deletedAt = deletedAddrs.get(`${ev.kind}:${ev.pubkey}:${tagValue(ev.tags, 'd') ?? ''}`);
    return deletedAt === undefined || ev.created_at > deletedAt;
  });
}
