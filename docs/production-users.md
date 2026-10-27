# Usuários de produção

O acesso exclusivo fica em `/producao`. Depois do login por cartão e unidade, o usuário vai para `/producao/atividades`, com filtro por nome, cards e o widget de apontamento. São listadas apenas as atividades não excluídas das equipes ativas das quais o colaborador é membro. Sem vínculo com equipes, a lista fica vazia. Atividades concluídas ou canceladas não podem ser iniciadas. O início do apontamento também exige esse vínculo no backend, inclusive em chamadas diretas à API.

A atividade em andamento do colaborador aparece primeiro, com destaque azul. Em seguida aparecem suas atividades apontadas mais recentemente, da mais recente para a mais antiga, e as ainda não apontadas em ordem alfabética. As encerradas ficam sempre no fim, com aparência apagada. O histórico é consultado por colaborador e mantido após sair ou recarregar a página.

O apontamento em andamento pode ser pausado pelo botão **Pausar** no próprio card ou pelo widget. As duas ações mantêm o card e o widget sincronizados.

`User.production` tem valor padrão `false`, inclusive para os usuários existentes. No diálogo de criação, a opção **Usuário de produção** começa desmarcada. Contas de produção usam a função `USER` e não entram pelo login comum.

## Sessão e segurança

- A sessão de produção é persistida no banco e expira após 15 segundos sem interação. A API confere esse prazo em cada requisição, mesmo que o JWT ainda não tenha expirado.
- Apenas interações na interface enviam a renovação. Consultas, renderizações e polling não renovam a sessão.
- O token fica em `sessionStorage`, sem refresh token. O contador usa um prazo absoluto, preservado ao recarregar a página.
- A API permite apenas autenticação da própria sessão, consulta das atividades, consulta do apontamento atual, início de atividade e pausa. Rotas administrativas, projetos, tarefas, relatórios, timeline e chaves de integração ficam bloqueadas.
- O login sem senha tem limite de tentativas por IP. Contas comuns e inativas são recusadas, assim como a unidade incorreta.
- A saída automática limpa a interface imediatamente. Ela não pausa o apontamento: o trabalho continua e o widget volta no próximo login.
- A remoção do acesso ou o reset de senha revogam também as sessões de produção.

## Implantação

No backend, execute `npm run db:generate`, `npx prisma migrate deploy` e `npm run build`. A migration `20261022120000_production_users` adiciona o campo e a tabela de sessões sem alterar os demais dados dos usuários.

No frontend, execute `npm run build`. Publique as rotas da SPA com fallback para `index.html`, como no fluxo existente.

## Testes

Execute `npm test` tanto no backend quanto no frontend.

O teste real de navegador usa Playwright, uma conta administrativa e um funcionário que possa ser cadastrado pela integração existente. Configure estas variáveis antes de executar `npm run test:browser` no frontend:

| Variável | Uso |
| --- | --- |
| `KAIRO_WEB_URL` | Endereço do front; padrão `http://localhost:5173` |
| `KAIRO_API_URL` | Endereço da API; padrão `http://localhost:3000/api` |
| `KAIRO_ADMIN_CARD` | Cartão administrativo |
| `KAIRO_ADMIN_UNIT` | Unidade administrativa |
| `KAIRO_ADMIN_PASSWORD` | Senha administrativa |
| `KAIRO_PRODUCTION_CARD` | Cartão da conta de produção |
| `KAIRO_PRODUCTION_UNIT` | Unidade da conta de produção |
| `KAIRO_BROWSER` | Canal do navegador instalado; padrão `msedge` |

O teste verifica a criação pela interface, os valores padrão, a tooltip, os dois tipos de login, o filtro, início/pausa/retomada, o bloqueio de rotas, o contador, a expiração com polling, a preservação do apontamento e a tela móvel. Também verifica a listagem de vários times vinculados, a exclusão de times sem vínculo e o bloqueio do início de apontamentos após remover um membro. Ele mantém a conta de produção criada, remove as atividades temporárias e desativa as equipes criadas para o teste. Resultados e capturas ficam em `frontend/test-results/production/`, ignorados pelo Git.

## Auditoria de dependências em 22/10/2026

O `npm audit` do frontend reportou 25 vulnerabilidades na árvore de dependências anterior a esta implementação: 5 moderadas, 19 altas e 1 crítica. A crítica foi atribuída à dependência transitiva `proxy-addr`. As entradas novas do lockfile são apenas Playwright e suas dependências de testes, sem achados no relatório. As versões dos demais pacotes foram preservadas. O relatório pode ser reproduzido com `npm audit --json` no frontend.
