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
import { ShippingPicker } from './ShippingPicker';
import {
  LISTING_STATUSES,
  firstImage,
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
}: ListingsTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));

  return (
    <div className="rounded-lg border overflow-x-auto">
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
            const image = firstImage(row.sourceTags);
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
                  <div className="relative h-9 w-9 rounded overflow-hidden bg-muted flex items-center justify-center">
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
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
  );
}
