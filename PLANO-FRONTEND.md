# Plano — Frontend da Plataforma de Dados de Saúde

> Repo vazio (greenfield). Este documento guia as fases de implementação. Backend já
> implementado e revisado em `../saude-backend` — ler `../saude-backend/CONTEXTO.md` e
> `../saude-backend/docs/PREFERENCES-saude.md` antes de começar (produto, LGPD, convenções).

## Produto (resumo — ver CONTEXTO.md do backend para o contrato completo)

SPA para uma cliente que analisa dados de prefeituras a partir do backup semanal (dump
PostgreSQL) do e-SUS APS PEC. O front É SÓ INTERFACE: nenhuma lógica de autorização ou
regra de negócio aqui — tudo isso já está no backend (FastAPI, autorizado no usecase).
Dado de saúde sob LGPD: nunca renderizar/logar CPF/CNS além do estritamente necessário
(hoje nenhuma tela ainda expõe paciente — é metadado de dump e RBAC).

## Stack obrigatória

React + Vite + TypeScript. Tailwind + shadcn/ui para os componentes (consultar a skill
`shadcn` antes de montar qualquer tela). Roteamento com react-router. Cliente HTTP fino
(fetch com `credentials: "include"` — a sessão é por cookie httpOnly, não bearer token,
ver `app/core/config.py` do backend: `access_cookie_name`/`refresh_cookie_name`).

## Mandato de design

Este front precisa ser **excelente visualmente**, não só funcional. Antes de desenhar
qualquer tela, invocar via tool `Skill`:
- `ui-ux-pro-max` — para escolher estilo, paleta, tipografia e padrões de layout coerentes
  entre todas as telas (definir isso na Fase 0 e não redecidir tela a tela).
- `shadcn` — componentes de UI (tabelas, formulários, modais, badges de status, etc).
- `vercel-react-best-practices` — performance e padrões idiomáticos de React/Vite.
- `theme-factory` — tema consistente (cores, modo claro/escuro) aplicado desde a Fase 0.
- `dataviz` — quando chegar a telas com gráfico/indicador (fora do escopo das fases abaixo).
- `typescript-advanced-types` — tipos do contrato de API (ver seção "Contrato da API").

Não é permitido "HTML cru com Tailwind" tela a tela sem consistência — o tema e os
padrões de componente decididos na Fase 0 valem para todas as fases seguintes.

## Gate obrigatório (toda fase, antes de considerar pronto)

```
npm run lint
npm run build
```

Ambos devem sair 0. Reportar a saída real, nunca declarar sucesso sem rodar.

## Contrato da API já disponível (backend `developer`, revisado e mergeado)

Base: sessão via cookie (`POST /auth/login` seta cookies; `credentials: "include"` em
todo fetch). Prefixo de rotas de tenant: `/prefeituras/{prefeitura_id}/...`.

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`,
  `POST /auth/accept-invite`
- `GET /permissions` — catálogo fixo de permissões (RBAC)
- `GET /roles`, `GET /roles/{id}`, `POST /roles`, `PUT /roles/{id}`, `DELETE /roles/{id}`
- `POST /users/invitations`, `PUT /users/{user_id}/role`
- `GET /prefeituras`, `GET /prefeituras/{id}`, `POST /prefeituras`,
  `PUT /prefeituras/{id}`, `POST /prefeituras/{id}/activate`,
  `POST /prefeituras/{id}/deactivate`, `PUT /prefeituras/users/{user_id}`
- `POST /prefeituras/{id}/imports` (iniciar), `POST .../imports/{public_id}/upload-instructions`,
  `POST .../imports/{public_id}/upload-confirmation`, `GET .../imports` (lista),
  `GET .../imports/{public_id}` (detalhe, com `status` e `last_failure_code`)

Todo endpoint 403/404 já é decidido pelo backend (isolamento de prefeitura, RBAC) — o
front só precisa tratar a resposta (redirecionar, mostrar mensagem), nunca decidir se o
usuário "pode" fazer algo além de esconder ações que dariam erro óbvio de UX.

## Fases (uma antes da próxima, cada uma com gate verde e commit)

0. **Fundação**: scaffold Vite+React+TS, Tailwind+shadcn instalados e configurados, tema
   definido (theme-factory), layout base (topbar/sidebar, estado vazio, loading, erro),
   cliente HTTP fino tipado, roteamento com rotas protegidas (placeholder de auth).
1. **Auth**: tela de login, aceite de convite (`accept-invite`), bootstrap de sessão via
   `GET /auth/me`, logout, guarda de rota (redireciona pra login se 401).
2. **RBAC — cargos e permissões**: lista/criação/edição/exclusão de cargos consumindo
   `/roles` + `/permissions`; convite de funcionário e atribuição de cargo.
3. **Prefeituras**: lista, criação, edição, ativar/desativar, atribuir usuário a
   prefeitura.
4. **Importações (upload de dump + acompanhamento)**: iniciar importação, fluxo de
   upload (presigned PUT + confirmação), lista com status (usar os novos endpoints GET),
   detalhe com `last_failure_code` explicado de forma legível ao usuário, polling ou
   atualização manual de status enquanto `restaurando`/`restaurando_arquivo`.

Fora de escopo por enquanto: telas de relatório/gráfico (dependem do worker de extração
de indicadores, ainda não implementado no backend).

## Como trabalhar

Fatiar pequeno, uma fase por vez, gate verde antes de avançar, commit ao fim de cada
incremento verificável (sem push — push só quando pedido). Se algo exigir decisão de
produto (não só de implementação), registrar a dúvida e seguir com a opção mais simples
documentada no commit, em vez de travar a fase inteira.
