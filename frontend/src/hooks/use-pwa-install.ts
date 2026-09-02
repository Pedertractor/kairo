import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false
  }

  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = 'standalone' in window.navigator && Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  )

  return mediaStandalone || iosStandalone
}

function isIosDevice() {
  if (typeof window === 'undefined') {
    return false
  }

  const ua = window.navigator.userAgent
  const classicIos = /iphone|ipad|ipod/i.test(ua)
  const ipadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1

  return classicIos || ipadOs
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay())
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setInstructionsOpen(false)
    }

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsInstalled(true)
      }
    }

    const standaloneQuery = window.matchMedia('(display-mode: standalone)')

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    standaloneQuery.addEventListener('change', onDisplayModeChange)
    setIsInstalled(isStandaloneDisplay())

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      standaloneQuery.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      return
    }

    setInstructionsOpen(true)
  }, [deferredPrompt])

  return {
    canInstall: !isInstalled,
    isIos: isIosDevice(),
    promptInstall,
    instructionsOpen,
    setInstructionsOpen,
  }
}
