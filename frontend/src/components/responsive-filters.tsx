import type { ReactNode } from 'react';
import { ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface FilterFieldProps {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}

export function FilterField({
  id,
  label,
  className,
  children,
}: FilterFieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

interface ResponsiveFiltersProps {
  description: string;
  hasActiveFilters?: boolean;
  children: (idPrefix: string, itemClassName?: string) => ReactNode;
}

export function ResponsiveFilters({
  description,
  hasActiveFilters = false,
  children,
}: ResponsiveFiltersProps) {
  return (
    <>
      <Sheet>
        <SheetTrigger
          render={
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='relative shrink-0 2xl:hidden'
              aria-label='Abrir filtros'
            />
          }
        >
          <ListFilter />
          {hasActiveFilters ? (
            <span
              className='absolute top-1.5 right-1.5 size-1.5 rounded-full bg-sidebar-primary'
              aria-hidden
            />
          ) : null}
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className='flex flex-col gap-4 px-4 pb-4'>
            {children('sheet')}
          </div>
        </SheetContent>
      </Sheet>

      <div className='hidden min-w-0 2xl:flex 2xl:flex-row 2xl:items-end 2xl:gap-3'>
        {children('inline', 'w-52 shrink-0')}
      </div>
    </>
  );
}
