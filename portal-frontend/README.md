# portal-frontend

Protótipo de design/UX do portal financeiro — React + Vite + Tailwind CSS v4,
com **dados mockados** (sem integração com o `portal-backend` ainda). Serve
para validar fluxos de tela, hierarquia de acesso e apresentação dos
relatórios antes de plugar na API real.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Não precisa de `.env` nem de credenciais —
todos os dados (grupos, empresas, usuários, lançamentos) são gerados em
[src/data/](src/data/).

Na tela de login, qualquer e-mail/senha preenchidos entram (não há
autenticação real). O usuário padrão é o Super Admin (`Júlio Barcelos`).

## Estrutura

```
src/
  data/          # dados mockados: grupos econômicos, empresas, usuários,
                 # motor de cálculo de DRE/Balanço/Fluxo de Caixa
  context/       # AppContext: usuário logado, tema, escopo empresa/grupo
  components/    # Sidebar, Header, StatCard, ReportTree, modais etc.
  pages/
    auth/        # Login, Cadastro, confirmação por e-mail, recuperar senha
    dashboard/   # Visão geral com KPIs e gráficos
    relatorios/  # DRE, Balanço Patrimonial, Fluxo de Caixa
    admin/       # Grupos e Empresas, Usuários e acessos, Configurações, Uso
```

## Modelo de acesso

Reflete o modelo multi-tenant do `portal-backend` (grupo econômico com chave
de contrato, contendo várias empresas — ver `../portal-backend/README.md`),
acrescentando uma camada de usuários e papéis que ainda não existe no
backend:

- **Super Admin** — equipe interna, vê todos os grupos econômicos.
- **Admin do Grupo** — usuário do cliente, gerencia os usuários do próprio
  grupo e vê todas as empresas dele.
- **Usuário** — vê só as empresas e os relatórios (DRE/Balanço/Fluxo de
  Caixa) liberados especificamente para ele.

O botão flutuante **"Ver como..."** (canto inferior direito, só existe no
protótipo) troca o usuário logado para revisar como cada papel enxerga o
produto, sem precisar deslogar.

## Próximos passos

- Trocar os dados mockados de `src/data/financeiro.js` pelas chamadas reais
  ao `portal-backend` (`/api/contabil/balancete`, `/api/contabil/estrutura`).
- Autenticação real de usuário (o backend hoje só tem API key por
  cliente/grupo, não login individual).
- Persistir as permissões de usuário (empresas/relatórios liberados) e o
  cadastro de grupos/empresas, hoje só em estado local do React.
