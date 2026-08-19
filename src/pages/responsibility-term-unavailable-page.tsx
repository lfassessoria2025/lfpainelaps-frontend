import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/contexts/auth-context";

/**
 * Estado de indisponibilidade (HTTP 503), não de pendência de aceite (428, ver
 * ResponsibilityTermPage): nenhum termo foi publicado ainda, então não há o que
 * ler/aceitar. O painel (`/`) não depende de dado de saúde, é sempre um destino
 * seguro — diferente do 428, não há "rota pretendida" útil para retomar aqui.
 */
export function ResponsibilityTermUnavailablePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Acesso a dados de saúde temporariamente indisponível"
        description="O termo de responsabilidade e sigilo ainda não foi publicado para esta instituição."
      />

      <Alert>
        <AlertTitle>Não é um erro do seu usuário</AlertTitle>
        <AlertDescription>
          Por exigência de segurança, o acesso a dados de saúde só é liberado depois que o termo de
          responsabilidade estiver publicado. Assim que a publicação for concluída, o acesso volta a
          funcionar normalmente — não é necessário fazer nada além de tentar novamente mais tarde.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void logout()}>
          Sair
        </Button>
        <Button onClick={() => navigate("/", { replace: true })}>Voltar ao painel</Button>
      </div>
    </div>
  );
}
