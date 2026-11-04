# Correção das datas de conclusão antigas

Esta é uma execução manual única, sem cron ou execução automática no deploy.
Requer as migrations de histórico, conclusão e estimativas aplicadas. Execute os
comandos na pasta `backend`, com `DATABASE_URL` apontando para o banco desejado.
O comando informa host, porta e banco, sem imprimir a senha.

## Revisão e aplicação

```powershell
npm run activities:backfill-completion -- --dry-run
npm run activities:backfill-completion -- --apply
```

Sem argumento, o comando executa somente a prévia. Argumentos desconhecidos ou
`--apply` junto com `--dry-run` são rejeitados antes da conexão.
A prévia usa uma transação somente de leitura e informa cada candidato com seu
ID, última atualização original, data proposta, origem e eventual motivo de
exclusão. As datas textuais correspondem a UTC, como armazenadas pelo Prisma.
Revise os dados e a identificação do banco antes de executar `--apply`.

Somente atividades `DONE`, não excluídas e sem `completedAt` são candidatas.
Usa-se o último evento real `STATUS_CHANGED` para `DONE`, quando existir.
Sem ele, copia-se o `updatedAt` original e marca-se `completionDateEstimated`.
A estimativa ganha um evento `COMPLETION_ESTIMATED`, sem usuário, com a data
estimada separada do instante de execução da correção.

Datas anteriores à criação ou posteriores ao início da execução são ignoradas
e reportadas. Uma estimativa já existente sem data atual também é reportada
como `existing_estimate` para análise, sem duplicar ou substituir sua evidência.
Datas já preenchidas não são alteradas. Status, responsável, apontamentos,
`createdAt` e `updatedAt` permanecem intactos.

O resumo informa `examined`, `recovered`, `estimated`, `ignored` e `errors`.
Na prévia, `recovered` e `estimated` são as quantidades propostas; em `--apply`,
são quantidades confirmadas. O processamento usa lotes de até 500 e uma conexão
dedicada com bloqueio consultivo PostgreSQL, rejeitando outra aplicação simultânea.
Cada lote confirma a data e seus eventos na mesma transação. Em caso de falha,
o lote atual é revertido, o comando retorna código diferente de zero e os lotes
anteriores permanecem confirmados. Uma nova execução retoma os pendentes.

O analytics inclui estimativas no período de `estimatedCompletedAt`, e não na
data em que o comando foi executado. Cada atividade conta uma vez por período,
mesmo com eventos reais e estimados, e continua contando após reabertura.
Uma nova conclusão real substitui a data atual e remove a marca de estimativa;
o evento de estimativa anterior permanece no histórico.

## Validação em PostgreSQL

Use um banco isolado cujo nome termine em `_test`, com todas as migrations
aplicadas. Nunca aponte os testes para um banco de produção.

```powershell
$env:KAIRO_BACKFILL_TEST_DATABASE_URL = 'postgresql://usuario:senha@localhost:5432/kairo_test'
npm run test:completion-backfill:postgres
```

Os testes criam e removem somente suas próprias fixtures e verificam preservação
de timestamps, rollback, concorrência, reexecução e os filtros reais do analytics.
