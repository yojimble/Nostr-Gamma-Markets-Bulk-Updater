import { useState } from 'react';
import {
  ChevronDown,
  Copy,
  FileText,
  ListChecks,
  MapPin,
  Pencil,
  Tags,
  Trash2,
  Type,
  Banknote,
  Truck,
  Eye,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ShippingPicker } from './ShippingPicker';
import { LISTING_STATUSES, type ListingStatus, type ShippingOption } from '@/lib/gamma';

export type TitleEditMode = 'replace' | 'set' | 'prefix' | 'suffix';
export type CategoryEditMode = 'add' | 'remove' | 'set';
export type PriceEditMode = 'set' | 'percent';
export type ShippingEditMode = 'add' | 'replace' | 'clear';
export type SpecEditMode = 'set' | 'remove';

interface BulkToolbarProps {
  selectedCount: number;
  shippingOptions: ShippingOption[];
  onBulkTitle: (mode: TitleEditMode, a: string, b: string) => void;
  onBulkDescription: (mode: TitleEditMode, a: string, b: string) => void;
  onBulkCategories: (mode: CategoryEditMode, categories: string) => void;
  onBulkPrice: (mode: PriceEditMode, amount: string, currency: string) => void;
  onBulkStatus: (status: ListingStatus) => void;
  onBulkShipping: (mode: ShippingEditMode, refs: string[]) => void;
  onBulkLocation: (location: string) => void;
  onBulkSpec: (mode: SpecEditMode, key: string, value: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

type OpenDialog = 'title' | 'description' | 'categories' | 'price' | 'shipping' | 'location' | 'specs' | null;

export function BulkToolbar({
  selectedCount,
  shippingOptions,
  onBulkTitle,
  onBulkDescription,
  onBulkCategories,
  onBulkPrice,
  onBulkStatus,
  onBulkShipping,
  onBulkLocation,
  onBulkSpec,
  onDuplicate,
  onDelete,
}: BulkToolbarProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  // Title dialog state
  const [titleMode, setTitleMode] = useState<TitleEditMode>('replace');
  const [titleA, setTitleA] = useState('');
  const [titleB, setTitleB] = useState('');

  // Description dialog state
  const [descMode, setDescMode] = useState<TitleEditMode>('replace');
  const [descA, setDescA] = useState('');
  const [descB, setDescB] = useState('');

  // Categories dialog state
  const [catMode, setCatMode] = useState<CategoryEditMode>('add');
  const [catInput, setCatInput] = useState('');

  // Price dialog state
  const [priceMode, setPriceMode] = useState<PriceEditMode>('set');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('');

  // Shipping dialog state
  const [shipMode, setShipMode] = useState<ShippingEditMode>('add');
  const [shipRefs, setShipRefs] = useState<string[]>([]);

  // Location dialog state
  const [locationInput, setLocationInput] = useState('');

  // Specs dialog state
  const [specMode, setSpecMode] = useState<SpecEditMode>('set');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  const disabled = selectedCount === 0;

  const close = () => setOpenDialog(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground tabular-nums min-w-[7rem]">
        {selectedCount} selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
            <ChevronDown className="h-4 w-4 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setOpenDialog('title')}>
            <Type className="h-4 w-4 mr-2" />
            Title…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDialog('description')}>
            <FileText className="h-4 w-4 mr-2" />
            Description…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDialog('categories')}>
            <Tags className="h-4 w-4 mr-2" />
            Categories…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDialog('price')}>
            <Banknote className="h-4 w-4 mr-2" />
            Price…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDialog('location')}>
            <MapPin className="h-4 w-4 mr-2" />
            Location…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDialog('specs')}>
            <ListChecks className="h-4 w-4 mr-2" />
            Specs…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setShipRefs([]);
              setOpenDialog('shipping');
            }}
          >
            <Truck className="h-4 w-4 mr-2" />
            Shipping…
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Eye className="h-4 w-4 mr-2" />
              Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {LISTING_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => onBulkStatus(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" disabled={disabled} onClick={onDuplicate}>
        <Copy className="h-4 w-4 mr-1.5" />
        Duplicate
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} listing{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This publishes a NIP-09 deletion request to your relays. Relays
              and clients that honour it will remove the listings; unpublished
              duplicates are simply discarded. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Title dialog ---- */}
      <Dialog open={openDialog === 'title'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit titles</DialogTitle>
            <DialogDescription>
              Applies to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={titleMode} onValueChange={(v) => setTitleMode(v as TitleEditMode)} className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="replace" /> Find &amp; replace
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="set" /> Set title
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="prefix" /> Add prefix
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="suffix" /> Add suffix
              </Label>
            </RadioGroup>
            {titleMode === 'replace' ? (
              <div className="space-y-2">
                <Input placeholder="Find…" value={titleA} onChange={(e) => setTitleA(e.target.value)} />
                <Input placeholder="Replace with…" value={titleB} onChange={(e) => setTitleB(e.target.value)} />
              </div>
            ) : (
              <Input
                placeholder={titleMode === 'set' ? 'New title' : titleMode === 'prefix' ? 'Prefix text' : 'Suffix text'}
                value={titleA}
                onChange={(e) => setTitleA(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={titleMode === 'replace' ? !titleA : !titleA.trim()}
              onClick={() => {
                onBulkTitle(titleMode, titleA, titleB);
                setTitleA('');
                setTitleB('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Description dialog ---- */}
      <Dialog open={openDialog === 'description'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit descriptions</DialogTitle>
            <DialogDescription>
              Applies to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}. Markdown supported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={descMode} onValueChange={(v) => setDescMode(v as TitleEditMode)} className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="replace" /> Find &amp; replace
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="set" /> Set description
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="prefix" /> Prepend
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="suffix" /> Append
              </Label>
            </RadioGroup>
            {descMode === 'replace' ? (
              <div className="space-y-2">
                <Input placeholder="Find…" value={descA} onChange={(e) => setDescA(e.target.value)} />
                <Input placeholder="Replace with…" value={descB} onChange={(e) => setDescB(e.target.value)} />
              </div>
            ) : (
              <Textarea
                rows={6}
                placeholder={descMode === 'set' ? 'New description' : descMode === 'prefix' ? 'Text to prepend' : 'Text to append'}
                value={descA}
                onChange={(e) => setDescA(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={!descA}
              onClick={() => {
                onBulkDescription(descMode, descA, descB);
                setDescA('');
                setDescB('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Categories dialog ---- */}
      <Dialog open={openDialog === 'categories'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit categories</DialogTitle>
            <DialogDescription>
              Comma-separated categories, applied to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={catMode} onValueChange={(v) => setCatMode(v as CategoryEditMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add categories</SelectItem>
                <SelectItem value="remove">Remove categories</SelectItem>
                <SelectItem value="set">Replace all categories</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="e.g. electronics, vintage, handmade"
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={catMode !== 'set' && !catInput.trim()}
              onClick={() => {
                onBulkCategories(catMode, catInput);
                setCatInput('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Price dialog ---- */}
      <Dialog open={openDialog === 'price'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit price</DialogTitle>
            <DialogDescription>
              Applies to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={priceMode} onValueChange={(v) => setPriceMode(v as PriceEditMode)} className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="set" /> Set price
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="percent" /> Adjust by %
              </Label>
            </RadioGroup>
            {priceMode === 'set' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Amount"
                  inputMode="decimal"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                />
                <Input
                  placeholder="Currency (e.g. USD, SAT)"
                  className="w-40"
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                />
              </div>
            ) : (
              <Input
                placeholder="Percent change, e.g. 10 or -15"
                inputMode="decimal"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={!priceAmount.trim() || Number.isNaN(Number(priceAmount))}
              onClick={() => {
                onBulkPrice(priceMode, priceAmount, priceCurrency);
                setPriceAmount('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Location dialog ---- */}
      <Dialog open={openDialog === 'location'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit location</DialogTitle>
            <DialogDescription>
              Applies to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
              Leave empty to remove the location.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Berlin, Germany"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              onClick={() => {
                onBulkLocation(locationInput.trim());
                setLocationInput('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Specs dialog ---- */}
      <Dialog open={openDialog === 'specs'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk edit specs</DialogTitle>
            <DialogDescription>
              Applies to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
              Spec names match exactly (case-sensitive).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={specMode} onValueChange={(v) => setSpecMode(v as SpecEditMode)} className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="set" /> Set spec
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                <RadioGroupItem value="remove" /> Remove spec
              </Label>
            </RadioGroup>
            <div className="flex gap-2">
              <Input
                placeholder="Name, e.g. author"
                className={specMode === 'set' ? 'w-40' : undefined}
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
              />
              {specMode === 'set' && (
                <Input
                  placeholder="Value"
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                />
              )}
            </div>
            {specMode === 'set' && (
              <p className="text-xs text-muted-foreground">
                Replaces the value where the name already exists; adds the spec otherwise.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={!specKey.trim()}
              onClick={() => {
                onBulkSpec(specMode, specKey.trim(), specValue.trim());
                setSpecKey('');
                setSpecValue('');
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Shipping dialog ---- */}
      <Dialog open={openDialog === 'shipping'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply shipping options</DialogTitle>
            <DialogDescription>
              Your published shipping options (kind 30406), applied to {selectedCount} selected listing{selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={shipMode} onValueChange={(v) => setShipMode(v as ShippingEditMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add to existing options</SelectItem>
                <SelectItem value="replace">Replace existing options</SelectItem>
                <SelectItem value="clear">Remove all shipping options</SelectItem>
              </SelectContent>
            </Select>
            {shipMode !== 'clear' && (
              <ShippingPicker
                options={shippingOptions}
                selected={shipRefs}
                onToggle={(ref, checked) =>
                  setShipRefs((prev) =>
                    checked ? [...prev, ref] : prev.filter((r) => r !== ref),
                  )
                }
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              disabled={shipMode !== 'clear' && shipRefs.length === 0}
              onClick={() => {
                onBulkShipping(shipMode, shipRefs);
                close();
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
