// SheetField — campo individual da Folha do Operador.
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'date';
  rows?: number;
}

export function SheetField({ label, value, onChange, placeholder, type = 'text', rows = 2 }: Props) {
  return (
    <div className="space-y-1">
      <Label className="text-label uppercase text-muted-foreground">{label}</Label>
      {type === 'textarea' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="bg-transparent"
        />
      ) : (
        <Input
          type={type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent"
        />
      )}
    </div>
  );
}
