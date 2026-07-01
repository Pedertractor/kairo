export function ProjetosPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold">Projetos</h1>

      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium">Em breve</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Os projetos das suas equipes aparecerão aqui.
        </p>
      </div>
    </div>
  )
}
