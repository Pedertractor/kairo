import { useId } from 'react'
import { Search } from 'lucide-react'

import { FilterField, ResponsiveFilters } from '@/components/responsive-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ActivityFilterOption, useActivityFilters } from '@/hooks/use-activity-filters'
import { ALL_ACTIVITIES, UNASSIGNED, type ActivityFilterState } from '@/lib/activity-filters'
import { CARD_STATUSES, STATUS_LABELS } from '@/lib/card-status'

interface Props {
  controller: ReturnType<typeof useActivityFilters>
  teams?: ActivityFilterOption[]
  description: string
}

export function ActivityFilters({ controller, teams, description }: Props) {
  const id = useId()
  const { filters, changeFilters, resetFilters, tagOptions, assigneeOptions, hasSheetFilters, hasActiveFilters } = controller
  const fields: { key: Exclude<keyof ActivityFilterState, 'name'>; label: string; options: ActivityFilterOption[] }[] = [
    { key: 'visibility', label: 'Filtrar por situação', options: [
      { id: 'active', name: 'Não concluídas' }, { id: 'all', name: 'Todas' },
    ] },
    ...(teams && teams.length > 1 ? [{ key: 'team' as const, label: 'Filtrar por equipe', options: [
      { id: ALL_ACTIVITIES, name: 'Todas as equipes' }, ...teams,
    ] }] : []),
    { key: 'status', label: 'Filtrar por status', options: [
      { id: ALL_ACTIVITIES, name: 'Todos os status' },
      ...CARD_STATUSES.map((status) => ({ id: status, name: STATUS_LABELS[status] })),
    ] },
    { key: 'tag', label: 'Filtrar por etiqueta', options: [
      { id: ALL_ACTIVITIES, name: 'Todas as etiquetas' }, ...tagOptions,
    ] },
    { key: 'assignee', label: 'Filtrar por responsável', options: [
      { id: ALL_ACTIVITIES, name: 'Todos os responsáveis' },
      { id: UNASSIGNED, name: 'Sem responsável' }, ...assigneeOptions,
    ] },
  ]

  function optionLabel(option: ActivityFilterOption) {
    return <span className="flex min-w-0 items-center gap-2">
      {option.color ? <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden /> : null}
      <span className="truncate">{option.name}</span>
    </span>
  }

  return (
    <div className="flex min-w-0 w-full flex-wrap items-end gap-3">
      <div className="relative min-w-0 w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={filters.name} onChange={(event) => changeFilters({ name: event.target.value })}
          placeholder="Buscar por nome..." className="pl-8" aria-label="Buscar atividades por nome" />
      </div>
      <ResponsiveFilters description={description} hasActiveFilters={hasSheetFilters}
        inlineClassName="2xl:flex-1 2xl:flex-wrap" fieldClassName="w-44 shrink-0">
        {(idPrefix, itemClassName) => fields.map((field) => (
          <FilterField key={field.key} id={`${id}-${idPrefix}-${field.key}`} label={field.label} className={itemClassName}>
            <Select value={filters[field.key]} onValueChange={(value) => {
              if (value !== null) changeFilters({ [field.key]: value } as Partial<ActivityFilterState>)
            }}>
              <SelectTrigger id={`${id}-${idPrefix}-${field.key}`} className="w-full" aria-label={field.label}>
                <SelectValue>{() => {
                  const selected = field.options.find((option) => option.id === filters[field.key])
                  return selected ? optionLabel(selected) : field.label
                }}</SelectValue>
              </SelectTrigger>
              <SelectContent className={field.key === 'assignee' ? 'min-w-64 max-w-[calc(100vw-2rem)]' : undefined}>{field.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>{optionLabel(option)}</SelectItem>
              ))}</SelectContent>
            </Select>
          </FilterField>
        ))}
      </ResponsiveFilters>
      <Button type="button" variant="outline" disabled={!hasActiveFilters} onClick={resetFilters}>Limpar filtros</Button>
    </div>
  )
}
