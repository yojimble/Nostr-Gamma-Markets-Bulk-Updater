import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, ImageOff, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ImageEditor } from './ImageEditor';
import { ShippingPicker } from './ShippingPicker';
import {
  LISTING_STATUSES,
  isRowDirty,
  type ListingData,
  type ListingRow,
  type ListingStatus,
  type ShippingOption,
} from '@/lib/gamma';

interface ListingsTableProps {
  rows: ListingRow[];
  selected: Set<string>;
  shippingOptions: ShippingOption[];
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onCellChange: (id: string, patch: Partial<ListingData>) => void;
  onToggleShipping: (id: string, ref: string, checked: boolean) => void;
  onDuplicateRow: (id: string) => void;
  /** Pixels of fixed UI (the publish bar) covering the bottom of the viewport. */
  bottomOffset?: number;
}

const cellInput =
  'h-8 rounded-sm border-transparent bg-transparent px-2 shadow-none ' +
  'hover:border-input focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0';

export function ListingsTable({
  rows,
  selected,
  shippingOptions,
  onToggleSelect,
  onToggleSelectAll,
  onCellChange,
  onToggleShipping,
  onDuplicateRow,
  bottomOffset = 0,
}: ListingsTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));

  const containerRef = useRef<HTMLDivElement>(null);
  // The element that actually scrolls sideways — resolved in the effect below.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  // Set while mirroring one element's scroll onto the other, so the resulting
  // scroll event doesn't bounce straight back.
  const syncing = useRef(false);
  const [bar, setBar] = useState({ show: false, left: 0, width: 0, content: 0 });

  const mirror = useCallback((from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  // The table's own scrollbar sits at the bottom of a very tall element, so it
  // is off-screen whenever the page is scrolled anywhere but the end. Mirror it
  // into a bar pinned to the viewport while that's the case.
  useEffect(() => {
    // shadcn's <Table> renders its own `overflow-auto` wrapper around the
    // <table>; that wrapper — not our container — is what scrolls.
    const el = containerRef.current?.firstElementChild;
    if (!(el instanceof HTMLDivElement)) return;
    scrollerRef.current = el;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const floor = window.innerHeight - bottomOffset;
      setBar({
        // Only while the real scrollbar is out of view and there is overflow.
        show: el.scrollWidth > el.clientWidth + 1 && rect.bottom > floor && rect.top < floor,
        left: rect.left,
        width: rect.width,
        content: el.scrollWidth,
      });
    };
    const onScroll = () => mirror(el, barRef.current);

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [bottomOffset, mirror, rows.length]);

  // Adopt the table's current offset the moment the floating bar mounts.
  const attachBar = useCallback((node: HTMLDivElement | null) => {
    barRef.current = node;
    if (node && scrollerRef.current) node.scrollLeft = scrollerRef.current.scrollLeft;
  }, []);

  return (
    <>
    <div ref={containerRef} className="rounded-lg border overflow-hidden">
      <Table className="min-w-[1400px]">
        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="min-w-[220px]">Title</TableHead>
            <TableHead className="min-w-[220px]">Description</TableHead>
            <TableHead className="min-w-[200px]">Summary</TableHead>
            <TableHead className="w-28">Price</TableHead>
            <TableHead className="w-24">Currency</TableHead>
            <TableHead className="w-20">Quantity</TableHead>
            <TableHead className="min-w-[180px]">Categories</TableHead>
            <TableHead className="min-w-[140px]">Location</TableHead>
            <TableHead className="w-28">Shipping</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const dirty = isRowDirty(row);
            const image = row.data.images[0]?.url;
            const isSelected = selected.has(row.id);
            return (
              <TableRow
                key={row.id}
                data-state={isSelected ? 'selected' : undefined}
                className={cn(dirty && 'bg-amber-50 dark:bg-amber-950/30')}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelect(row.id, checked === true)}
                    aria-label={`Select ${row.data.title || row.id}`}
                  />
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="relative h-9 w-9 rounded overflow-hidden bg-muted flex items-center justify-center ring-offset-background hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Edit images"
                      >
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        {row.data.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[9px] leading-3 tabular-nums text-white">
                            {row.data.images.length}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="start">
                      <ImageEditor
                        images={row.data.images}
                        onChange={(images) => onCellChange(row.id, { images })}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Input
                      className={cn(cellInput, 'font-medium')}
                      value={row.data.title}
                      onChange={(e) => onCellChange(row.id, { title: e.target.value })}
                      placeholder="(untitled)"
                    />
                    {row.isNew && <Badge variant="secondary" className="shrink-0">new</Badge>}
                    {dirty && !row.isNew && <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-600">edited</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 w-56 rounded-sm px-2 text-left text-sm truncate hover:bg-muted/60 text-foreground/90"
                        title="Edit description"
                      >
                        {row.data.description
                          ? row.data.description
                          : <span className="text-muted-foreground">—</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="start">
                      <p className="text-sm font-medium mb-2">Description (markdown)</p>
                      <Textarea
                        rows={8}
                        value={row.data.description}
                        onChange={(e) => onCellChange(row.id, { description: e.target.value })}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Input
                    className={cellInput}
                    value={row.data.summary}
                    onChange={(e) => onCellChange(row.id, { summary: e.target.value })}
                    placeholder="—"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={cn(cellInput, 'tabular-nums')}
                    inputMode="decimal"
                    value={row.data.priceAmount}
                    onChange={(e) => onCellChange(row.id, { priceAmount: e.target.value })}
                    placeholder="—"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={cn(cellInput, 'uppercase')}
                    value={row.data.priceCurrency}
                    onChange={(e) => onCellChange(row.id, { priceCurrency: e.target.value })}
                    placeholder="USD"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={cn(cellInput, 'tabular-nums')}
                    inputMode="numeric"
                    value={row.data.stock}
                    onChange={(e) => onCellChange(row.id, { stock: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="—"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={cellInput}
                    value={row.data.categories}
                    onChange={(e) => onCellChange(row.id, { categories: e.target.value })}
                    placeholder="comma, separated"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={cellInput}
                    value={row.data.location}
                    onChange={(e) => onCellChange(row.id, { location: e.target.value })}
                    placeholder="—"
                  />
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                        <Truck className="h-4 w-4" />
                        <span className="tabular-nums">{row.data.shippingRefs.length}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <p className="text-sm font-medium mb-2">Shipping options</p>
                      <ShippingPicker
                        options={shippingOptions}
                        selected={row.data.shippingRefs}
                        onToggle={(ref, checked) => onToggleShipping(row.id, ref, checked)}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Select
                    value={row.data.status}
                    onValueChange={(v) => onCellChange(row.id, { status: v as ListingStatus })}
                  >
                    <SelectTrigger className="h-8 rounded-sm border-transparent shadow-none hover:border-input focus:ring-1 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Duplicate listing"
                    onClick={() => onDuplicateRow(row.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

    {bar.show && (
      <div
        className="fixed z-30"
        style={{ left: bar.left, width: bar.width, bottom: bottomOffset }}
      >
        <div
          ref={attachBar}
          onScroll={() => mirror(barRef.current, scrollerRef.current)}
          className="floating-scrollbar overflow-x-scroll overflow-y-hidden rounded-t border-x border-t bg-background/90 backdrop-blur"
          aria-hidden
        >
          <div style={{ width: bar.content, height: 1 }} />
        </div>
      </div>
    )}
    </>
  );
}
