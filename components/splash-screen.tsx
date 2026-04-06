
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface SplashScreenProps {
  onFinish: () => void
  duration?: number
  forceStay?: boolean
}

export function SplashScreen({ onFinish, duration = 2000, forceStay = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animação de progresso suave
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98 && forceStay) return 98
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, duration / 50)

    // Se forceStay mudar para falso e o progresso estiver em 98, completa o progresso
    if (!forceStay && progress >= 98) {
      setProgress(100)
    }

    // Timer para finalizar o splash - só finaliza se não estiver em forceStay
    let timer: NodeJS.Timeout | null = null
    if (!forceStay) {
      timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onFinish, 200) // Reduzido de 400 para 200
      }, 300) // Reduzido de 1000 para 300
    }

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(progressInterval)
    }
  }, [onFinish, duration, forceStay, progress])

  if (!isVisible) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-white transition-opacity duration-400 opacity-0 pointer-events-none"
        style={{ backgroundColor: '#ffffff' }}
      />
    )
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400 ${isVisible ? "opacity-100" : "opacity-0"
        }`}
      style={{
        backgroundColor: '#ffffff',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Logo com animação de fade-in */}
      <div className="flex flex-col items-center justify-center gap-8 animate-fade-in">
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          <Image
            src="/Logo_Final.png"
            alt="PredictSales Logo"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>

        {/* Barra de progresso minimalista */}
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200 ease-out rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: '#70CA71'
            }}
          />
        </div>

        {/* Texto de carregamento */}
        <p className="text-sm text-gray-600 animate-pulse mt-2">
          Carregando...
        </p>
      </div>


    </div>
  )
}
