# Perfil e recuperação de senha

Colaboradores comuns (`production=false`), de qualquer função, acessam **Perfil** pelo menu do nome na sidebar. O cadastro de e-mail é opcional e pertence ao próprio colaborador. Nome, cartão e unidade são apenas consultados nessa página. O e-mail não integra as listagens gerais nem as respostas de autenticação.

## Cadastro e confirmação

A tabela `user_emails` mantém um registro por usuário, com endereço confirmado, data de confirmação e endereço pendente. A migration cria registros nulos para as contas comuns existentes. Novas contas comuns, inclusive as criadas pelo seed, recebem o registro. Endereços iguais em contas diferentes são permitidos: a identificação da conta continua sendo cartão e unidade.

Cadastrar ou substituir um endereço envia uma confirmação válida por **24 horas**. O endereço anterior continua disponível para recuperação enquanto o novo não for confirmado. O link abre `/confirmar-email`; o colaborador precisa clicar em **Confirmar e-mail**. Abrir o link, inclusive por scanners de segurança de e-mail, não altera dados.

É possível reenviar a confirmação, atualizar a página com **Já confirmei** ou remover os endereços confirmado e pendente. A remoção exige confirmação na interface e invalida os links associados. Conversões para produção preservam o contato, bloqueiam seu uso e invalidam links e sessões. Ao retornar ao acesso comum, o endereço confirmado pode voltar a ser usado. Inativação, restauração e redefinições administrativas também invalidam links e sessões anteriores.

## Recuperação

No login comum, **Esqueci minha senha** usa somente cartão e unidade; não exige a senha atual.

- Com endereço confirmado, envia um link de redefinição válido por **30 minutos**.
- Com apenas endereço pendente, reenvia a confirmação. Depois de confirmar, o colaborador solicita a recuperação novamente.
- Sem nenhum endereço, informa: “Não há e-mail cadastrado para esta conta. Contate a equipe de automação para redefinir sua senha.”
- Para conta inexistente, inativa ou de produção, responde genericamente e não envia e-mail.

`/redefinir-senha` recebe a nova senha e sua confirmação. Mantém as regras atuais: senha não vazia, confirmação igual e proibição da senha padrão. O reset consome o token, altera o hash, encerra o primeiro acesso, invalida os demais links e revoga as sessões. Após o sucesso, o colaborador entra normalmente com a nova senha. Um aviso é enviado ao endereço confirmado; falha nesse aviso não desfaz a troca concluída.

As duas páginas de links funcionam com ou sem sessão, inclusive durante o primeiro acesso. Tokens chegam no fragmento da URL (`#token=...`), que não é enviado ao servidor web. A interface guarda o token em memória e remove o fragmento do endereço. Ao recarregar a página antes de concluir, é necessário abrir novamente o link recebido.

## SMTP e implantação

O backend usa Nodemailer e estas variáveis:

| Variável | Uso |
| --- | --- |
| `CORREIO` | Host SMTP; referência corporativa: `correio.ptractor.com.br` |
| `PORT_CORREIO` | Porta SMTP, padrão `587` |
| `EMAIL_AUTOMACAO` | Usuário de autenticação e endereço remetente |
| `PASSWORD_AUTOMACAO` | Senha SMTP |
| `PUBLIC_FRONTEND_URL` | URL do Kairo: `https://kairo.ptractor.com.br` |

As credenciais foram reaproveitadas do ambiente de `solicitacao_eng_mecanica`, sem alterar o projeto de origem. Seu host local de QA (`127.0.0.1:1025`) não foi copiado. O remetente aparece como **Kairo**. Em produção, o envio requer TLS e uma URL pública HTTPS explícita. Em desenvolvimento, sem URL definida, os links usam `http://localhost:5173`.

As variáveis SMTP são opcionais, mas host, usuário e senha devem ser configurados juntos. Sem configuração, operações que precisam enviar e-mail respondem indisponibilidade. `.env` permanece ignorado pelo Git; `.env.example` contém apenas os nomes e exemplos sem credenciais. Configure as variáveis também no servidor de produção.

