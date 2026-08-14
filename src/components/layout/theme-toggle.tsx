import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Alterna claro/escuro. O CSS dos dois temas já existe em index.css (bloco
 * `.dark`); este componente só liga o toggle real (FLO-32).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Evita mismatch entre o primeiro render (sem saber o tema real ainda) e o
  // valor definitivo do next-themes — mesmo padrão recomendado pela lib.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const escuro = montado && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
    >
      {montado ? escuro ? <Sun /> : <Moon /> : null}
    </Button>
  );
}
