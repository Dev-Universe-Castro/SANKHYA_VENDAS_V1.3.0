"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GripVertical, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Layout, 
  Type, 
  Calculator, 
  MapPin, 
  Bold, 
  Italic, 
  Underline, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  Image as ImageIconLucide, 
  Paintbrush,
  BarChart3,
  PieChart,
  Info,
  Landmark,
  FileText,
  Plus,
  Package,
  BarChart,
  Percent,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

const AVAILABLE_COLUMNS = [
  { id: 'code', label: 'Código', default: false },
  { id: 'description', label: 'Descrição do Produto', default: true },
  { id: 'quantity', label: 'Quantidade', default: true },
  { id: 'unit', label: 'Unidade', default: true },
  { id: 'price', label: 'Preço Unitário', default: true },
  { id: 'discount', label: 'Desconto', default: false },
  { id: 'total', label: 'Preço Total', default: true },
]

const AVAILABLE_STATS = [
  { id: 'total', label: 'Total do Pedido', value: '{{pedido.total}}', icon: 'Calculator' },
  { id: 'margin', label: 'Margem Média', value: '{{pedido.margem}}', icon: 'BarChart' },
  { id: 'items_count', label: 'Qtd de Itens', value: '{{pedido.itens_total}}', icon: 'Package' },
  { id: 'discount_total', label: 'Desconto Total', value: '{{pedido.desconto_total}}', icon: 'Percent' },
  { id: 'weight', label: 'Peso Total', value: '{{pedido.peso_total}}', icon: 'Calculator' },
  { id: 'volumes', label: 'Volumes', value: '{{pedido.volumes}}', icon: 'Package' },
]

const AVAILABLE_CHARTS = [
  { id: 'group_composition', label: 'Composição por Grupo', type: 'bar', icon: 'BarChart' },
  { id: 'volume_dist', label: 'Distribuição de Volume', type: 'pie', icon: 'PieChart' },
  { id: 'margin_cat', label: 'Margem por Categoria', type: 'bar', icon: 'BarChart' },
  { id: 'discount_impact', label: 'Impacto de Descontos', type: 'bar', icon: 'Percent' },
]

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px']

const COLORS = [
  '#0f172a', '#64748b', '#76BA1B', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'
]

const DYNAMIC_VARIABLES = [
  // Pedido
  { label: 'Número do Pedido', value: '{{pedido.numero}}' },
  { label: 'Valor Total', value: '{{pedido.total}}' },
  { label: 'Condição de Pagamento', value: '{{pedido.condicao}}' },
  { label: 'Data do Orçamento', value: '{{pedido.data}}' },
  { label: 'Tipo de Movimento', value: '{{pedido.tipo}}' },
  { label: 'Observações do Pedido', value: '{{pedido.observacao}}' },
  
  // Cliente
  { label: 'Cliente: Razão Social', value: '{{cliente.razao_social}}' },
  { label: 'Cliente: Nome Fantasia', value: '{{cliente.nome_fantasia}}' },
  { label: 'Cliente: CPF/CNPJ', value: '{{cliente.cpf_cnpj}}' },
  { label: 'Cliente: Endereço', value: '{{cliente.endereco}}' },
  { label: 'Cliente: Cidade', value: '{{cliente.cidade}}' },
  { label: 'Cliente: Estado', value: '{{cliente.estado}}' },
  { label: 'Cliente: Bairro', value: '{{cliente.bairro}}' },
  { label: 'Cliente: CEP', value: '{{cliente.cep}}' },

  // Vendedor
  { label: 'Vendedor: Nome Completo', value: '{{vendedor.nome}}' },
  { label: 'Vendedor: E-mail', value: '{{vendedor.email}}' },
  { label: 'Vendedor: Telefone', value: '{{vendedor.telefone}}' },

  // Empresa
  { label: 'Empresa: Nome', value: '{{empresa.nome}}' },
  { label: 'Empresa: CNPJ', value: '{{empresa.cnpj}}' },
  { label: 'Empresa: Endereço', value: '{{empresa.endereco}}' },
  { label: 'Empresa: Cidade/UF', value: '{{empresa.cidade}}' },

  // Sistema
  { label: 'Sistema: Página Atual', value: '{{sistema.pagina}}' },
  { label: 'Sistema: Total de Páginas', value: '{{sistema.total_paginas}}' },
]

const RichToolbar = ({ onAction }: { onAction: (cmd: string, val?: string) => void }) => (
  <div className="flex items-center gap-1 p-1 bg-white border border-slate-100 rounded-lg shadow-sm mb-2 overflow-x-auto max-w-full">
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={e => { e.preventDefault(); onAction('bold'); }}><Bold className="w-3.5 h-3.5" /></Button>
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={e => { e.preventDefault(); onAction('italic'); }}><Italic className="w-3.5 h-3.5" /></Button>
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={e => { e.preventDefault(); onAction('underline'); }}><Underline className="w-3.5 h-3.5" /></Button>
    <div className="w-px h-3 bg-slate-200 mx-0.5" />
    <select className="text-[10px] bg-transparent border-none outline-none font-bold" onChange={e => onAction('fontName', e.target.value)}>
      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
    </select>
    <div className="w-px h-3 bg-slate-200 mx-0.5" />
    <select className="text-[10px] bg-transparent border-none outline-none font-bold" onChange={e => onAction('fontSize', e.target.value)}>
      <option value="2">M</option>
      <option value="1">P</option>
      <option value="3">G</option>
      <option value="5">XG</option>
    </select>
    <div className="w-px h-3 bg-slate-200 mx-0.5" />
    <div className="flex gap-0.5">
      {COLORS.map(c => (
        <button key={c} className="w-3 h-3 rounded-full border border-slate-100" style={{ backgroundColor: c }} onMouseDown={e => { e.preventDefault(); onAction('foreColor', c); }} />
      ))}
    </div>
  </div>
)

