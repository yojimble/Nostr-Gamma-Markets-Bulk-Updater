import { useEffect, useMemo, useRef, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowDown, ArrowUp, RefreshCw, RotateCcw, Search, Table2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { LoginArea } from '@/components/auth/LoginArea';
import { SettingsSheet } from '@/components/SettingsSheet';
import { BulkToolbar, type CategoryEditMode, type PriceEditMode, type ShippingEditMode, type TitleEditMode } from '@/components/bulk/BulkToolbar';
import { ListingsTable } from '@/components/bulk/ListingsTable';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUserListings } from '@/hooks/useUserListings';
import { useUserShippingOptions } from '@/hooks/useUserShippingOptions';
import {
  LISTING_KIND,
  duplicateRow,
  eventToRow,
  isRowDirty,
  serializeListing,
  splitCategories,
  tagValue,
  type ListingData,
  type ListingRow,
  type ListingStatus,
} from '@/lib/gamma';
import { DEFAULT_RELAYS, fetchProfileRelays } from '@/lib/relays';
import { useNostr } from '@nostrify/react';

type SortKey = 'updated' | 'title' | 'price' | 'stock';
type StatusFilter = 'all' | ListingStatus;

export default function BulkEditorPage() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { config, updateConfig } = useAppContext();
  const { data: listings, isLoading, isError, refetch, isFetching } = useUserListings();
  const { data: shippingOptions = [] } = useUserShippingOptions();
  const { mutateAsync: publishEvent, isPending: isPublishing } = useNostrPublish();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<ListingRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Listings deleted this session — some relays ignore NIP-09 requests and
  // would otherwise re-serve them on the next refetch.
  const deletedIds = useRef<Set<string>>(new Set());

  // Switching accounts must not leak one user's listings into another's view.
  // Reset during render (before paint) so the table never shows the previous
  // account's rows while the new account's query is in flight.
  const [loadedPubkey, setLoadedPubkey] = useState(user?.pubkey);
  if (loadedPubkey !== user?.pubkey) {
    setLoadedPubkey(user?.pubkey);
    setRows([]);
    setSelected(new Set());
    deletedIds.current = new Set();
  }

  useSeoMeta({
    title: 'Gamma Markets Bulk Updater',
    description: 'Bulk-edit your Nostr marketplace listings in a spreadsheet.',
  });

  // On login, add the user's published relays from their NIP-65 relay list
  // (kind 10002) to the set we query. These are merged with the bundled
  // defaults rather than replacing them: relay lists are often stale or list
  // relays that never received the user's listings, and dropping the defaults
  // in that case makes an otherwise healthy inventory disappear.
  const relayImportAttempted = useRef<string>('');
  useEffect(() => {
    if (!user || relayImportAttempted.current === user.pubkey) return;
    relayImportAttempted.current = user.pubkey;
    fetchProfileRelays(nostr, user.pubkey)
      .then((relays) => {
        // DEFAULT_RELAYS are re-added here as well, to heal configs saved by
        // an earlier version that overwrote them with the profile list.
        const merged = [...new Set([...config.relayUrls, ...DEFAULT_RELAYS, ...relays])];
        const added = merged.filter((r) => !config.relayUrls.includes(r));
        if (added.length === 0) return;
        updateConfig((prev) => ({
          ...prev,
          relayUrls: [...new Set([...prev.relayUrls, ...DEFAULT_RELAYS, ...relays])],
        }));
        toast.success(`Now reading from ${merged.length} relays.`);
      })
      .catch(() => {});
  }, [user, config.relayUrls, nostr, updateConfig]);

  // Merge fetched listings into local rows without clobbering unsaved edits
  // or unpublished duplicates.
  useEffect(() => {
    if (!listings || !user) return;
    setRows((prev) => {
      const prevById = new Map(prev.map((r) => [r.id, r]));
      const seen = new Set<string>();
      const next: ListingRow[] = [];
      for (const ev of listings) {
        const id = tagValue(ev.tags, 'd');
        if (id === undefined || deletedIds.current.has(id)) continue;
        if (ev.pubkey !== user.pubkey) continue;
        seen.add(id);
        const existing = prevById.get(id);
        const keepExisting =
          existing &&
          (isRowDirty(existing) ||
            (existing.original && existing.original.created_at >= ev.created_at));
        next.push(keepExisting ? existing : eventToRow(ev));
      }
      // Keep rows the relays didn't return: unpublished duplicates, edits in
      // flight, and rows we just published that relays haven't served yet.
      for (const r of prev) {
        if (seen.has(r.id)) continue;
        // ...but never carry over rows belonging to another account.
        if (r.original && r.original.pubkey !== user.pubkey) continue;
        next.push(r);
      }
      return next;
    });
  }, [listings, user]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (statusFilter === 'all' || r.data.status === statusFilter) &&
        (!q ||
          r.data.title.toLowerCase().includes(q) ||
          r.data.categories.toLowerCase().includes(q) ||
          r.data.summary.toLowerCase().includes(q) ||
          r.data.description.toLowerCase().includes(q)),
    );

    const num = (s: string, missing: number) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : missing;
    };
    const missing = sortDir === 'asc' ? Infinity : -Infinity;

    filtered.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case 'title':
          cmp = a.data.title.localeCompare(b.data.title, undefined, { sensitivity: 'base' });
          break;
        case 'price':
          cmp = num(a.data.priceAmount, missing) - num(b.data.priceAmount, missing);
          break;
        case 'stock':
          cmp = num(a.data.stock, missing) - num(b.data.stock, missing);
          break;
        case 'updated':
          // Unpublished duplicates count as the most recent.
          cmp = (a.original?.created_at ?? Infinity) - (b.original?.created_at ?? Infinity);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [rows, search, sortKey, sortDir, statusFilter]);

  const dirtyRows = useMemo(() => rows.filter(isRowDirty), [rows]);

  const updateRows = (ids: Set<string>, fn: (data: ListingData) => Partial<ListingData>) => {
    setRows((prev) =>
      prev.map((r) => (ids.has(r.id) ? { ...r, data: { ...r.data, ...fn(r.data) } } : r)),
    );
  };

  const handleCellChange = (id: string, patch: Partial<ListingData>) => {
    updateRows(new Set([id]), () => patch);
  };

  const handleToggleShipping = (id: string, ref: string, checked: boolean) => {
    updateRows(new Set([id]), (d) => ({
      shippingRefs: checked
        ? [...new Set([...d.shippingRefs, ref])]
        : d.shippingRefs.filter((r) => r !== ref),
    }));
  };

  const handleBulkTitle = (mode: TitleEditMode, a: string, b: string) => {
    updateRows(selected, (d) => {
      switch (mode) {
        case 'replace': return { title: d.title.split(a).join(b) };
        case 'set': return { title: a };
        case 'prefix': return { title: `${a}${d.title}` };
        case 'suffix': return { title: `${d.title}${a}` };
      }
    });
    toast.success(`Titles updated on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkDescription = (mode: TitleEditMode, a: string, b: string) => {
    updateRows(selected, (d) => {
      switch (mode) {
        case 'replace': return { description: d.description.split(a).join(b) };
        case 'set': return { description: a };
        case 'prefix': return { description: `${a}${d.description}` };
        case 'suffix': return { description: `${d.description}${a}` };
      }
    });
    toast.success(`Descriptions updated on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkCategories = (mode: CategoryEditMode, input: string) => {
    const cats = splitCategories(input);
    updateRows(selected, (d) => {
      const current = splitCategories(d.categories);
      switch (mode) {
        case 'add': return { categories: [...new Set([...current, ...cats])].join(', ') };
        case 'remove': return { categories: current.filter((c) => !cats.includes(c)).join(', ') };
        case 'set': return { categories: cats.join(', ') };
      }
    });
    toast.success(`Categories updated on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkPrice = (mode: PriceEditMode, amount: string, currency: string) => {
    updateRows(selected, (d) => {
      if (mode === 'set') {
        return {
          priceAmount: amount.trim(),
          ...(currency.trim() ? { priceCurrency: currency.trim().toUpperCase() } : {}),
        };
      }
      const current = parseFloat(d.priceAmount);
      if (!Number.isFinite(current)) return {};
      const factor = 1 + Number(amount) / 100;
      const next = Math.max(0, current * factor);
      return { priceAmount: String(Math.round(next * 100) / 100) };
    });
    toast.success(`Prices updated on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkStatus = (status: ListingStatus) => {
    updateRows(selected, () => ({ status }));
    toast.success(`Status set to “${status}” on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkShipping = (mode: ShippingEditMode, refs: string[]) => {
    updateRows(selected, (d) => {
      switch (mode) {
        case 'add': return { shippingRefs: [...new Set([...d.shippingRefs, ...refs])] };
        case 'replace': return { shippingRefs: [...refs] };
        case 'clear': return { shippingRefs: [] };
      }
    });
    toast.success(`Shipping options updated on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`);
  };

  const handleBulkLocation = (location: string) => {
    updateRows(selected, () => ({ location }));
    toast.success(
      location
        ? `Location set on ${selected.size} listing${selected.size === 1 ? '' : 's'}.`
        : `Location removed from ${selected.size} listing${selected.size === 1 ? '' : 's'}.`,
    );
  };

  const duplicateIds = (ids: Set<string>) => {
    const copies: string[] = [];
    setRows((prev) => {
      const next: ListingRow[] = [];
      for (const r of prev) {
        next.push(r);
        if (ids.has(r.id)) {
          const copy = duplicateRow(r);
          copies.push(copy.id);
          next.push(copy);
        }
      }
      return next;
    });
    return copies;
  };

  const handleDuplicateSelected = () => {
    const copies = duplicateIds(selected);
    setSelected(new Set(copies));
    toast.success(`Created ${copies.length} duplicate${copies.length === 1 ? '' : 's'} with new unique IDs. Review and publish.`);
  };

  const handleDuplicateRow = (id: string) => {
    duplicateIds(new Set([id]));
    toast.success('Duplicate created with a new unique ID. Review and publish.');
  };

  const handleDeleteSelected = async () => {
    const targets = rows.filter((r) => selected.has(r.id));
    if (targets.length === 0) return;
    const published = targets.filter((r) => r.original);

    if (published.length > 0) {
      // NIP-09 deletion request covering all selected published listings.
      const tags: string[][] = [];
      for (const r of published) {
        tags.push(['e', r.original!.id]);
        tags.push(['a', `${LISTING_KIND}:${r.original!.pubkey}:${r.id}`]);
      }
      tags.push(['k', String(LISTING_KIND)]);
      try {
        await publishEvent({ kind: 5, content: 'Listing deleted', tags });
      } catch (err) {
        console.error('deletion request failed', err);
        toast.error('Failed to publish the deletion request.');
        return;
      }
    }

    for (const r of targets) deletedIds.current.add(r.id);
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    toast.success(
      published.length > 0
        ? `Deletion requested for ${published.length} listing${published.length === 1 ? '' : 's'}.`
        : 'Removed unpublished duplicates.',
    );
  };

  const handleDiscard = () => {
    setRows((prev) =>
      prev
        .filter((r) => !r.isNew)
        .map((r) => ({ ...r, data: { ...r.base, shippingRefs: [...r.base.shippingRefs] } })),
    );
    setSelected(new Set());
    toast.info('Changes discarded.');
  };

  const handlePublish = async () => {
    const targets = rows.filter(isRowDirty);
    if (targets.length === 0) return;

    let ok = 0;
    let failed = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const row of targets) {
      let tags = serializeListing(row);
      if (row.isNew) {
        // A duplicate is a brand-new listing: fresh first-publication time.
        tags = tags.filter(([t]) => t !== 'published_at');
        tags.push(['published_at', String(now)]);
      }
      try {
        const event = await publishEvent({ kind: LISTING_KIND, content: row.data.description, tags });
        ok++;
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  original: event,
                  sourceTags: event.tags,
                  base: { ...r.data, shippingRefs: [...r.data.shippingRefs] },
                  isNew: false,
                }
              : r,
          ),
        );
      } catch (err) {
        console.error('publish failed for', row.id, err);
        failed++;
      }
    }

    if (ok) toast.success(`Published ${ok} listing${ok === 1 ? '' : 's'}.`);
    if (failed) toast.error(`${failed} listing${failed === 1 ? '' : 's'} failed to publish.`);
    await queryClient.invalidateQueries({ queryKey: ['nip99-listings'] });
  };

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 text-center space-y-6">
        <div>
          <Table2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Gamma Markets Bulk Updater</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with a browser extension or bunker to bulk-edit your
            marketplace listings in a spreadsheet.
          </p>
        </div>
        <LoginArea />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 pb-32 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Gamma Markets Bulk Updater</h1>
          <p className="text-sm text-muted-foreground">
            {visibleRows.length === rows.length
              ? `${rows.length} listing${rows.length === 1 ? '' : 's'}`
              : `showing ${visibleRows.length} of ${rows.length} listings`}
            {dirtyRows.length > 0 && ` · ${dirtyRows.length} unsaved change${dirtyRows.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          <SettingsSheet />
          <LoginArea />
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          <BulkToolbar
            selectedCount={selected.size}
            shippingOptions={shippingOptions}
            onBulkTitle={handleBulkTitle}
            onBulkDescription={handleBulkDescription}
            onBulkCategories={handleBulkCategories}
            onBulkPrice={handleBulkPrice}
            onBulkStatus={handleBulkStatus}
            onBulkShipping={handleBulkShipping}
            onBulkLocation={handleBulkLocation}
            onDuplicate={handleDuplicateSelected}
            onDelete={handleDeleteSelected}
          />
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-8 pl-8"
                placeholder="Filter by title, category, summary…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="on-sale">On sale</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="pre-order">Pre-order</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select
                value={sortKey}
                onValueChange={(v) => {
                  setSortKey(v as SortKey);
                  setSortDir(v === 'title' ? 'asc' : 'desc');
                }}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="title">Title A–Z</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="stock">Quantity</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDir === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading listings…
          </CardContent>
        </Card>
      )}

      {isError && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
            <p className="text-sm">Failed to load listings.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No listings found on your relays. Publish a kind 30402 listing from
            your market client and it will show up here.
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <ListingsTable
          rows={visibleRows}
          selected={selected}
          shippingOptions={shippingOptions}
          onToggleSelect={(id, checked) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id); else next.delete(id);
              return next;
            })
          }
          onToggleSelectAll={(checked) =>
            setSelected(checked ? new Set(visibleRows.map((r) => r.id)) : new Set())
          }
          onCellChange={handleCellChange}
          onToggleShipping={handleToggleShipping}
          onDuplicateRow={handleDuplicateRow}
        />
      )}

      {/* Sticky publish bar */}
      {dirtyRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleDiscard}
              disabled={isPublishing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button
              className="flex-1 h-12 text-base"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing
                ? 'Publishing…'
                : `Publish ${dirtyRows.length} change${dirtyRows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
