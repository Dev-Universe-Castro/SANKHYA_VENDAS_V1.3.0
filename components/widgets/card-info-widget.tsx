"use client"

import { Card, CardContent } from "@/components/ui/card"

interface CardInfoWidgetProps {
  data: {
    title: string
    content: string
  }
}

export default function CardInfoWidget({ data }: CardInfoWidgetProps) {
  return (
    <Card className="h-full flex flex-col border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col justify-center flex-1">
        <h3 className="text-xl font-bold text-slate-800 mb-3">{data.title}</h3>
        <p className="text-slate-600 leading-relaxed">{data.content}</p>
      </CardContent>
    </Card>
  )
}
