import { Checkbox } from '@/components/ui/checkbox';
import type { ShippingOption } from '@/lib/gamma';

interface ShippingPickerProps {
  options: ShippingOption[];
  selected: string[];
  onToggle: (ref: string, checked: boolean) => void;
}

/** Checkbox list of the user's kind-30406 shipping options. */
export function ShippingPicker({ options, selected, onToggle }: ShippingPickerProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No shipping options found. Publish kind 30406 shipping option events
        (e.g. from your market client) and they will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {options.map((opt) => (
        <label
          key={opt.ref}
          className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
        >
          <Checkbox
            checked={selected.includes(opt.ref)}
            onCheckedChange={(checked) => onToggle(opt.ref, checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-tight">
            <span className="font-medium">{opt.title}</span>
            <span className="block text-xs text-muted-foreground">
              {[
                opt.priceAmount && `${opt.priceAmount} ${opt.priceCurrency}`,
                opt.service,
                opt.countries.join(', '),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
