import { describe, expect, it } from 'vitest';
import type { NostrEvent } from '@nostrify/nostrify';

import {
  duplicateRow,
  eventToRow,
  isRowDirty,
  parseListing,
  serializeListing,
  splitCategories,
} from './gamma';

const baseEvent: NostrEvent = {
  id: 'x'.repeat(64),
  pubkey: 'p'.repeat(64),
  sig: 's'.repeat(128),
  kind: 30402,
  created_at: 1700000000,
  content: 'A fine hat in **markdown**.',
  tags: [
    ['d', 'fine-hat'],
    ['title', 'Fine Hat'],
    ['price', '21.00', 'USD'],
    ['stock', '3'],
    ['visibility', 'on-sale'],
    ['status', 'active'],
    ['t', 'clothing'],
    ['t', 'hats'],
    ['summary', 'A hat'],
    ['location', 'Lisbon'],
    ['shipping_option', '30406:merchant:eu-standard'],
    ['image', 'https://example.com/hat.jpg', '800x600', '1'],
    ['spec', 'color', 'red'],
    ['weight', '0.2', 'kg'],
    ['published_at', '1690000000'],
  ],
};

describe('parseListing', () => {
  it('decodes tags into editor fields', () => {
    const data = parseListing(baseEvent);
    expect(data.title).toBe('Fine Hat');
    expect(data.priceAmount).toBe('21.00');
    expect(data.priceCurrency).toBe('USD');
    expect(data.stock).toBe('3');
    expect(data.status).toBe('on-sale');
    expect(data.categories).toBe('clothing, hats');
    expect(data.location).toBe('Lisbon');
    expect(data.shippingRefs).toEqual(['30406:merchant:eu-standard']);
  });

  it('maps NIP-99 sold status to hidden and reads quantity fallback', () => {
    const ev = {
      ...baseEvent,
      tags: [['d', 'a'], ['title', 'A'], ['status', 'sold'], ['quantity', '7']],
    };
    const data = parseListing(ev);
    expect(data.status).toBe('hidden');
    expect(data.stock).toBe('7');
  });

  it('prefers the visibility tag over the NIP-99 status tag', () => {
    const ev = {
      ...baseEvent,
      tags: [['d', 'a'], ['title', 'A'], ['status', 'sold'], ['visibility', 'on-sale']],
    };
    expect(parseListing(ev).status).toBe('on-sale');
  });
});

describe('serializeListing', () => {
  it('round-trips an unedited row and preserves unmanaged tags', () => {
    const row = eventToRow(baseEvent);
    const tags = serializeListing(row);

    expect(tags).toContainEqual(['d', 'fine-hat']);
    expect(tags).toContainEqual(['title', 'Fine Hat']);
    expect(tags).toContainEqual(['price', '21.00', 'USD']);
    expect(tags).toContainEqual(['stock', '3']);
    expect(tags).toContainEqual(['t', 'clothing']);
    expect(tags).toContainEqual(['t', 'hats']);
    expect(tags).toContainEqual(['shipping_option', '30406:merchant:eu-standard']);
    // Unmanaged tags carried verbatim:
    expect(tags).toContainEqual(['image', 'https://example.com/hat.jpg', '800x600', '1']);
    expect(tags).toContainEqual(['spec', 'color', 'red']);
    expect(tags).toContainEqual(['weight', '0.2', 'kg']);
    expect(tags).toContainEqual(['published_at', '1690000000']);
  });

  it('writes NIP-99 status sold for hidden items and active otherwise', () => {
    const row = eventToRow(baseEvent);
    row.data.status = 'hidden';
    let tags = serializeListing(row);
    expect(tags).toContainEqual(['visibility', 'hidden']);
    expect(tags).toContainEqual(['status', 'sold']);

    row.data.status = 'pre-order';
    tags = serializeListing(row);
    expect(tags).toContainEqual(['visibility', 'pre-order']);
    expect(tags).toContainEqual(['status', 'active']);
  });

  it('omits stock tag when stock field is empty', () => {
    const row = eventToRow(baseEvent);
    row.data.stock = '';
    const tags = serializeListing(row);
    expect(tags.some(([t]) => t === 'stock' || t === 'quantity')).toBe(false);
  });
});

describe('isRowDirty', () => {
  it('is false for a freshly loaded row and true after an edit', () => {
    const row = eventToRow(baseEvent);
    expect(isRowDirty(row)).toBe(false);
    row.data.title = 'Finer Hat';
    expect(isRowDirty(row)).toBe(true);
  });
});

describe('duplicateRow', () => {
  it('creates a new row with a unique d identifier', () => {
    const row = eventToRow(baseEvent);
    const copy1 = duplicateRow(row);
    const copy2 = duplicateRow(row);

    expect(copy1.isNew).toBe(true);
    expect(copy1.id).not.toBe(row.id);
    expect(copy1.id).not.toBe(copy2.id);
    expect(copy1.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(copy1.data.title).toBe('Fine Hat (copy)');
    expect(isRowDirty(copy1)).toBe(true);

    // Serialized duplicate uses the new d tag but keeps content tags.
    const tags = serializeListing(copy1);
    expect(tags).toContainEqual(['d', copy1.id]);
    expect(tags).toContainEqual(['image', 'https://example.com/hat.jpg', '800x600', '1']);
  });
});

describe('splitCategories', () => {
  it('trims, lowercases and dedupes', () => {
    expect(splitCategories(' Hats, clothing,,HATS , vintage ')).toEqual([
      'hats', 'clothing', 'vintage',
    ]);
  });
});
