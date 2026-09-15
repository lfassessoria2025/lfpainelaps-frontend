import { useState, type ComponentProps } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyState,
} from "@/lib/password-policy";
import { cn } from "@/lib/utils";

interface PasswordFieldProps extends Omit<ComponentProps<typeof Input>, "type"> {
  visibilityLabel: string;
}

export function PasswordField({
  className,
  visibilityLabel,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

export function PasswordRequirements({ value }: { value: string }) {
  const state = passwordPolicyState(value);
  const requirements = [
    {
      met: state.hasMinimumLength,
      label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
    },
    { met: state.hasSpecialCharacter, label: "Pelo menos 1 caractere especial" },
  ];

  return (
    <ul className="grid gap-1 text-xs" aria-label="Requisitos da senha" aria-live="polite">
      {requirements.map(({ met, label }) => {
        const Icon = met ? Check : Circle;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export function PasswordMatchFeedback({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  if (!confirmation) return null;
  const matches = password === confirmation;
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs",
        matches ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
      )}
      aria-live="polite"
    >
      {matches ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
      {matches ? "As senhas coincidem." : "As senhas ainda não coincidem."}
    </p>
  );
}
