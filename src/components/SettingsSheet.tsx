import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Settings, Truck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUserShippingOptions } from '@/hooks/useUserShippingOptions';
import { SHIPPING_KIND } from '@/lib/gamma';

const SHIPPING_SERVICES = ['standard', 'express', 'overnight', 'pickup'] as const;

export function SettingsSheet() {
  const { user } = useCurrentUser();
  const { data: shippingOptions = [] } = useUserShippingOptions();
  const { mutateAsync: publishEvent, isPending: isPublishing } = useNostrPublish();
  const queryClient = useQueryClient();

  // New shipping option form
  const [shipTitle, setShipTitle] = useState('');
  const [shipPrice, setShipPrice] = useState('');
  const [shipCurrency, setShipCurrency] = useState('');
  const [shipService, setShipService] = useState<string>('standard');
  const [shipCountries, setShipCountries] = useState('');
  const [shipLocation, setShipLocation] = useState('');

  const handlePublishShipping = async () => {
    const countries = [...new Set(
      shipCountries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
    )];
    if (!shipTitle.trim() || !shipPrice.trim() || !shipCurrency.trim() || countries.length === 0) {
      toast.error('Title, price, currency and at least one country are required.');
      return;
    }

    const tags: string[][] = [
      ['d', crypto.randomUUID()],
      ['title', shipTitle.trim()],
      ['price', shipPrice.trim(), shipCurrency.trim().toUpperCase()],
      ...countries.map((c) => ['country', c]),
      ['service', shipService],
    ];
    if (shipLocation.trim()) tags.push(['location', shipLocation.trim()]);

    try {
      await publishEvent({ kind: SHIPPING_KIND, content: shipTitle.trim(), tags });
      toast.success('Shipping option published.');
      setShipTitle('');
      setShipPrice('');
      setShipCurrency('');
      setShipCountries('');
      setShipLocation('');
      await queryClient.invalidateQueries({ queryKey: ['shipping-options'] });
    } catch {
      toast.error('Failed to publish shipping option.');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Manage your shipping options. Listings are read from and published
            to the relays on your Nostr profile.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* ---- Shipping options ---- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <h3 className="text-sm font-medium">Shipping options</h3>
            </div>

            {shippingOptions.length > 0 ? (
              <ul className="space-y-1">
                {shippingOptions.map((opt) => (
                  <li key={opt.ref} className="text-sm rounded-md border px-2 py-1.5">
                    <span className="font-medium">{opt.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[
                        opt.priceAmount && `${opt.priceAmount} ${opt.priceCurrency}`,
                        opt.service,
                        opt.countries.join(', '),
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No shipping options published yet. Create one below (kind 30406).
              </p>
            )}

            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium">New shipping option</p>
              <Input
                placeholder="Title, e.g. UK Standard"
                value={shipTitle}
                onChange={(e) => setShipTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Price"
                  inputMode="decimal"
                  value={shipPrice}
                  onChange={(e) => setShipPrice(e.target.value)}
                />
                <Input
                  placeholder="Currency (GBP)"
                  className="w-32 uppercase"
                  value={shipCurrency}
                  onChange={(e) => setShipCurrency(e.target.value)}
                />
              </div>
              <Select value={shipService} onValueChange={setShipService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Countries, ISO codes: GB, DE, FR"
                value={shipCountries}
                onChange={(e) => setShipCountries(e.target.value)}
              />
              <Input
                placeholder="Location (optional, for pickup)"
                value={shipLocation}
                onChange={(e) => setShipLocation(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handlePublishShipping}
                disabled={isPublishing || !user}
              >
                {isPublishing ? 'Publishing…' : 'Publish shipping option'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
