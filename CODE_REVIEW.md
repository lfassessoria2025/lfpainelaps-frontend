# Code Review — FLO-43

## Bloqueante

### O nome atualizado não é exibido no topbar

- Localização: `src/components/layout/app-topbar.tsx:48-51`
- Critério: “Nome atualizado reflete imediatamente no topbar.”
- Evidência: o componente continua renderizando apenas `user?.email`; não há leitura de
  `user?.name` no topbar. `ProfilePage` chama `setAuthenticatedUser` corretamente, mas a
  atualização do contexto não pode refletir um valor que o topbar não consome.
- Recomendação: exibir `user.name` no gatilho e/ou cabeçalho do menu, com fallback para o
  e-mail quando o nome for nulo, e estender `app-topbar.test.tsx` para atualizar o usuário e
  comprovar que o novo nome aparece imediatamente.

## Importante

### O nome não possui limite máximo coerente entre front e backend

- Localização relacionada: `src/pages/profile-page.tsx:97` e schema backend
  `app/schemas/auth.py:UpdateProfileRequest`.
- Evidência: somente vazio é rejeitado; o campo e a API aceitam texto arbitrariamente grande.
- Recomendação: definir um limite de produto único (por exemplo, 150 caracteres), aplicá-lo no
  schema Pydantic como fonte autoritativa e espelhar `maxLength`/mensagem no formulário.

## Veredito

Ainda não está pronto para merge. Corrigir o bloqueante e repetir QA/CR.

Skills consulted: saude-cr, api-design-principles, vercel-react-best-practices
