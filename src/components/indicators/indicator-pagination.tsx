import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function nearbyPages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

interface IndicatorPaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  ariaLabel: string;
}

export function IndicatorPagination({
  currentPage,
  totalPages,
  onChange,
  ariaLabel,
}: IndicatorPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 border-t pt-3" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Anterior</span>
      </Button>
      <div className="flex items-center gap-1" aria-label={`Página ${currentPage} de ${totalPages}`}>
        {nearbyPages(currentPage, totalPages).map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              className="min-w-8 px-2 tabular-nums"
              onClick={() => onChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
              aria-label={`Página ${page}`}
            >
              {page}
            </Button>
          ),
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight />
      </Button>
    </nav>
  );
}
