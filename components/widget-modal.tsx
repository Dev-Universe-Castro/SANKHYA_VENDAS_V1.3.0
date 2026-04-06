"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, BarChart3, Table as TableIcon, Activity, FileText } from "lucide-react"
import ChartWidget from "./widgets/chart-widget"
import TableWidget from "./widgets/table-widget"
import KPIWidget from "./widgets/kpi-widget"
import CardInfoWidget from "./widgets/card-info-widget"

export type WidgetType = 'chart' | 'table' | 'kpi' | 'card'

export interface WidgetConfig {
  id: string
  type: WidgetType
  data: any
}

interface WidgetModalProps {
  open: boolean
  onClose: () => void
  onSave: (widget: WidgetConfig) => void
  editWidget?: WidgetConfig | null
}

export default function WidgetModal({ open, onClose, onSave, editWidget }: WidgetModalProps) {
  const [widgetType, setWidgetType] = useState<WidgetType>('chart')
  const [formData, setFormData] = useState<any>({
    title: '',
    chartType: 'bar',
    labels: [''],
    values: [0],
    legend: '',
    columns: [''],
    rows: [['']],
    value: 0,
    unit: '',
    trend: 'neutral',
    icon: 'activity',
    content: ''
  })

  useEffect(() => {
    if (editWidget) {
      setWidgetType(editWidget.type)
      setFormData(editWidget.data)
    } else {
      // Reset form
      setFormData({
        title: '',
        chartType: 'bar',
        labels: [''],
        values: [0],
        legend: '',
        columns: [''],
        rows: [['']],
        value: 0,
        unit: '',
        trend: 'neutral',
        icon: 'activity',
        content: ''
      })
    }
  }, [editWidget, open])

  const handleSave = () => {
    const widget: WidgetConfig = {
      id: editWidget?.id || `widget-${Date.now()}`,
      type: widgetType,
      data: formData
    }
    onSave(widget)
    onClose()
  }

  const addLabel = () => {
    setFormData({
      ...formData,
      labels: [...formData.labels, ''],
      values: [...formData.values, 0]
    })
  }

  const removeLabel = (index: number) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter((_: any, i: number) => i !== index),
      values: formData.values.filter((_: any, i: number) => i !== index)
    })
  }

  const updateLabel = (index: number, value: string) => {
    const newLabels = [...formData.labels]
    newLabels[index] = value
    setFormData({ ...formData, labels: newLabels })
  }

  const updateValue = (index: number, value: string) => {
    const newValues = [...formData.values]
    newValues[index] = parseFloat(value) || 0
    setFormData({ ...formData, values: newValues })
  }

  const addColumn = () => {
    setFormData({
      ...formData,
      columns: [...formData.columns, '']
    })
  }

  const removeColumn = (index: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_: any, i: number) => i !== index)
    })
  }

  const updateColumn = (index: number, value: string) => {
    const newColumns = [...formData.columns]
    newColumns[index] = value
    setFormData({ ...formData, columns: newColumns })
  }

  const addRow = () => {
    setFormData({
      ...formData,
      rows: [...formData.rows, Array(formData.columns.length).fill('')]
    })
  }

  const removeRow = (index: number) => {
    setFormData({
      ...formData,
      rows: formData.rows.filter((_: any, i: number) => i !== index)
    })
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...formData.rows]
    newRows[rowIndex][colIndex] = value
    setFormData({ ...formData, rows: newRows })
  }

  const renderPreview = () => {
    const previewConfig = {
      id: 'preview',
      type: widgetType,
      data: formData
    }

    return (
      <div className="h-[250px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-4">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Preview</div>
        <div className="h-[calc(100%-28px)]">
          {widgetType === 'chart' && <ChartWidget data={formData} />}
          {widgetType === 'table' && <TableWidget data={formData} />}
          {widgetType === 'kpi' && <KPIWidget data={formData} />}
          {widgetType === 'card' && <CardInfoWidget data={formData} />}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editWidget ? 'Editar Widget' : 'Criar Widget'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Form Section */}
          <div className="space-y-4">
            {/* Widget Type Selection */}
            {!editWidget && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Widget</Label>
                <Select value={widgetType} onValueChange={(value) => setWidgetType(value as WidgetType)}>
                  <SelectTrigger data-testid="widget-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chart">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Gráfico
                      </div>
                    </SelectItem>
                    <SelectItem value="table">
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        Tabela
                      </div>
                    </SelectItem>
                    <SelectItem value="kpi">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        KPI
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Card Informativo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Common Fields */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Título</Label>
              <Input
                data-testid="widget-title-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título do widget"
              />
            </div>

            {/* Chart Specific Fields */}
            {widgetType === 'chart' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tipo de Gráfico</Label>
                  <Select value={formData.chartType} onValueChange={(value) => setFormData({ ...formData, chartType: value })}>
                    <SelectTrigger data-testid="chart-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Barras</SelectItem>
                      <SelectItem value="line">Linha</SelectItem>
                      <SelectItem value="pie">Pizza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Legenda</Label>
                  <Input
                    value={formData.legend}
                    onChange={(e) => setFormData({ ...formData, legend: e.target.value })}
                    placeholder="Nome da série de dados"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Labels e Valores</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLabel} data-testid="add-label-btn">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {formData.labels.map((label: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Label"
                          value={label}
                          onChange={(e) => updateLabel(index, e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Valor"
                          type="number"
                          value={formData.values[index]}
                          onChange={(e) => updateValue(index, e.target.value)}
                          className="w-24"
                        />
                        {formData.labels.length > 1 && (
                          <Button type="button" size="icon" variant="destructive" onClick={() => removeLabel(index)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Table Specific Fields */}
            {widgetType === 'table' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Colunas</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addColumn}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.columns.map((column: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Coluna ${index + 1}`}
                          value={column}
                          onChange={(e) => updateColumn(index, e.target.value)}
                        />
                        {formData.columns.length > 1 && (
                          <Button type="button" size="icon" variant="destructive" onClick={() => removeColumn(index)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Linhas</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addRow}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {formData.rows.map((row: string[], rowIndex: number) => (
                      <div key={rowIndex} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-1">
                          {row.map((cell: string, colIndex: number) => (
                            <Input
                              key={colIndex}
                              placeholder={formData.columns[colIndex] || `Col ${colIndex + 1}`}
                              value={cell}
                              onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                              className="text-sm"
                            />
                          ))}
                        </div>
                        {formData.rows.length > 1 && (
                          <Button type="button" size="icon" variant="destructive" onClick={() => removeRow(rowIndex)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* KPI Specific Fields */}
            {widgetType === 'kpi' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Valor</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Digite o valor"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Unidade</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Ex: R$, un, %, etc"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tendência</Label>
                  <Select value={formData.trend} onValueChange={(value) => setFormData({ ...formData, trend: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">Em crescimento</SelectItem>
                      <SelectItem value="down">Em queda</SelectItem>
                      <SelectItem value="neutral">Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ícone</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Atividade</SelectItem>
                      <SelectItem value="trending-up">Crescimento</SelectItem>
                      <SelectItem value="trending-down">Queda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Card Specific Fields */}
            {widgetType === 'card' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Conteúdo</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite o conteúdo do card"
                  rows={6}
                />
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            {renderPreview()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="cancel-btn">
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid="save-widget-btn" className="bg-primary hover:bg-primary/90">
            {editWidget ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