const InlineRichEditor = ({ value, onChange, placeholder, className, showVariables }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string, showVariables?: boolean }) => {
  const [showToolbar, setShowToolbar] = useState(false)
  const editorRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Sincronizar o valor da prop com o DOM apenas quando não estiver em foco
  React.useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || ''
      }
    }
  }, [value])

  // Gerenciar visibilidade da barra de ferramentas baseada no foco do container
  const handleFocus = () => setShowToolbar(true)
  const handleBlur = (e: React.FocusEvent) => {
    // Se o novo foco ainda estiver dentro do container (ex: no <select>), não fecha
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setShowToolbar(false)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full" 
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={-1} // Permite que o container receba foco/blur de eventos internos
    >
      {showToolbar && (
        <div className="absolute -top-11 left-0 z-50 animate-in fade-in slide-in-from-bottom-2 flex gap-2">
          <RichToolbar onAction={(cmd, val) => document.execCommand(cmd, false, val)} />
          {showVariables && (
            <div className="bg-white border border-slate-100 rounded-lg shadow-sm p-1 flex items-center gap-1 h-[34px]">
              <select 
                className="text-[10px] bg-transparent border-none outline-none font-black text-[#76BA1B] cursor-pointer"
                onFocus={(e) => e.stopPropagation()} // Evita conflitos de foco
                onChange={(e) => {
                  if (e.target.value) {
                    // Restaurar foco no editor antes de inserir
                    editorRef.current?.focus()
                    document.execCommand('insertText', false, e.target.value)
                    e.target.value = ''
                    // Forçar atualização do estado
                    if (editorRef.current) onChange(editorRef.current.innerHTML)
                  }
                }}
              >
                <option value="">{'{ }'} Inserir</option>
                {DYNAMIC_VARIABLES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className={`focus:outline-none focus:ring-1 focus:ring-[#76BA1B]/20 rounded px-1 transition-all min-h-[1em] ${className}`}
      />
      {(!value || value === '<p></p>' || value === '<br>') && placeholder && (
        <div className="absolute top-0 left-1 text-slate-300 pointer-events-none text-sm italic">
          {placeholder}
        </div>
      )}
      
      {/* Guia de Ajuda de Variáveis */}
      <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-300">
        <span className="w-1 h-1 rounded-full bg-[#76BA1B]/30"></span>
        Dica: Use 
        <code className="text-[#76BA1B] bg-[#76BA1B]/5 px-1 rounded">{'{{objeto.campo}}'}</code> 
        para dados dinâmicos
      </div>
    </div>
  )
}

export interface ReportSection {
  id: string
  type: 'text' | 'items' | 'header' | 'footer' | 'summary' | 'stats' | 'charts' | 'taxes'
  title: string
  content: string // HTML or Markdown for text sections
  config?: any
}

export type ReportItem = ReportSection // Reutilizando o tipo original para compatibilidade básica

interface ReportDesignerProps {
  initialStructure?: ReportSection[]
  onSave: (structure: ReportSection[]) => void
}

export function ReportDesigner({ initialStructure = [], onSave }: ReportDesignerProps) {
  const [sections, setSections] = useState<ReportSection[]>(() => {
    if (initialStructure.length > 0) return initialStructure
    // Seções padrão para uma nova proposta
    return [
      { 
        id: 'sec-header', 
        type: 'header', 
        title: 'Cabeçalho Principal', 
        content: '<p>Apresentamos nossa proposta técnica e comercial.</p>',
        config: { 
          backgroundColor: '#76BA1B', 
          logoAlign: 'left', 
          logoUrl: '', 
          backgroundImage: '',
          proposalNumber: `PROPOSTA #${Math.floor(Math.random() * 10000)}`
        } 
      },
      { id: 'sec-intro', type: 'text', title: 'Introdução', content: '<p>Digite seu texto aqui...</p>' },
      { id: 'sec-items', type: 'items', title: 'Produtos e serviços', content: '' },
      { 
        id: 'sec-footer', 
        type: 'footer', 
        title: 'Rodapé de Identificação', 
        content: '',
        config: { 
          backgroundColor: '#76BA1B', 
          logoAlign: 'left', 
          logoUrl: '', 
          backgroundImage: '',
          address: 'Endereço da Empresa',
          contact: 'Escritório, Telefone, E-mail'
        } 
      }
    ]
  })
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [configuringSectionId, setConfiguringSectionId] = useState<string | null>(null)

  const handleAddSection = (type: ReportSection['type']) => {
    addSection(type)
    setIsAddModalOpen(false)
  }

  const addSection = (type: ReportSection['type']) => {
    const titles: Record<ReportSection['type'], string> = {
      header: 'Cabeçalho da Proposta',
      text: 'Texto Livre',
      items: 'Lista de Produtos',
      summary: 'Resumo de Totais',
      footer: 'Rodapé de Endereço',
      stats: 'Indicadores de Performance',
      charts: 'Análise Gráfica',
      taxes: 'Detalhamento Tributário'
    }
    
    // Verificar se já existe cabeçalho ou rodapé
    if ((type === 'header' && sections.some(s => s.type === 'header')) || 
        (type === 'footer' && sections.some(s => s.type === 'footer'))) {
      return
    }

    const newSection: ReportSection = {
      id: `sec-${Date.now()}`,
      type,
      title: titles[type],
      content: type === 'text' ? '<p>Digite "/" ou "{{" para inserir variáveis...</p>' : '',
      config: (type === 'header' || type === 'footer')
        ? { 
            logoAlign: 'left', 
            logoUrl: '', 
            backgroundImage: '', 
            backgroundColor: '#76BA1B',
            proposalNumber: type === 'header' ? `PROPOSTA #${Math.floor(Math.random() * 10000)}` : undefined,
            address: type === 'footer' ? 'Endereço da Empresa' : undefined,
            contact: type === 'footer' ? 'Escritório, Telefone, E-mail' : undefined
          }
        : type === 'items' 
          ? { columns: AVAILABLE_COLUMNS.filter(c => c.default).map(c => c.id) } 
          : type === 'stats' 
            ? { stats: ['total', 'margin'] }
            : type === 'charts'
              ? { charts: ['group_composition', 'volume_dist'] }
              : {}
    }

    if (type === 'header') {
      setSections([newSection, ...sections])
    } else if (type === 'footer') {
      setSections([...sections, newSection])
    } else {
      // Inserir antes do rodapé se ele existir, senão no fim
      const footerIndex = sections.findIndex(s => s.type === 'footer')
      if (footerIndex !== -1) {
        const newSections = [...sections]
        newSections.splice(footerIndex, 0, newSection)
        setSections(newSections)
      } else {
        setSections([...sections, newSection])
      }
    }
  }

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections(prev => {
      const newSections = [...prev]
      const section = newSections[index]
      
      // Bloquear movimento de Header e Footer
      if (section.type === 'header' || section.type === 'footer') return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      
      // Impedir de ultrapassar Header (index 0) ou Footer (último index)
      if (newIndex <= 0 && prev[0]?.type === 'header') return prev
      if (newIndex >= prev.length - 1 && prev[prev.length - 1]?.type === 'footer') return prev

      if (newIndex >= 0 && newIndex < newSections.length) {
        const temp = newSections[index]
        newSections[index] = newSections[newIndex]
        newSections[newIndex] = temp
        return newSections
      }
      return prev
    })
  }

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/10 overflow-hidden">
      {/* Header do Designer - Ajustado padding e cor */}
      <div className="bg-transparent px-4 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#76BA1B]/10 p-2 rounded-lg">
            <Layout className="w-5 h-5 text-[#76BA1B]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Editor de Proposta Composta</h2>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Personalize as seções do documento</p>
          </div>
        </div>
        <Button 
          className="bg-[#76BA1B] hover:bg-[#76BA1B]/90 text-white rounded-full px-6 text-xs h-9 font-bold shadow-sm"
          onClick={() => onSave(sections)}
        >
          Finalizar Modelo
        </Button>
      </div>

      {/* Área de Edição Centralizada - Ajustado padding lateral */}
      <ScrollArea className="flex-1 px-4">
        <div className="flex flex-col gap-8 pb-32">
          
          <AnimatePresence>
            {sections.map((section, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={section.id}
                className="relative"
              >
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="bg-slate-50/80 px-6 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="border-l-2 border-[#76BA1B] pl-3">
                        <Input 
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="bg-transparent border-none p-0 text-[10px] font-black text-slate-500 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 w-auto min-w-[250px] uppercase tracking-[0.2em]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {section.type !== 'header' && section.type !== 'footer' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 text-slate-400 hover:text-[#76BA1B] hover:bg-[#76BA1B]/5 ${index <= 1 && sections[0]?.type === 'header' ? 'opacity-0 pointer-events-none' : ''}`}
                            onClick={() => moveSection(index, 'up')}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 text-slate-400 hover:text-[#76BA1B] hover:bg-[#76BA1B]/5 ${index >= sections.length - 2 && sections[sections.length-1]?.type === 'footer' ? 'opacity-0 pointer-events-none' : ''}`}
                            onClick={() => moveSection(index, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeSection(section.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    {section.type === 'text' && (
                      <div className="p-8 relative group">
                        <InlineRichEditor 
                          value={section.content}
                          onChange={(val) => updateSection(section.id, { content: val })}
                          placeholder="Digite aqui o conteúdo da seção..."
                          showVariables={true}
                          className="w-full min-h-[150px] p-0 text-slate-700 font-medium leading-relaxed prose prose-slate max-w-none"
                        />
                        <div className="absolute bottom-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest text-right">Editor Rich Text</p>
                        </div>
                      </div>
                    )}
                    
                    {section.type === 'header' && (
                      <div className="relative min-h-[250px] overflow-hidden group border-b">
                        {/* Background do Cabeçalho */}
                        <div 
                          className="absolute inset-0 overflow-hidden"
                          style={{ 
                            backgroundColor: section.config?.backgroundColor || '#76BA1B',
                            backgroundImage: section.config?.backgroundImage ? `url(${section.config.backgroundImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {(section.config?.backgroundImage || (section.config?.backgroundColor && section.config.backgroundColor !== '#ffffff')) && (
                            <div className="absolute inset-0 bg-black/20" />
                          )}
                        </div>

                        {/* Controles de Configuração do Cabeçalho (Overlay em Hover) */}
                        <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-slate-800 text-xs gap-2 rounded-full shadow-lg h-8 px-4"
                            onClick={() => {
                              const url = prompt('URL da Imagem de Fundo:', section.config?.backgroundImage || '')
                              if (url !== null) updateSection(section.id, { config: { ...section.config, backgroundImage: url } })
                            }}
                          >
                            <ImageIconLucide className="w-3.5 h-3.5 text-[#76BA1B]" /> Fundo
                          </Button>
                          <div className="bg-white/90 rounded-full px-2 flex items-center shadow-lg h-8 gap-1">
                            {COLORS.slice(0, 4).map(color => (
                              <button 
                                key={color} 
                                className={`w-4 h-4 rounded-full border border-slate-200 ${section.config?.backgroundColor === color ? 'ring-2 ring-offset-1 ring-[#76BA1B]' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateSection(section.id, { config: { ...section.config, backgroundColor: color, backgroundImage: '' } })}
                              />
                            ))}
                          </div>
                          <Button 
                            variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-slate-800 text-xs gap-2 rounded-full shadow-lg h-8 px-4"
                            onClick={() => {
                              const url = prompt('URL do Logotipo:', section.config?.logoUrl || '')
                              if (url !== null) updateSection(section.id, { config: { ...section.config, logoUrl: url } })
                            }}
                          >
                            <Paintbrush className="w-3.5 h-3.5 text-[#76BA1B]" /> Logo
                          </Button>
                          <div className="bg-white/90 rounded-full px-2 flex items-center shadow-lg h-8">
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'left' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'left' } })}
                            ><AlignLeft className="w-3.5 h-3.5" /></Button>
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'center' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'center' } })}
                            ><AlignCenter className="w-3.5 h-3.5" /></Button>
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'right' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'right' } })}
                            ><AlignRight className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>

                        {/* Conteúdo Real do Cabeçalho */}
                        <div className="relative z-10 p-12 h-full flex flex-col justify-between">
                          <div className={`flex ${
                            section.config?.logoAlign === 'center' ? 'justify-center' : 
                            section.config?.logoAlign === 'right' ? 'justify-end' : 'justify-start'
                          }`}>
                            {section.config?.logoUrl ? (
                              <img src={section.config.logoUrl} alt="Logo" className="max-h-20 w-auto" />
                            ) : (
                              <div className="h-16 w-48 bg-white/10 rounded-xl flex items-center justify-center border-2 border-dashed border-white/20 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                Logotipo
                              </div>
                            )}
                          </div>

                          <div className="mt-8 flex justify-between items-end gap-8">
                            <div className="space-y-2 flex-1">
                              <InlineRichEditor 
                                value={section.title || ''}
                                onChange={(val) => updateSection(section.id, { title: val })}
                                className="text-5xl font-black text-white p-0 tracking-tighter"
                                showVariables={true}
                                placeholder="Título do Relatório"
                              />
                              <InlineRichEditor 
                                value={section.content || ''}
                                onChange={(val) => updateSection(section.id, { content: val })}
                                className="text-white/70 text-sm max-w-xl p-0"
                                showVariables={true}
                                placeholder="Apresentamos nossa proposta técnica e comercial."
                              />
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 text-right shrink-0">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Identificação</p>
                              <InlineRichEditor 
                                value={section.config?.proposalNumber || ''}
                                onChange={(val) => updateSection(section.id, { config: { ...section.config, proposalNumber: val } })}
                                className="text-xl font-black text-[#76BA1B] p-0"
                                showVariables={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.type === 'items' && (
                      <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-xs text-slate-500">Produtos e serviços com valor e quantidade da oportunidade.</p>
                          <Button 
                            variant="ghost" 
                            className="text-[#76BA1B] font-bold text-xs gap-2 hover:bg-[#76BA1B]/10"
                            onClick={() => {
                              setConfiguringSectionId(section.id)
                              setIsConfigModalOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4" /> Configurar Tabela
                          </Button>
                        </div>

                        {/* Visualização dinâmica das colunas conforme configurado */}
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-slate-50 flex border-b border-slate-100">
                            {(section.config?.columns || []).map((colId: string) => {
                              const col = AVAILABLE_COLUMNS.find(c => c.id === colId)
                              return (
                                <div key={colId} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 border-r border-slate-100 last:border-0 truncate">
                                  {col?.label || colId}
                                </div>
                              )
                            })}
                          </div>
                          <div className="p-10 flex flex-col items-center justify-center text-slate-300 gap-2 bg-white/50">
                             <Package className="w-10 h-10 opacity-10" />
                             <span className="text-xs font-bold uppercase tracking-widest text-slate-200">[Dados Dinâmicos do Pedido]</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.type === 'stats' && (
                      <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-xs text-slate-500 font-medium">Cards informativos com métricas do pedido.</p>
                          <Button 
                            variant="ghost" 
                            className="text-[#76BA1B] font-bold text-xs gap-2 hover:bg-[#76BA1B]/10"
                            onClick={() => {
                              setConfiguringSectionId(section.id)
                              setIsConfigModalOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4" /> Configurar Indicadores
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(section.config?.stats || []).map((statId: string, i: number) => {
                            const stat = AVAILABLE_STATS.find(s => s.id === statId)
                            if (!stat) return null
                            const Icon = stat.icon === 'Calculator' ? Calculator : 
                                         stat.icon === 'BarChart' ? BarChart3 : 
                                         stat.icon === 'Percent' ? Percent : 
                                         stat.icon === 'Package' ? Package : Info
                            return (
                              <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#76BA1B]/10 transition-colors">
                                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#76BA1B]" />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800 tracking-tight">
                                  {stat.value}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {section.type === 'charts' && (
                      <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-3">
                              <BarChart3 className="w-5 h-5 text-[#76BA1B]" />
                              <div>
                                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Análise Visual do Pedido</h3>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gráficos gerados a partir do resumo.</p>
                              </div>
                           </div>
                           <Button 
                            variant="ghost" 
                            className="text-[#76BA1B] font-bold text-xs gap-2 hover:bg-[#76BA1B]/10"
                            onClick={() => {
                              setConfiguringSectionId(section.id)
                              setIsConfigModalOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4" /> Configurar Gráficos
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {(section.config?.charts || []).map((chartId: string, i: number) => {
                            const chart = AVAILABLE_CHARTS.find(c => c.id === chartId)
                            if (!chart) return null
                            
                            return chart.type === 'bar' ? (
                              <div key={i} className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <BarChart3 className="w-4 h-4 text-[#76BA1B]" />
                                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{chart.label}</span>
                                    </div>
                                </div>
                                <div className="h-44 flex items-end gap-3 px-4">
                                    <div className="flex-1 bg-slate-100 rounded-t-lg h-[60%] hover:bg-[#76BA1B]/40 transition-all cursor-help"></div>
                                    <div className="flex-1 bg-slate-100 rounded-t-lg h-[90%] hover:bg-[#76BA1B]/40 transition-all cursor-help"></div>
                                    <div className="flex-1 bg-[#76BA1B]/20 rounded-t-lg h-[40%] hover:bg-[#76BA1B] transition-all cursor-help"></div>
                                    <div className="flex-1 bg-slate-100 rounded-t-lg h-[75%] hover:bg-[#76BA1B]/40 transition-all cursor-help"></div>
                                </div>
                              </div>
                            ) : (
                              <div key={i} className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <PieChart className="w-4 h-4 text-[#76BA1B]" />
                                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{chart.label}</span>
                                    </div>
                                </div>
                                <div className="h-44 flex items-center justify-center relative">
                                    <div className="w-32 h-32 rounded-full border-[12px] border-slate-100 relative">
                                      <div className="absolute inset-x-0 top-0 h-1/2 border-[12px] border-[#76BA1B] rounded-t-full -m-[12px] border-b-0"></div>
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-xl font-black text-slate-800 tracking-tight">64%</span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Líquido</span>
                                    </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {section.type === 'taxes' && (
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                           <Landmark className="w-5 h-5 text-[#76BA1B]" />
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Detalhamento de Impostos Simulados</h3>
                        </div>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                           <div className="bg-slate-50 flex border-b border-slate-100">
                              <div className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3 border-r border-slate-100 text-left">Tributo</div>
                              <div className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/6 border-r border-slate-100 text-right">Alíquota</div>
                              <div className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4 border-r border-slate-100 text-right">Base de Cálculo</div>
                              <div className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 text-right">Valor</div>
                           </div>
                           <div className="p-12 flex flex-col items-center justify-center text-slate-300 gap-2 bg-white/50 italic text-sm">
                              [Tabela Dinâmica baseada nas Regras de Impostos do Pedido]
                           </div>
                        </div>
                      </div>
                    )}

                    {section.type === 'summary' && (
                      <div className="p-8 bg-slate-50/20 flex flex-col items-end gap-3 relative group">
                         <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-[#76BA1B] font-bold text-xs gap-2 hover:bg-[#76BA1B]/10 rounded-full"
                              onClick={() => {
                                setConfiguringSectionId(section.id)
                                setIsConfigModalOpen(true)
                              }}
                            >
                              <Settings2 className="w-3.5 h-3.5" /> Configurar Estilo
                            </Button>
                         </div>
                         <div className="w-64 space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-400">
                               <span>TOTAL PRODUTOS</span>
                               <span className="font-bold text-slate-600">R$ 0,00</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-slate-400">
                               <span>TOTAL IMPOSTOS</span>
                               <span className="font-bold text-slate-600">R$ 0,00</span>
                            </div>
                            <div className="h-0.5 bg-slate-100 w-full my-4"></div>
                            <div className="flex justify-between text-base font-black text-slate-800 tracking-tight">
                               <span>VALOR LÍQUIDO</span>
                               <span className="text-[#76BA1B]">R$ 0,00</span>
                            </div>
                         </div>
                      </div>
                    )}

                    {section.type === 'footer' && (
                      <div className="relative min-h-[250px] overflow-hidden group border-t">
                        {/* Background do Rodapé */}
                        <div 
                          className="absolute inset-0 overflow-hidden"
                          style={{ 
                            backgroundColor: section.config?.backgroundColor || '#76BA1B',
                            backgroundImage: section.config?.backgroundImage ? `url(${section.config.backgroundImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {(section.config?.backgroundImage || (section.config?.backgroundColor && section.config.backgroundColor !== '#ffffff')) && (
                            <div className="absolute inset-0 bg-black/20" />
                          )}
                        </div>

                        {/* Controles do Rodapé */}
                        <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-slate-800 text-xs gap-2 rounded-full shadow-lg h-8 px-4"
                            onClick={() => {
                              const url = prompt('URL da Imagem de Fundo:', section.config?.backgroundImage || '')
                              if (url !== null) updateSection(section.id, { config: { ...section.config, backgroundImage: url } })
                            }}
                          >
                            <ImageIconLucide className="w-3.5 h-3.5 text-[#76BA1B]" /> Fundo
                          </Button>
                          <div className="bg-white/90 rounded-full px-2 flex items-center shadow-lg h-8 gap-1">
                            {COLORS.slice(0, 4).map(color => (
                              <button 
                                key={color} 
                                className={`w-4 h-4 rounded-full border border-slate-200 ${section.config?.backgroundColor === color ? 'ring-2 ring-offset-1 ring-[#76BA1B]' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateSection(section.id, { config: { ...section.config, backgroundColor: color, backgroundImage: '' } })}
                              />
                            ))}
                          </div>
                          <Button 
                            variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-slate-800 text-xs gap-2 rounded-full shadow-lg h-8 px-4"
                            onClick={() => {
                              const url = prompt('URL do Logotipo:', section.config?.logoUrl || '')
                              if (url !== null) updateSection(section.id, { config: { ...section.config, logoUrl: url } })
                            }}
                          >
                            <Paintbrush className="w-3.5 h-3.5 text-[#76BA1B]" /> Logo
                          </Button>
                          <div className="bg-white/90 rounded-full px-2 flex items-center shadow-lg h-8">
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'left' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'left' } })}
                            ><AlignLeft className="w-3.5 h-3.5" /></Button>
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'center' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'center' } })}
                            ><AlignCenter className="w-3.5 h-3.5" /></Button>
                            <Button 
                              variant="ghost" size="sm" className={`h-6 w-6 p-0 ${section.config?.logoAlign === 'right' ? 'text-[#76BA1B]' : 'text-slate-400'}`}
                              onClick={() => updateSection(section.id, { config: { ...section.config, logoAlign: 'right' } })}
                            ><AlignRight className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>

                        {/* Conteúdo do Rodapé (Identico ao Cabeçalho) */}
                        <div className="relative z-10 p-12 h-full flex flex-col justify-between">
                          <div className={`flex ${
                            section.config?.logoAlign === 'center' ? 'justify-center' : 
                            section.config?.logoAlign === 'right' ? 'justify-end' : 'justify-start'
                          }`}>
                            {section.config?.logoUrl ? (
                              <img src={section.config.logoUrl} alt="Logo" className="max-h-16 w-auto" />
                            ) : (
                              <div className="h-12 w-36 bg-white/10 rounded-xl flex items-center justify-center border-2 border-dashed border-white/20 text-white/40 text-[8px] font-black uppercase tracking-widest">
                                Logotipo
                              </div>
                            )}
                          </div>

                          <div className="mt-8 flex justify-between items-end gap-8">
                            <div className="space-y-2 flex-1">
                              <InlineRichEditor 
                                placeholder="Endereço da Empresa"
                                value={section.config?.address || ''}
                                onChange={(val) => updateSection(section.id, { config: { ...section.config, address: val } })}
                                showVariables={true}
                                className={`text-xl font-bold w-full ${section.config?.backgroundImage || (section.config?.backgroundColor && section.config.backgroundColor !== '#f8fafc') ? 'text-white' : 'text-slate-700'}`}
                              />
                              <InlineRichEditor 
                                placeholder="Escritório, Telefone, E-mail"
                                value={section.config?.contact || ''}
                                onChange={(val) => updateSection(section.id, { config: { ...section.config, contact: val } })}
                                showVariables={true}
                                className={`text-sm font-medium w-full ${section.config?.backgroundImage || (section.config?.backgroundColor && section.config.backgroundColor !== '#f8fafc') ? 'text-white/60' : 'text-slate-400'}`}
                              />
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 text-right shrink-0 relative overflow-hidden group/page">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Assinatura</p>
                              <div className={`text-sm font-black uppercase tracking-widest ${section.config?.backgroundImage || (section.config?.backgroundColor && section.config.backgroundColor !== '#f8fafc') ? 'text-[#76BA1B]' : 'text-[#76BA1B]'}`}>
                                Vendedor: {'{{vendedor.nome}}'}
                              </div>
                              {/* Indicador de Paginação */}
                              <div className="absolute top-0 right-0 p-1 opacity-20 group-hover/page:opacity-100 transition-opacity">
                                <span className="text-[8px] font-black text-white bg-black/20 px-2 py-0.5 rounded-full">Pág. {'{{sistema.pagina}}'} / {'{{sistema.total_paginas}}'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Botão para abrir o Modal no final */}
          <div className="flex justify-center pt-8 pb-12">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-[#76BA1B] hover:border-[#76BA1B] hover:bg-[#76BA1B]/5 rounded-2xl px-10 shadow-sm transition-all flex items-center gap-3 group">
                  <div className="bg-slate-100 group-hover:bg-[#76BA1B]/10 p-1.5 rounded-lg transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#76BA1B]" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">Adicionar Nova Seção</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-50/50 border-b">
                  <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">O que deseja adicionar?</DialogTitle>
                  <p className="text-sm text-slate-500">Selecione o tipo de bloco para compor sua proposta</p>
                </DialogHeader>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleAddSection('header')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-[#76BA1B]/20 hover:bg-[#76BA1B]/5 transition-all text-left group"
                  >
                    <div className="bg-[#76BA1B]/10 p-3 rounded-xl group-hover:scale-110 transition-transform"><Layout className="w-6 h-6 text-[#76BA1B]" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Cabeçalho Premium</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Banner com imagem, logo e numeração.</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleAddSection('text')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-left group"
                  >
                    <div className="bg-purple-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><Type className="w-6 h-6 text-purple-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Texto Livre</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Introduções, termos e observações customizadas.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('items')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-[#76BA1B]/20 hover:bg-[#76BA1B]/5 transition-all text-left group"
                  >
                    <div className="bg-[#76BA1B]/10 p-3 rounded-xl group-hover:scale-110 transition-transform"><Package className="w-6 h-6 text-[#76BA1B]" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Tabela de Produtos</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Lista automática de todos os itens do pedido.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('summary')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                  >
                    <div className="bg-blue-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><Calculator className="w-6 h-6 text-blue-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Resumo de Totais</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Cálculos automáticos de subtotal e impostos.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('stats')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all text-left group"
                  >
                    <div className="bg-orange-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><BarChart3 className="w-6 h-6 text-orange-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Indicadores Rápidos</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Cards com métricas-chave e descontos.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('charts')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left group"
                  >
                    <div className="bg-emerald-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><PieChart className="w-6 h-6 text-emerald-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Gráficos de Pedido</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Visualização visual da composição da venda.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('taxes')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all text-left group"
                  >
                    <div className="bg-cyan-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><Landmark className="w-6 h-6 text-cyan-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Análise de Impostos</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Tabela detalhada de impostos simulados.</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAddSection('footer')}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:scale-110 transition-transform"><MapPin className="w-6 h-6 text-slate-600" /></div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-slate-700 block">Rodapé de Endereço</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight block">Informações de contato e redes sociais.</span>
                    </div>
                  </button>
                </div>
                <div className="p-6 bg-slate-50/50 border-t flex justify-center italic text-[10px] text-slate-400 font-medium">
                  PredictSales Designer &bull; Versão 3.0
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Modal de Configuração de Tabela */}
          <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <DialogHeader className="p-8 bg-slate-50/50 border-b">
                <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
                  {sections.find(s => s.id === configuringSectionId)?.type === 'stats' ? 'Configurar Indicadores' : 
                   sections.find(s => s.id === configuringSectionId)?.type === 'charts' ? 'Configurar Gráficos' :
                   'Configurar Colunas'}
                </DialogTitle>
                <p className="text-sm text-slate-500">
                  {sections.find(s => s.id === configuringSectionId)?.type === 'stats' ? 'Selecione quais métricas exibir nos cards' : 
                   sections.find(s => s.id === configuringSectionId)?.type === 'charts' ? 'Selecione quais gráficos exibir na análise' :
                   'Selecione quais informações exibir na tabela de itens'}
                </p>
              </DialogHeader>
              <div className="p-8 space-y-6">
                {/* Opções de Layout Avançadas */}
                {sections.find(s => s.id === configuringSectionId)?.type === 'items' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Estilo da Tabela</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => updateSection(configuringSectionId!, { config: { ...sections.find(s => s.id === configuringSectionId)?.config, layout: 'modern' } })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          (!sections.find(s => s.id === configuringSectionId)?.config?.layout || sections.find(s => s.id === configuringSectionId)?.config?.layout === 'modern')
                          ? 'border-[#76BA1B] bg-[#76BA1B]/5 text-[#76BA1B]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        Moderno (Espaçado)
                      </button>
                      <button 
                        onClick={() => updateSection(configuringSectionId!, { config: { ...sections.find(s => s.id === configuringSectionId)?.config, layout: 'technical' } })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          sections.find(s => s.id === configuringSectionId)?.config?.layout === 'technical'
                          ? 'border-[#76BA1B] bg-[#76BA1B]/5 text-[#76BA1B]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        Técnico (Denso)
                      </button>
                    </div>
                  </div>
                )}

                {sections.find(s => s.id === configuringSectionId)?.type === 'summary' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Estilo do Resumo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => updateSection(configuringSectionId!, { config: { ...sections.find(s => s.id === configuringSectionId)?.config, style: 'card' } })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          (!sections.find(s => s.id === configuringSectionId)?.config?.style || sections.find(s => s.id === configuringSectionId)?.config?.style === 'card')
                          ? 'border-[#1E5128] bg-[#1E5128]/5 text-[#1E5128]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        Card Moderno
                      </button>
                      <button 
                        onClick={() => updateSection(configuringSectionId!, { config: { ...sections.find(s => s.id === configuringSectionId)?.config, style: 'boxed' } })}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          sections.find(s => s.id === configuringSectionId)?.config?.style === 'boxed'
                          ? 'border-[#1E5128] bg-[#1E5128]/5 text-[#1E5128]'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        Técnico (Boxed)
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {sections.find(s => s.id === configuringSectionId)?.type === 'stats' ? (
                    AVAILABLE_STATS.map((stat) => {
                      const section = sections.find(s => s.id === configuringSectionId)
                      const isSelected = section?.config?.stats?.includes(stat.id) || false

                      return (
                        <div 
                          key={stat.id} 
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-[#76BA1B] bg-[#76BA1B]/5' : 'border-slate-100 hover:border-slate-200'
                          }`}
                          onClick={() => {
                            if (!configuringSectionId) return
                            const currentStats = section?.config?.stats || []
                            const newStats = isSelected 
                              ? currentStats.filter((id: string) => id !== stat.id)
                              : [...currentStats, stat.id]
                            
                            updateSection(configuringSectionId, { 
                              config: { ...section?.config, stats: newStats } 
                            })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isSelected ? 'bg-[#76BA1B] border-[#76BA1B]' : 'border-slate-200 bg-white'
                            }`}>
                              {isSelected && <Plus className="w-3 h-3 text-white rotate-45" />}
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                              {stat.label}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : sections.find(s => s.id === configuringSectionId)?.type === 'charts' ? (
                    AVAILABLE_CHARTS.map((chart) => {
                      const section = sections.find(s => s.id === configuringSectionId)
                      const isSelected = section?.config?.charts?.includes(chart.id) || false

                      return (
                        <div 
                          key={chart.id} 
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-[#76BA1B] bg-[#76BA1B]/5' : 'border-slate-100 hover:border-slate-200'
                          }`}
                          onClick={() => {
                            if (!configuringSectionId) return
                            const currentCharts = section?.config?.charts || []
                            const newCharts = isSelected 
                              ? currentCharts.filter((id: string) => id !== chart.id)
                              : [...currentCharts, chart.id]
                            
                            updateSection(configuringSectionId, { 
                              config: { ...section?.config, charts: newCharts } 
                            })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isSelected ? 'bg-[#76BA1B] border-[#76BA1B]' : 'border-slate-200 bg-white'
                            }`}>
                              {isSelected && <Plus className="w-3 h-3 text-white rotate-45" />}
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                              {chart.label}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    AVAILABLE_COLUMNS.map((col) => {
                      const section = sections.find(s => s.id === configuringSectionId)
                      const isSelected = section?.config?.columns?.includes(col.id) || false

                      return (
                        <div 
                          key={col.id} 
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-[#76BA1B] bg-[#76BA1B]/5' : 'border-slate-100 hover:border-slate-200'
                          }`}
                          onClick={() => {
                            if (!configuringSectionId) return
                            const currentColumns = section?.config?.columns || []
                            const newColumns = isSelected 
                              ? currentColumns.filter((id: string) => id !== col.id)
                              : [...currentColumns, col.id]
                            
                            updateSection(configuringSectionId, { 
                              config: { ...section?.config, columns: newColumns } 
                            })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isSelected ? 'bg-[#76BA1B] border-[#76BA1B]' : 'border-slate-200 bg-white'
                            }`}>
                              {isSelected && <Plus className="w-3 h-3 text-white rotate-45" />}
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                              {col.label}
                            </span>
                          </div>
                          {col.default && (
                            <span className="text-[10px] font-black text-[#76BA1B] uppercase tracking-widest bg-[#76BA1B]/10 px-2 py-0.5 rounded-full">Padrão</span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              <DialogFooter className="p-6 bg-slate-50/50 border-t flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">As alterações são salvas automaticamente</p>
                <Button 
                  className="bg-[#76BA1B] hover:bg-[#76BA1B]/90 text-white rounded-full px-8 font-bold"
                  onClick={() => setIsConfigModalOpen(false)}
                >
                  Concluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}
