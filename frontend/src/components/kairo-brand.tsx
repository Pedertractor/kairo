import { PlatformIcon } from '@/components/platform-icon'

export function KairoBrand() {
  return (
    <a href="/" className="flex items-center gap-2 font-medium">
      <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <PlatformIcon />
      </div>
      Kairo
    </a>
  )
}
