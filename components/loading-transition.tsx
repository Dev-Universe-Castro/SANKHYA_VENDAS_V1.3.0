
"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"

export default function LoadingTransition() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Verificar se deve suprimir o loading (ex: logo após o Splash de login)
    const suppress = sessionStorage.getItem('suppressLoading')
    if (suppress === 'true') {
      sessionStorage.removeItem('suppressLoading')
      return
    }

    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-12 h-12">
          <Image
            src="/anigif.gif"
            alt="Carregando..."
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      </div>
    </div>
  )
}
