export function ApontamentosPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Apontamentos</h1>
        <p className="text-sm text-muted-foreground">
          Registros de horas das suas atividades e tarefas.
        </p>
      </div>

      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium">Nenhum apontamento ainda</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Os seus apontamentos de horas aparecerão aqui.
        </p>
      </div>
    </div>
  )
}
