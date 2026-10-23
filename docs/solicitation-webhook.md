# Webhook de Solicitação de Engenharia Mecânica

Configure `SOLICITATION_WEBHOOK_URL` com o endpoint completo
`/api/webhooks/kairo` do backend Solicitação e `SOLICITATION_WEBHOOK_SECRET`
com o mesmo segredo aleatório de pelo menos 32 caracteres configurado lá em
`KAIRO_WEBHOOK_SECRET`. Omita ambas as variáveis para desativar o envio.

Execução no host: `http://localhost:3142/api/webhooks/kairo`.
Docker Desktop, usando os Compose atuais: `http://host.docker.internal:5025/api/webhooks/kairo`.
Servidores distintos: endereço HTTPS do Solicitação acessível pelo Kairo.
Reinicie/recrie os backends após configurar. O segredo não é uma API key pessoal.

Atividades e projetos de origem `solicitacao-eng-mecanica` notificam após atualizações
e exclusões confirmadas. Início/pausa de atividades pelo timer também notifica.
O nome da API key usada para criar o card não altera esse comportamento.

O emissor assina o timestamp Unix em segundos, um ponto e o corpo JSON serializado
com HMAC-SHA256. Envia `X-Kairo-Timestamp` e `X-Kairo-Signature`, além de um corpo com
`eventId`, `type=card.updated`, `teamId` e `cardId`. O receptor valida assinatura e
idade máxima de 5 minutos, consulta o Kairo com a credencial pessoal já vinculada
à etapa e aplica suas regras existentes.

O envio não bloqueia a resposta da operação no Kairo. Timeout de 10 segundos e até
3 tentativas (esperas de 1 e 2 segundos) cobrem falhas temporárias. A fila é em memória;
o job de 60 segundos do Solicitação continua como recuperação. A credencial pessoal
precisa continuar válida e com acesso ao time. As telas do Solicitação leem os dados
locais a cada 5 segundos para exibir a atualização.

Valide o caminho completo concluindo, no Kairo, todos os cards de uma etapa vinculada
e conferindo a alteração no Solicitação. Falhas de entrega são registradas com o
prefixo `[solicitation-webhook]` sem exibir segredos.
