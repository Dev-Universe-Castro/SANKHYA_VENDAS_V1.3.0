
import { useState, useEffect } from 'react';
import type { Lead } from '@/lib/leads-service';

interface LeadContext {
  // Informações do Funil
  nomeFunil: string;
  corFunil: string;
  estagiosDoFunil: Array<{
    nome: string;
    ordem: number;
    cor: string;
  }>;
  estagioAtual: {
    nome: string;
    ordem: number;
    cor: string;
  } | null;

  // Dados do Lead
  titulo: string;
  valorTotal: number;
  descricao: string;
  dataVencimento: string;
  statusLead: string;
  motivoPerda?: string;
  dataCriacao: string;
  dataAtualizacao: string;

  // Parceiro
  parceiro: {
    codigo: string;
    nome: string;
    documento: string;
  } | null;

  // Produtos vinculados
  produtos: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;

  // Atividades
  atividades: Array<{
    tipo: string;
    descricao: string;
    dataHora: string;
    status: string;
    cor: string;
  }>;

  // Última interação
  ultimaInteracao: {
    data: string;
    tipo: string;
    descricao: string;
  } | null;
}

export function useLeadContext(lead: Lead | null, funil: any, estagios: any[], parceiros: any[]) {
  const [context, setContext] = useState<LeadContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!lead) {
      setContext(null);
      return;
    }

    async function loadContext() {
      setIsLoading(true);
      
      try {
        // Buscar atividades
        const atividadesRes = await fetch(`/api/leads/atividades?codLead=${lead.CODLEAD}`);
        const atividades = atividadesRes.ok ? await atividadesRes.json() : [];

        // Buscar produtos
        const produtosRes = await fetch(`/api/leads/produtos?codLead=${lead.CODLEAD}`);
        const produtos = produtosRes.ok ? await produtosRes.json() : [];

        // Encontrar parceiro
        const parceiro = parceiros.find(p => p.CODPARC === lead.CODPARC);

        // Encontrar estágio atual
        const estagioAtual = estagios.find(e => e.CODESTAGIO === lead.CODESTAGIO);

        // Encontrar última interação
        const atividadesOrdenadas = [...atividades].sort((a, b) => 
          new Date(b.DATA_HORA).getTime() - new Date(a.DATA_HORA).getTime()
        );
        const ultimaAtividade = atividadesOrdenadas[0];

        const leadContext: LeadContext = {
          // Funil
          nomeFunil: funil?.NOME || 'N/A',
          corFunil: funil?.COR || '#3b82f6',
          estagiosDoFunil: estagios.map(e => ({
            nome: e.NOME,
            ordem: e.ORDEM,
            cor: e.COR
          })),
          estagioAtual: estagioAtual ? {
            nome: estagioAtual.NOME,
            ordem: estagioAtual.ORDEM,
            cor: estagioAtual.COR
          } : null,

          // Lead
          titulo: lead.NOME,
          valorTotal: lead.VALOR || 0,
          descricao: lead.DESCRICAO || '',
          dataVencimento: lead.DATA_VENCIMENTO || '',
          statusLead: lead.STATUS_LEAD || 'EM_ANDAMENTO',
          motivoPerda: lead.MOTIVO_PERDA,
          dataCriacao: lead.DATA_CRIACAO || '',
          dataAtualizacao: lead.DATA_ATUALIZACAO || '',

          // Parceiro
          parceiro: parceiro ? {
            codigo: parceiro.CODPARC,
            nome: parceiro.NOMEPARC,
            documento: parceiro.CGC_CPF
          } : null,

          // Produtos
          produtos: produtos.filter((p: any) => p.ATIVO === 'S').map((p: any) => ({
            codigo: p.CODPROD,
            descricao: p.DESCRPROD,
            quantidade: p.QUANTIDADE,
            valorUnitario: p.VLRUNIT,
            valorTotal: p.VLRTOTAL
          })),

          // Atividades
          atividades: atividades.map((a: any) => ({
            tipo: a.TIPO,
            descricao: a.DESCRICAO,
            dataHora: a.DATA_HORA,
            status: a.STATUS,
            cor: a.COR
          })),

          // Última interação
          ultimaInteracao: ultimaAtividade ? {
            data: ultimaAtividade.DATA_HORA,
            tipo: ultimaAtividade.TIPO,
            descricao: ultimaAtividade.DESCRICAO
          } : null
        };

        setContext(leadContext);
      } catch (error) {
        console.error('Erro ao carregar contexto do lead:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContext();
  }, [lead, funil, estagios, parceiros]);

  return { context, isLoading };
}

