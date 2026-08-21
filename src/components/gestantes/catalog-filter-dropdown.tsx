import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Dropdown de filtro multi-seleção sobre um catálogo carregado à parte (ex.:
 * equipes ou micro-áreas de uma prefeitura) — mesmo padrão nos dois desde o
 * FLO-53/FLO-81, extraído aqui para não duplicar o terceiro filtro que surgir.
 */
export interface CatalogFilterDropdownProps<T> {
  label: string;
  ariaLabel: string;
  groupLabel: string;
  loadingLabel: string;
  summaryLabel: string;
  items: T[] | null;
  selectedKeys: string[];
  getKey: (item: T) => string;
  getPrimaryLabel: (item: T) => string;
  getSecondaryLabel: (item: T) => string;
  onToggle: (key: string, selected: boolean) => void;
}

export function CatalogFilterDropdown<T>({
  label,
  ariaLabel,
  groupLabel,
  loadingLabel,
  summaryLabel,
  items,
  selectedKeys,
  getKey,
  getPrimaryLabel,
  getSecondaryLabel,
  onToggle,
}: CatalogFilterDropdownProps<T>) {
  return (
    <div className="flex min-w-52 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="justify-between font-normal" />}
          aria-label={ariaLabel}
          disabled={items === null || items.length === 0}
        >
          <span className="truncate">{items === null ? loadingLabel : summaryLabel}</span>
          <ChevronDown data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{groupLabel}</DropdownMenuLabel>
            {items?.map((item) => {
              const key = getKey(item);
              return (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={selectedKeys.includes(key)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => onToggle(key, checked)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{getPrimaryLabel(item)}</span>
                    <span className="text-xs text-muted-foreground">{getSecondaryLabel(item)}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
