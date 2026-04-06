"use client"

import { useState, useEffect, useRef } from "react"
import GridLayout from "react-grid-layout"
import type { Layout } from "react-grid-layout"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import WidgetModal, { WidgetConfig } from "./widget-modal"
import ChartWidget from "./widgets/chart-widget"
import TableWidget from "./widgets/table-widget"
import KPIWidget from "./widgets/kpi-widget"
import CardInfoWidget from "./widgets/card-info-widget"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'widget-1',
    type: 'kpi',
    data: {
      title: 'Faturamento Mensal',
      value: 125000,
      unit: 'R$',
      trend: 'up',
      icon: 'trending-up'
    }
  },
  {
    id: 'widget-2',
    type: 'chart',
    data: {
      title: 'Vendas por Categoria',
      chartType: 'bar',
      labels: ['Eletrônicos', 'Roupas', 'Alimentos', 'Livros', 'Outros'],
      values: [45000, 32000, 28000, 18000, 12000],
      legend: 'Vendas (R$)'
    }
  },
  {
    id: 'widget-3',
    type: 'table',
    data: {
      title: 'Top 5 Produtos',
      columns: ['Produto', 'Vendas', 'Estoque'],
      rows: [
        ['Notebook Dell', 'R$ 15.000', '12 un'],
        ['iPhone 13', 'R$ 12.000', '8 un'],
        ['Smart TV 55"', 'R$ 9.500', '15 un'],
        ['Fone Bluetooth', 'R$ 8.200', '45 un'],
        ['Mouse Gamer', 'R$ 6.800', '32 un']
      ]
    }
  }
]

const defaultLayouts: Layout[] = [
  { i: 'widget-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'widget-2', x: 3, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
  { i: 'widget-3', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }
]

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [layout, setLayout] = useState<Layout[]>(defaultLayouts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load from localStorage
    const savedWidgets = localStorage.getItem('dashboard-widgets')
    const savedLayout = localStorage.getItem('dashboard-layout')

    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets))
    } else {
      setWidgets(defaultWidgets)
    }

    if (savedLayout) {
      setLayout(JSON.parse(savedLayout))
    }

    setIsMobile(window.innerWidth < 768)
    setLoading(false)

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('dashboard-widgets', JSON.stringify(widgets))
    }
  }, [widgets])

  useEffect(() => {
    if (layout) {
      localStorage.setItem('dashboard-layout', JSON.stringify(layout))
    }
  }, [layout])

  const handleSaveWidget = (widget: WidgetConfig) => {
    if (editingWidget) {
      setWidgets(widgets.map(w => w.id === widget.id ? widget : w))
    } else {
      setWidgets([...widgets, widget])
      
      // Add layout for new widget
      const newLayoutItem: Layout = {
        i: widget.id,
        x: (widgets.length * 3) % 12,
        y: Infinity,
        w: 3,
        h: widget.type === 'kpi' ? 2 : 4,
        minW: 2,
        minH: widget.type === 'kpi' ? 2 : 3
      }

      setLayout([...layout, newLayoutItem])
    }
    setEditingWidget(null)
  }

  const handleEditWidget = (widget: WidgetConfig) => {
    setEditingWidget(widget)
    setModalOpen(true)
  }

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId))
    setLayout(layout.filter(l => l.i !== widgetId))
    setDeleteWidgetId(null)
  }

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout)
  }

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'chart':
        return <ChartWidget data={widget.data} />
      case 'table':
        return <TableWidget data={widget.data} />
      case 'kpi':
        return <KPIWidget data={widget.data} />
      case 'card':
        return <CardInfoWidget data={widget.data} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 md:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Administrativa</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Gerencie widgets personalizados com drag & drop
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingWidget(null)
              setModalOpen(true)
            }}
            data-testid="create-widget-btn"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Criar Widget
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 md:p-6 pb-24">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
              <Plus className="h-10 w-10 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum widget criado</h3>
              <p className="text-slate-600 max-w-md">
                Comece criando seu primeiro widget clicando no botão "Criar Widget" acima.
              </p>
            </div>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={80}
            width={containerWidth}
            onLayoutChange={handleLayoutChange}
            isDraggable={!isMobile}
            isResizable={!isMobile}
            draggableHandle=".drag-handle"
            containerPadding={[0, 0]}
            margin={[16, 16]}
          >
            {widgets.map((widget) => (
              <div key={widget.id} className="relative group">
                {/* Widget Actions */}
                <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white shadow-md hover:bg-slate-100"
                    onClick={() => handleEditWidget(widget)}
                    data-testid={`edit-widget-${widget.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shadow-md"
                    onClick={() => setDeleteWidgetId(widget.id)}
                    data-testid={`delete-widget-${widget.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Drag Handle - Desktop only */}
                {!isMobile && (
                  <div className="drag-handle absolute top-2 left-2 z-10 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-200 rounded p-1">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                        </div>
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Widget Content */}
                <div className="h-full">
                  {renderWidget(widget)}
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {/* Widget Modal */}
      <WidgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingWidget(null)
        }}
        onSave={handleSaveWidget}
        editWidget={editingWidget}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWidgetId} onOpenChange={() => setDeleteWidgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este widget? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWidgetId && handleDeleteWidget(deleteWidgetId)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