export function formatLeadContextForAI(context: LeadContext | null): string {
  if (!context) return 'Nenhum lead selecionado.';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  let prompt = `# CONTEXTO DETALHADO DO LEAD SELECIONADO

## 📊 INFORMAÇÕES DO FUNIL
- **Nome do Funil**: ${context.nomeFunil}
- **Cor do Funil**: ${context.corFunil}
- **Estágios do Funil (em ordem)**:
${context.estagiosDoFunil.map(e => `  ${e.ordem}. ${e.nome} (cor: ${e.cor})`).join('\n')}
- **Estágio Atual do Lead**: ${context.estagioAtual?.nome || 'N/A'} (posição ${context.estagioAtual?.ordem || 'N/A'} no funil)

## 💼 DADOS DO LEAD
- **Título**: ${context.titulo}
- **Valor Total**: ${formatCurrency(context.valorTotal)}
- **Descrição**: ${context.descricao || 'Sem descrição'}
- **Data de Vencimento**: ${formatDate(context.dataVencimento)}
- **Status**: ${context.statusLead}
${context.motivoPerda ? `- **Motivo da Perda**: ${context.motivoPerda}` : ''}
- **Data de Criação**: ${formatDate(context.dataCriacao)}
- **Última Atualização**: ${formatDate(context.dataAtualizacao)}

## 👤 PARCEIRO/CLIENTE RELACIONADO
${context.parceiro ? `
- **Nome**: ${context.parceiro.nome}
- **Código**: ${context.parceiro.codigo}
- **CPF/CNPJ**: ${context.parceiro.documento}
` : '- ⚠️ Nenhum parceiro vinculado a este lead'}

## 📦 PRODUTOS VINCULADOS AO LEAD (${context.produtos.length} produto(s))
${context.produtos.length > 0 ? context.produtos.map(p => 
  `- **${p.descricao}**
  - Código: ${p.codigo}
  - Quantidade: ${p.quantidade}
  - Valor Unitário: ${formatCurrency(p.valorUnitario)}
  - Valor Total: ${formatCurrency(p.valorTotal)}`
).join('\n') : '- ⚠️ Nenhum produto vinculado a este lead'}

## 📅 ATIVIDADES RELACIONADAS AO LEAD (${context.atividades.length} atividade(s))
${context.atividades.length > 0 ? context.atividades.slice(0, 10).map(a => 
  `- **[${a.tipo}]** ${formatDate(a.dataHora)}
  - Descrição: ${a.descricao.substring(0, 100)}${a.descricao.length > 100 ? '...' : ''}
  - Status: ${a.status}`
).join('\n') : '- ⚠️ Nenhuma atividade registrada para este lead'}

## 🔔 ÚLTIMA INTERAÇÃO COM O LEAD
${context.ultimaInteracao ? `
- **Data**: ${formatDate(context.ultimaInteracao.data)}
- **Tipo**: ${context.ultimaInteracao.tipo}
- **Descrição**: ${context.ultimaInteracao.descricao}
` : '- ⚠️ Nenhuma interação registrada ainda'}

---
**INSTRUÇÕES IMPORTANTES**: 
Quando responder sobre ESTE lead específico, você DEVE usar TODAS as informações acima. 
Sempre mencione:
1. Nome completo do funil e estágio atual
2. Título e valor do lead
3. Produtos vinculados (se houver)
4. Parceiro relacionado (se houver)
5. Última interação (data e tipo)
6. Data de criação
7. Principais atividades

Não invente informações que não estão aqui!`;

  return prompt;
}
