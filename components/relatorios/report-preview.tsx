"use client"

import React, { useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { toJpeg } from 'html-to-image'
import { Button } from '@/components/ui/button'
import { Download, Printer, Eye, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReportSection {
  id: string
  type: 'text' | 'items' | 'header' | 'footer' | 'summary' | 'stats' | 'charts' | 'taxes'
  title: string
  content: string
  config?: any
}

interface ReportPreviewProps {
  modelo: {
    NOME: string
    ESTRUTURA_JSON: string | ReportSection[]
    LOGO_URL?: string
  }
  dados: any
}

export function ReportPreview({ modelo, dados }: ReportPreviewProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const sections: ReportSection[] = typeof modelo.ESTRUTURA_JSON === 'string' 
    ? JSON.parse(modelo.ESTRUTURA_JSON) 
    : modelo.ESTRUTURA_JSON

  // Helper para buscar valores aninhados (ex: cliente.razao_social)
  const getNestedValue = (obj: any, path: string) => {
    if (!obj) return undefined;
    const parts = path.toLowerCase().split('.');
    return parts.reduce((acc, part) => {
      if (!acc) return undefined;
      // Busca case-insensitive
      const key = Object.keys(acc).find(k => k.toLowerCase() === part);
      return key ? acc[key] : undefined;
    }, obj);
  }

  const parseContent = (content: string) => {
    if (!content) return ''
    // Parser para substituir variáveis {{OBJ.PROP}} ou {{VAR}}
    return content.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
      const path = p1.trim()
      const value = getNestedValue(dados, path)
      
      if (value !== undefined && value !== null) {
        if (typeof value === 'number' && path.toLowerCase().includes('total')) {
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        }
        return String(value);
      }
      return match;
    })
  }

  const generatePDF = async () => {
    if (!reportRef.current) return
    
    try {
      setIsGenerating(true)
      const toastId = toast.loading('Calculando páginas e gerando PDF multi-página...')

      // 1. Identificar elementos reais no DOM para captura individual
      const paperElement = reportRef.current
      const allSectionElements = Array.from(paperElement.querySelectorAll('[data-section-id]')) as HTMLElement[]
      
      const headerEl = allSectionElements.find(el => el.getAttribute('data-section-type') === 'header')
      const footerEl = allSectionElements.find(el => el.getAttribute('data-section-type') === 'footer')
      const contentEls = allSectionElements.filter(el => 
        el.getAttribute('data-section-type') !== 'header' && 
        el.getAttribute('data-section-type') !== 'footer'
      )

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      
      // Fator de conversão PX -> MM (baseado na largura do papel real no browser)
      const paperWidthPx = paperElement.offsetWidth
      const pxToMm = pdfWidth / paperWidthPx

      // 2. Capturar Header e Footer uma única vez (se existirem)
      let headerImg = '', headerHeightMm = 0
      let footerImg = '', footerHeightMm = 0

      if (headerEl) {
        headerImg = await toJpeg(headerEl, { quality: 0.95, pixelRatio: 2 })
        headerHeightMm = headerEl.offsetHeight * pxToMm
      }
      if (footerEl) {
        footerImg = await toJpeg(footerEl, { quality: 0.95, pixelRatio: 2 })
        footerHeightMm = footerEl.offsetHeight * pxToMm
      }

      let currentY = 0
      let isFirstPage = true

      const addNewPage = () => {
        if (!isFirstPage) pdf.addPage()
        isFirstPage = false
        currentY = 0
        
        // Adicionar Header em cada nova página
        if (headerImg) {
          pdf.addImage(headerImg, 'JPEG', 0, 0, pdfWidth, headerHeightMm)
          currentY = headerHeightMm
        }
      }

      const addFooterToCurrentPage = () => {
        if (footerImg) {
          pdf.addImage(footerImg, 'JPEG', 0, pdfHeight - footerHeightMm, pdfWidth, footerHeightMm)
        }
      }

      // 3. Processar Seções de Conteúdo
      addNewPage()

      for (const el of contentEls) {
        const sectionImg = await toJpeg(el, { quality: 0.95, pixelRatio: 2 })
        const sectionHeightMm = el.offsetHeight * pxToMm
        
        // Verificar se cabe na página atual (considerando o espaço para o rodapé)
        const spaceLeft = pdfHeight - footerHeightMm - currentY
        
        if (sectionHeightMm > spaceLeft) {
          // Não cabe: fecha página atual e pula para a próxima
          addFooterToCurrentPage()
          addNewPage()
        }

        pdf.addImage(sectionImg, 'JPEG', 0, currentY, pdfWidth, sectionHeightMm)
        currentY += sectionHeightMm
      }

      // Adicionar rodapé na última página
      addFooterToCurrentPage()

      pdf.save(`Relatorio_${modelo.NOME.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF multi-página gerado com sucesso!', { id: toastId })
    } catch (error) {
      console.error('Erro ao gerar PDF multi-página:', error)
      toast.error('Erro ao processar as páginas do PDF. Verifique o console.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 print:gap-0" style={{ backgroundColor: 'transparent' }}>
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden" style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(118, 186, 27, 0.1)' }}>
            <Eye className="w-6 h-6 text-[#76BA1B]" />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#1e293b' }}>Visualização Real</h3>
            <p className="text-xs font-medium" style={{ color: '#64748b' }}>Layout 1:1 (WYSIWYG) - O que você vê é o que será impresso</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl gap-2 font-bold px-6" style={{ borderColor: '#e2e8f0', color: '#475569' }} onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button 
            className="rounded-xl gap-2 font-bold px-8 shadow-lg shadow-[#1E5128]/20" 
            style={{ backgroundColor: '#1E5128', color: '#ffffff' }}
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Processando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> 
                Gerar PDF Fidelidade Total
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modern Preview Container */}
      <div className="p-4 md:p-12 flex justify-center overflow-x-auto min-h-[900px] rounded-3xl border print:p-0 print:bg-white print:border-none" style={{ backgroundColor: 'rgba(241, 245, 249, 0.5)', borderColor: 'rgba(226, 232, 240, 0.5)' }}>
        <div 
          ref={reportRef}
          id="report-capture-area"
          className="w-full max-w-[850px] min-h-[1100px] p-0 flex flex-col print:shadow-none print:p-0 rounded-sm"
          style={{ backgroundColor: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        >
          {sections.map((section) => (
            <div 
              key={section.id} 
              data-section-id={section.id}
              data-section-type={section.type}
              className="mb-0" 
              style={{ animation: 'fade-in 0.5s ease-out', breakInside: 'avoid' }}
            >
              
              {section.type === 'header' && (
                <div 
                  className="overflow-hidden relative min-h-[140px] p-8 md:p-12 flex flex-col justify-end"
                  style={{ 
                    backgroundColor: section.config?.backgroundColor || '#76BA1B',
                    backgroundImage: section.config?.backgroundImage ? `url(${section.config.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: '#ffffff',
                    position: 'relative'
                  }}
                >
                   {/* Overlay suave para legibilidade */}
                   <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
                   
                   <div className="relative z-10">
                      <div className={`flex mb-4 ${
                            section.config?.logoAlign === 'center' ? 'justify-center' : 
                            section.config?.logoAlign === 'right' ? 'justify-end' : 'justify-start'
                      }`}>
                          {section.config?.logoUrl ? (
                             <img src={section.config.logoUrl} alt="Logo" className="max-h-14 w-auto" />
                          ) : (
                             <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                                <FileText className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                             </div>
                          )}
                      </div>

                      <div className="flex justify-between items-end gap-6">
                         <div className="flex-1">
                            <h1 
                              className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 leading-none"
                              style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                              dangerouslySetInnerHTML={{ __html: parseContent(section.title) }}
                            />
                            <div 
                              className="text-xs max-w-xl font-medium"
                              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                              dangerouslySetInnerHTML={{ __html: parseContent(section.content) }}
                            />
                         </div>
                         {section.config?.proposalNumber && (
                            <div className="px-4 py-2 rounded-2xl border hidden sm:block" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                               <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Cód. Documento</p>
                               <div className="text-xs font-black text-white" style={{ color: '#ffffff' }} dangerouslySetInnerHTML={{ __html: parseContent(section.config.proposalNumber) }} />
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              )}

              {section.type === 'text' && (
                <div className="px-8 pt-10 pb-2 bg-white">
                  <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-2" style={{ color: '#64748b' }}>
                    {parseContent(section.title)}
                  </h4>
                  <div 
                    className="leading-relaxed text-sm prose prose-slate max-w-none font-medium"
                    style={{ color: '#475569' }}
                    dangerouslySetInnerHTML={{ __html: parseContent(section.content) }}
                  />
                </div>
              )}

              {section.type === 'items' && (
                <div className="px-0 py-8 bg-white">
                  <div className="px-8 mb-6">
                    <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-2" style={{ color: '#64748b' }}>
                      {parseContent(section.title)}
                    </h4>
                  </div>
                  
                  {section.config?.layout === 'technical' ? (
                    /* Layout Técnico (ERP Style) */
                    <div className="px-8 overflow-x-auto">
                      <table className="w-full text-left border border-slate-900 border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-900">
                          <tr>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase">Item</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase">Cód.</th>
                            <th className="py-1 px-3 border-r border-slate-900 text-[7px] font-black uppercase">Descrição</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase text-right">VL. ST</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase text-right">VL. IPI</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase">Marca</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase">Emb.</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase text-center">UN</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase text-center">Qtde</th>
                            <th className="py-1 px-2 border-r border-slate-900 text-[7px] font-black uppercase text-right">VLR. UNIT.</th>
                            <th className="py-1 px-2 text-[7px] font-black uppercase text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.itens?.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-900 last:border-0 h-8">
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] font-bold text-center">{idx + 1}</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] font-medium">{item.CODPROD}</td>
                              <td className="py-1 px-3 border-r border-slate-900 text-[8px] font-bold leading-tight">{item.DESCRPROD}</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] text-right">R$ 0,00</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] text-right">R$ 0,00</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] uppercase">PredSales</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px]">UNIDADE</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] text-center font-bold">{item.UN}</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] text-center font-black">{item.QTDNEG}</td>
                              <td className="py-1 px-2 border-r border-slate-900 text-[8px] text-right font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRUNIT)}</td>
                              <td className="py-1 px-2 text-[8px] text-right font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRTOT)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Layout Moderno */
                    <div className="border-y" style={{ borderColor: '#f1f5f9', backgroundColor: 'rgba(248, 250, 252, 0.3)' }}>
                      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <th className="py-3.5 px-8 text-[9px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>ID</th>
                            <th className="py-3.5 px-6 text-[9px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>Produto/Serviço</th>
                            <th className="py-3.5 px-4 text-[9px] font-black uppercase tracking-widest text-center" style={{ color: '#94a3b8' }}>Quant.</th>
                            <th className="py-3.5 px-4 text-[9px] font-black uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Unitário</th>
                            <th className="py-3.5 px-8 text-[9px] font-black uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody style={{ backgroundColor: '#ffffff' }}>
                          {dados.itens?.map((item: any, idx: number) => (
                            <tr key={idx} className="group transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td className="py-3.5 px-8 text-[11px] font-bold" style={{ color: '#94a3b8' }}>#{item.CODPROD}</td>
                              <td className="py-3.5 px-6">
                                <p className="font-bold text-sm" style={{ color: '#334155' }}>{item.DESCRPROD}</p>
                                {item.UN && <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#76BA1B' }}>{item.UN}</span>}
                              </td>
                              <td className="py-3.5 px-4 text-center text-sm font-black" style={{ color: '#475569' }}>{item.QTDNEG}</td>
                              <td className="py-3.5 px-4 text-right text-sm font-bold" style={{ color: '#64748b' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRUNIT)}
                              </td>
                              <td className="py-3.5 px-8 text-right font-black text-sm" style={{ color: '#1e293b' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRTOT)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {section.type === 'summary' && (
                <div className="mt-4 px-8 pb-10 bg-white">
                  {section.config?.style === 'boxed' ? (
                    /* Estilo Técnico Boxed (ERP Style) */
                    <div className="border border-slate-900 border-collapse bg-white">
                      <div className="flex border-b border-slate-900 bg-slate-100">
                        <div className="flex-1 p-3 border-r border-slate-900 space-y-1">
                          <div className="flex gap-2">
                             <span className="text-[8px] font-black">FORM. PAGTO:</span>
                             <span className="text-[8px] font-medium uppercase">{dados.pedido?.forma_pagamento || 'BOLETO BANCÁRIO'}</span>
                          </div>
                          <div className="flex gap-2">
                             <span className="text-[8px] font-black">COND. PAGTO:</span>
                             <span className="text-[8px] font-medium uppercase">{dados.pedido?.condicao || '30/60/90 DIAS'}</span>
                          </div>
                          <div className="flex gap-2">
                             <span className="text-[8px] font-black">FRETE:</span>
                             <span className="text-[8px] font-medium uppercase">{dados.pedido?.frete || 'EMITENTE (CIF)'}</span>
                          </div>
                          <div className="flex gap-2">
                             <span className="text-[8px] font-black">TRANSPORTADORA:</span>
                             <span className="text-[8px] font-medium uppercase">[Padrão Sistema]</span>
                          </div>
                        </div>
                        <div className="w-72 p-3 space-y-1.5 bg-slate-200/50">
                           <div className="flex justify-between items-center text-[8px]">
                              <span className="font-black">VALOR TOTAL IPI:</span>
                              <span className="font-medium text-right">R$ 0,00</span>
                           </div>
                           <div className="flex justify-between items-center text-[8px]">
                              <span className="font-black">VALOR TOTAL ST:</span>
                              <span className="font-medium text-right">R$ 0,00</span>
                           </div>
                           <div className="flex justify-between items-center text-[8px]">
                              <span className="font-black">TOTAL PRODUTOS:</span>
                              <span className="font-medium text-right font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pedido?.total || 0)}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-400">
                              <span className="font-black">TOTAL GERAL:</span>
                              <span className="font-black text-right text-base text-slate-900">
                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pedido?.total || 0)}
                              </span>
                           </div>
                        </div>
                      </div>
                      <div className="p-2 min-h-[40px] bg-slate-100/50">
                          <span className="text-[8px] font-black mr-2">OBSERVAÇÃO:</span>
                          <span className="text-[8px] font-medium uppercase">{dados.pedido?.observacao || 'NÃO FORAM LANÇADAS OBSERVAÇÕES PARA ESTE PEDIDO.'}</span>
                      </div>
                    </div>
                  ) : (
                    /* Estilo Moderno Card */
                    <div className="px-0 py-10 border-t bg-white" style={{ borderColor: '#f1f5f9' }}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                          <div className="flex-1 max-w-md">
                            <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: '#64748b' }}>
                                Observações Gerais
                            </h4>
                            <p className="text-xs leading-relaxed font-medium" style={{ color: '#94a3b8' }}>
                                Os valores apresentados nesta proposta contemplam todos os impostos devidos conforme a legislação vigente na data de emissão. Orçamento válido por 15 dias corridos.
                            </p>
                          </div>
                          
                          <div className="w-full md:w-80 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                <span>Subtotal Bruto</span>
                                <span style={{ color: '#1e293b' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pedido?.total || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                <span>Incentivos e Descontos</span>
                                <span style={{ color: '#ef4444' }}>- R$ 0,00</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                                <span>Impostos Agregados</span>
                                <span style={{ color: '#1e293b' }}>
                                  + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    dados.impostos?.reduce((sum: number, item: any) => 
                                      sum + (item.impostos?.reduce((s: number, imp: any) => s + (imp.valorImposto || 0), 0) || 0), 0
                                    ) || 0
                                  )}
                                </span>
                            </div>
                            <div className="h-px w-full my-4" style={{ backgroundColor: '#f1f5f9' }}></div>
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: '#94a3b8' }}>Investimento Total Líquido</p>
                                  <span className="text-4xl font-black tracking-tighter" style={{ color: '#1E5128' }}>
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                        (dados.pedido?.total || 0) + (dados.impostos?.reduce((sum: number, item: any) => 
                                          sum + (item.impostos?.reduce((s: number, imp: any) => s + (imp.valorImposto || 0), 0) || 0), 0
                                        ) || 0)
                                      )}
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(118, 186, 27, 0.1)' }}>
                                  <FileText className="w-5 h-5 text-[#76BA1B]" />
                                </div>
                            </div>
                          </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {section.type === 'stats' && (
                <div className="px-8 py-8 bg-white">
                  <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] mb-8" style={{ color: '#64748b' }}>
                    Indicadores e Métricas
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(section.config?.stats || ['total', 'margin', 'items_count']).map((statId: string, i: number) => {
                      const labels: any = { total: 'Total Pedido', margin: 'Participação', items_count: 'Qtd Itens', discount_total: 'Descontos' }
                      const values: any = { 
                         total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pedido?.total || 0),
                         margin: `${Math.min(100, Math.round(((dados.pedido?.total || 0) / 1000) * 100))}%`, // Exemplo de indicador
                         items_count: (dados.itens || []).length,
                         discount_total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.pedido?.valor_desconto || 0)
                      }
                      return (
                        <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group transition-all hover:bg-white hover:shadow-md">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{labels[statId] || statId}</p>
                           <div className="text-xl font-black text-slate-800 tracking-tight">{values[statId]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {section.type === 'charts' && (
                <div className="px-8 py-8 bg-white">
                  <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] mb-8" style={{ color: '#64748b' }}>
                    Análise Gráfica de Composição
                  </h4>
                  <div className="flex flex-wrap justify-center gap-10">
                    {(section.config?.charts || []).includes('group_composition') && (() => {
                      // Cálculo real de participação por MARCA/GRUPO
                      const groups: Record<string, number> = {};
                      dados.itens?.forEach((item: any) => {
                        const key = item.MARCA || item.CODGRUPOPROD || 'Outros';
                        groups[key] = (groups[key] || 0) + (item.VLRTOT || 0);
                      });
                      const totalVal = Object.values(groups).reduce((a, b) => a + b, 0);
                      const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 4);

                      return (
                        <div className="p-8 border border-slate-100 rounded-3xl bg-white shadow-sm flex-1 min-w-[300px] max-w-[400px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Participação por Grupo (%)</p>
                          <div className="h-40 flex items-end gap-3 px-4">
                              {sortedGroups.map(([name, val], idx) => {
                                const height = totalVal > 0 ? (val / totalVal) * 100 : 0;
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                    <div 
                                      className="w-full bg-[#76BA1B] rounded-t-lg transition-all duration-1000" 
                                      style={{ height: `${Math.max(height, 5)}%`, opacity: 1 - (idx * 0.2) }}
                                    ></div>
                                    <span className="text-[7px] font-black uppercase text-slate-400 truncate w-full text-center">{name}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })()}
                    {(section.config?.charts || []).includes('volume_dist') && (() => {
                      const totalItens = dados.itens?.reduce((acc: number, item: any) => acc + (item.QTDNEG || 0), 0) || 0;
                      return (
                        <div className="p-8 border border-slate-100 rounded-3xl bg-white shadow-sm flex flex-col items-center flex-1 min-w-[300px] max-w-[400px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 w-full text-left">Volume Total de Itens</p>
                          <div className="w-40 h-40 rounded-full border-[10px] border-slate-100 relative flex items-center justify-center">
                              <div className="absolute inset-x-0 top-0 h-1/2 border-[10px] border-[#76BA1B] rounded-t-full -m-[10px] border-b-0"></div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-slate-800 tracking-tight">{totalItens}</div>
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unidades</div>
                              </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {section.type === 'taxes' && (
                <div className="px-8 py-8 bg-white">
                  <h4 className="border-l-4 border-[#76BA1B] pl-4 py-0.5 text-[11px] font-black uppercase tracking-[0.25em] mb-8" style={{ color: '#64748b' }}>
                    Detalhamento Tributário
                  </h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse' }}>
                       <thead className="bg-slate-50/50 border-b border-slate-100">
                          <tr>
                             <th className="py-3 px-6 font-black uppercase tracking-widest text-[#94a3b8] text-[9px]">Tributo</th>
                             <th className="py-3 px-4 font-black uppercase tracking-widest text-[#94a3b8] text-[9px] text-right">Alíquota</th>
                             <th className="py-3 px-4 font-black uppercase tracking-widest text-[#94a3b8] text-[9px] text-right">Base de Cálculo</th>
                             <th className="py-3 px-8 font-black uppercase tracking-widest text-[#94a3b8] text-[9px] text-right">Valor</th>
                          </tr>
                       </thead>
                       <tbody className="bg-white">
                          {(dados.impostos && Array.isArray(dados.impostos) && dados.impostos.length > 0) ? (
                            // Consolidar impostos por nome/tipo se houver muitos itens
                            (() => {
                              const summary: Record<string, any> = {};
                              dados.impostos.forEach((item: any) => {
                                item.impostos?.forEach((imp: any) => {
                                  const key = imp.nomeImposto || 'Outros';
                                  if (!summary[key]) {
                                    summary[key] = { valor: 0, base: 0, aliq: imp.aliquota || 0 };
                                  }
                                  summary[key].valor += imp.valorImposto || 0;
                                  summary[key].base += item.valorTotal || 0;
                                });
                              });

                              return Object.entries(summary).map(([name, data], idx) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0">
                                  <td className="py-3 px-6 font-bold text-slate-600">{name}</td>
                                  <td className="py-3 px-4 text-right text-slate-400 font-medium">{data.aliq}%</td>
                                  <td className="py-3 px-4 text-right text-slate-400 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.base)}</td>
                                  <td className="py-3 px-8 text-right font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)}</td>
                                </tr>
                              ));
                            })()
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-300 font-medium text-[10px] uppercase tracking-widest bg-slate-50/30">
                                Nenhuma tributação aplicável para estes itens
                              </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section.type === 'footer' && (
                <div 
                  className="overflow-hidden relative min-h-[160px] p-8 mb-0"
                  style={{ 
                    backgroundColor: section.config?.backgroundColor || '#F8FAFC',
                    backgroundImage: section.config?.backgroundImage ? `url(${section.config.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}
                >
                   {/* Overlay suave se o fundo for escuro */}
                   {(section.config?.backgroundColor && section.config.backgroundColor !== '#F8FAFC') && (
                     <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
                   )}
                   
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 h-full px-8 md:px-0">
                      <div className="flex-1">
                          <div className={`text-xl font-black mb-3 tracking-tight ${section.config?.backgroundColor && section.config.backgroundColor !== '#F8FAFC' ? 'text-white' : 'text-slate-800'}`} 
                               style={{ color: section.config?.backgroundColor && section.config.backgroundColor !== '#F8FAFC' ? '#ffffff' : '#1e293b' }}
                               dangerouslySetInnerHTML={{ __html: parseContent(section.config?.address || 'Endereço Indefinido') }} />
                          <div className={`text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed ${section.config?.backgroundColor && section.config.backgroundColor !== '#F8FAFC' ? 'text-white/60' : 'text-slate-400'}`} 
                               style={{ color: section.config?.backgroundColor && section.config.backgroundColor !== '#F8FAFC' ? 'rgba(255, 255, 255, 0.6)' : '#94a3b8' }}
                               dangerouslySetInnerHTML={{ __html: parseContent(section.config?.contact || 'Contato Indefinido') }} />
                      </div>
                      <div className="px-7 py-5 rounded-[2rem] border text-right shadow-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.3)' }} >
                         <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 leading-none" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Consultor Responsável</p>
                         <div className="text-base font-black tracking-tight" style={{ color: '#ffffff' }}>{dados.vendedor?.nome}</div>
                         <div className="text-[10px] font-bold mt-1 uppercase" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{dados.vendedor?.email}</div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          ))}

          {/* Paper Global Footer */}
          {!sections.some(s => s.type === 'footer') && (
            <div className="mt-auto pt-10 pb-16 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] px-8" style={{ borderColor: '#f1f5f9', color: '#cbd5e1' }}>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(118, 186, 27, 0.3)' }}></span>
                PredictSales Engine v3.0
              </p>
              <p className="px-3 py-1 rounded-full" style={{ backgroundColor: '#f8fafc', color: '#94a3b8' }}>Página {dados.sistema?.pagina} / {dados.sistema?.total_paginas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
