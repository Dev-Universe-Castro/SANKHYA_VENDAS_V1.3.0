"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"

interface MapComponentProps {
  latitude: number
  longitude: number
  partnerName: string
}

// Importação dinâmica do mapa para evitar problemas de SSR
const MapView = dynamic(
  () => import("./map-view"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-muted rounded-md flex items-center justify-center">
        Carregando mapa...
      </div>
    )
  }
)

export default function MapComponent({ latitude, longitude, partnerName }: MapComponentProps) {
  return <MapView latitude={latitude} longitude={longitude} partnerName={partnerName} />
}