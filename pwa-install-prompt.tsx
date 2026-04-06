"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Wifi } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    console.log(`User response to install prompt: ${outcome}`)
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  // Renamed handleInstallClick to match the new logic in the changes
  const handleInstallClick = async () => {
    await handleInstall();
  }

  if (!showPrompt) return null

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-[320px] p-6">
        <DialogHeader className="pb-4">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-lg text-center">Instalar Sankhya</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Instale o app em seu dispositivo para acesso rápido, trabalhar offline e ter uma experiência nativa
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-3">
          <Button
            onClick={handleInstallClick}
            className="w-full h-11 text-base font-medium"
            style={{ backgroundColor: '#5DBF87' }}
          >
            Instalar Aplicativo
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowPrompt(false)}
            className="w-full h-9 text-sm"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}