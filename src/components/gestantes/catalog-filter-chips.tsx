import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Chips das seleções ativas de um CatalogFilterDropdown, com botão "Limpar". */
export interface CatalogFilterChipsProps {
  selectedKeys: string[];
  getLabel: (key: string) => string;
  clearLabel: string;
  onClear: () => void;
}

export function CatalogFilterChips({
  selectedKeys,
  getLabel,
  clearLabel,
  onClear,
}: CatalogFilterChipsProps) {
  if (selectedKeys.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedKeys.map((chave) => (
        <Badge key={chave} variant="outline">
          {getLabel(chave)}
        </Badge>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        {clearLabel}
      </Button>
    </div>
  );
}
