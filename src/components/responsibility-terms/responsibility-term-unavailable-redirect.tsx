import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RESPONSIBILITY_TERM_UNAVAILABLE_EVENT } from "@/lib/responsibility-term-events";

const UNAVAILABLE_PATH = "/termo-indisponivel";

/**
 * Sem "rota pretendida" para retomar (diferente do ResponsibilityTermRedirect,
 * 428): indisponibilidade é de configuração da instituição, não do usuário, e
 * qualquer tela de dado de saúde vai bater no mesmo 503 de novo.
 */
export function ResponsibilityTermUnavailableRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function redirect() {
      if (location.pathname === UNAVAILABLE_PATH) return;
      navigate(UNAVAILABLE_PATH, { replace: true });
    }
    window.addEventListener(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT, redirect);
    return () => window.removeEventListener(RESPONSIBILITY_TERM_UNAVAILABLE_EVENT, redirect);
  }, [location.pathname, navigate]);

  return null;
}
