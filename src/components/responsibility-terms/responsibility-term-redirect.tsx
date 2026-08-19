import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RESPONSIBILITY_TERM_REQUIRED_EVENT } from "@/lib/responsibility-term-events";

const TERM_PATH = "/termo-responsabilidade";

export function ResponsibilityTermRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function redirect() {
      if (location.pathname === TERM_PATH) return;
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      navigate(`${TERM_PATH}?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    }
    window.addEventListener(RESPONSIBILITY_TERM_REQUIRED_EVENT, redirect);
    return () => window.removeEventListener(RESPONSIBILITY_TERM_REQUIRED_EVENT, redirect);
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}
