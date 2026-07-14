interface TeamSectionPlaceholderProps {
  title: string
  description: string
}

export function TeamSectionPlaceholder({
  title,
  description,
}: TeamSectionPlaceholderProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
