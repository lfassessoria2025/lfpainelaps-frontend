import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface IndicatorToolbarProps {
  municipality: ReactNode;
  filters?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  activeFilters?: ReactNode;
}

export function IndicatorToolbar({
  municipality,
  filters,
  summary,
  actions,
  activeFilters,
}: IndicatorToolbarProps) {
  const hasContent = Boolean(filters || activeFilters);

  return (
    <Card size="sm" className="mb-3 gap-0 py-0 shadow-sm">
      <CardHeader className={cn("px-3 py-2.5", hasContent && "border-b")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-64">{municipality}</div>
          {summary || actions ? (
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              {summary}
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      {hasContent ? (
        <CardContent className="flex flex-col gap-2.5 px-3 py-3">
          {filters ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {filters}
            </div>
          ) : null}
          {activeFilters ? <div className="flex flex-col gap-2">{activeFilters}</div> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

interface IndicatorFilterFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function IndicatorFilterField({
  label,
  children,
  className,
}: IndicatorFilterFieldProps) {
  return (
    <Field className={cn("min-w-0 gap-1", className)}>
      <FieldLabel className="text-[11px] text-muted-foreground">{label}</FieldLabel>
      {children}
    </Field>
  );
}