Na implantação, execute no backend `npm ci`, `npm run db:generate`, `npx prisma migrate deploy` e `npm run build`; publique também o novo build do frontend. O entrypoint Docker já aplica migrations com `deploy`, sem reset. A migration `20261117120000_user_email_recovery` é aditiva e preserva os dados existentes. Os links públicos precisam continuar atendendo ao fallback do frontend para `index.html`, já presente no Nginx do projeto.

`authVersion` fica no usuário e nos refresh tokens e é incluída nos JWTs comuns. Tokens antigos sem essa informação equivalem à versão zero, permitindo implantação sem deslogar todos os usuários. Após redefinição, inativação ou mudança de tipo, a versão é incrementada; JWTs e refresh tokens antigos não voltam a autorizar acesso, inclusive se a conta retornar ao tipo comum.

## API e proteções

Rotas sob `/api`:

| Método e caminho | Entrada / resultado |
| --- | --- |
| `GET /auth/me/profile` | Autenticado; `{ profile: { email, verifiedAt, pendingEmail } }` |
| `PATCH /auth/me/profile` | Autenticado; `{ email: string \| null }` |
| `POST /auth/me/profile/resend-email-verification` | Autenticado; reenvia confirmação pendente |
| `POST /auth/verify-email` | Público; `{ token }` |
| `POST /auth/forgot-password` | Público; `{ cardNumber, unit }`; retorna `status: sent \| no_email \| verification_pending` |
| `POST /auth/reset-password` | Público; `{ token, newPassword, confirmPassword }` |

Respostas seguem `{ dados, mensagem? }` e erros `{ mensagem }`. Contatos usam normalização em minúsculas, limite de 254 caracteres e validação de formato. Identificadores enviados pelo cliente não podem mudar o titular do perfil.

Tokens são aleatórios de 32 bytes, armazenados somente por hash SHA-256, separados por finalidade e vinculados ao usuário, endereço e versão das credenciais. O consumo e a troca de senha ocorrem na mesma transação. Um bloqueio da linha do usuário serializa envios e alterações da mesma conta. Reenvios substituem os links anteriores da mesma finalidade. Falhas SMTP invalidam o token que não foi entregue e preservam o endereço pendente para um novo envio.

As ações têm limite de **20 requisições por minuto por IP**, **um envio por minuto por conta** e **cinco envios por hora por conta**, somando confirmação e recuperação. O limite da conta é persistido pelos registros de tokens e vale entre instâncias do backend. O limite por IP é local à instância e usa `request.ip`, sem confiar em cabeçalhos de proxy arbitrários. Links usados ou invalidados continuam contando para os limites até o fim da janela. Corpos das requisições de alteração têm limite de 8 KiB. Tokens e credenciais não são registrados nos logs do envio.

## Validação

- `npm test` no backend inclui validação dos contratos, templates, autenticação e limite por IP.
- Para PostgreSQL, prepare uma base isolada com nome terminado em `_test`, aplique as migrations, exporte `KAIRO_ACCOUNT_TEST_DATABASE_URL` e execute `npm run test:account:postgres`. Os testes criam e removem apenas usuários com identificadores próprios. Cobrem concorrência, rollback, expiração, substituição, falha SMTP, produção e invalidação de sessões, usando um mailer capturado.
- Com o frontend em execução, configure `KAIRO_WEB_URL` se necessário e execute `npm run test:account:browser`. O navegador usa Edge por padrão (`KAIRO_BROWSER` permite alterar o canal). API e e-mails são simulados; há cobertura de desktop e celular, com capturas em `frontend/test-results/account/`.
- A conexão corporativa pode ser validada com `transporter.verify()` sem enviar mensagens. Entrega externa e recebimento na caixa do colaborador dependem da infraestrutura SMTP.
