import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '@/components/ui/combobox'
import { api } from '@/lib/api-handler'
import type {
  CostCenterSummary,
  CostCentersListResponse,
  CostCentersSyncResponse,
} from '@/types/cost-center'

type CostCenterOption = {
  value: string
  label: string
}

interface CostCenterMultiSelectProps {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  extraCostCenters?: CostCenterSummary[]
  disabled?: boolean
  enabled?: boolean
}

function toOption(item: CostCenterSummary): CostCenterOption {
  const description = item.description.trim()

  return {
    value: item.id,
    label: description
      ? `${item.costCenter} · ${description}`
      : item.costCenter,
  }
}

async function loadCatalog(): Promise<CostCenterSummary[]> {
  try {
    const data = await api<CostCentersListResponse>('/cost-centers', {
      toastOnError: false,
    })

    if (data.costCenters.length > 0) {
      return data.costCenters
    }
  } catch {
    // Catalog may be empty or the API may not have the route yet.
  }

  try {
    const synced = await api<CostCentersSyncResponse>('/cost-centers/sync', {
      method: 'POST',
      toastOnError: false,
      toastOnSuccess: false,
    })

    return synced.costCenters
  } catch {
    return []
  }
}

export function CostCenterMultiSelect({
  selectedIds,
  onSelectedIdsChange,
  extraCostCenters = [],
  disabled = false,
  enabled = true,
}: CostCenterMultiSelectProps) {
  const [catalog, setCatalog] = useState<CostCenterSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)

      try {
        const costCenters = await loadCatalog()

        if (!cancelled) {
          setCatalog(costCenters)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [enabled])

  const options = useMemo(() => {
    const byId = new Map<string, CostCenterOption>()

    for (const item of catalog) {
      byId.set(item.id, toOption(item))
    }

    for (const item of extraCostCenters) {
      if (!byId.has(item.id)) {
        byId.set(item.id, toOption(item))
      }
    }

    return [...byId.values()]
  }, [catalog, extraCostCenters])

  const selected = useMemo(
    () => options.filter((option) => selectedIds.includes(option.value)),
    [options, selectedIds],
  )

  if (isLoading) {
    return (
      <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando centros de custo...
      </div>
    )
  }

  if (disabled) {
    if (selected.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">Nenhum centro de custo.</p>
      )
    }

    return (
      <ul className="flex flex-wrap gap-1.5">
        {selected.map((option) => (
          <li
            key={option.value}
            className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium"
          >
            {option.label}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Combobox
      multiple
      items={options}
      value={selected}
      onValueChange={(next) =>
        onSelectedIdsChange((next ?? []).map((item) => item.value))
      }
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxChips>
        <ComboboxValue>
          {(values: CostCenterOption[]) => (
            <>
              {values.map((item) => (
                <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id="team-cost-centers"
                placeholder="Buscar centro de custo..."
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>Nenhum centro de custo encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
