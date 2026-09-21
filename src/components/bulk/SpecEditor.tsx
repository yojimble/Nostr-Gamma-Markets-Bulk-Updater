import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ListingSpec } from '@/lib/gamma';

interface SpecEditorProps {
  specs: ListingSpec[];
  onChange: (specs: ListingSpec[]) => void;
}

/** Key/value list for a listing's `spec` tags. */
export function SpecEditor({ specs, onChange }: SpecEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const replaceAt = (index: number, spec: ListingSpec) =>
    onChange(specs.map((s, i) => (i === index ? spec : s)));

  const addSpec = () => {
    const key = newKey.trim();
    if (!key) return;
    onChange([...specs, { key, value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Specifications{specs.length > 0 && <span className="text-muted-foreground"> · {specs.length}</span>}
      </p>

      {specs.length === 0 && (
        <p className="text-sm text-muted-foreground">No specifications on this listing yet.</p>
      )}

      <div className="space-y-1.5">
        {specs.map((spec, index) => (
          <div key={index} className="flex items-center gap-1">
            <Input
              className="h-8 w-32 text-xs"
              value={spec.key}
              onChange={(e) => replaceAt(index, { ...spec, key: e.target.value })}
              placeholder="key"
              aria-label="Spec key"
            />
            <Input
              className="h-8 flex-1 text-xs"
              value={spec.value}
              onChange={(e) => replaceAt(index, { ...spec, value: e.target.value })}
              placeholder="value"
              aria-label="Spec value"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              title="Remove spec"
              onClick={() => onChange(specs.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t pt-3">
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            addSpec();
          }}
        >
          <Input
            className="h-8 w-32 text-xs"
            value={newKey}
            placeholder="e.g. author"
            onChange={(e) => setNewKey(e.target.value)}
          />
          <Input
            className="h-8 flex-1 text-xs"
            value={newValue}
            placeholder="e.g. Satoshi"
            onChange={(e) => setNewValue(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm" className="h-8" disabled={!newKey.trim()}>
            Add
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Published as <code>["spec", key, value]</code> tags. Rows with an empty key are dropped.
        </p>
      </div>
    </div>
  );
}
