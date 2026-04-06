
import { OfflineDataService } from './offline-data-service';

export interface NotaEnriquecida {
  // Dados do cabeçalho
  NUNOTA: number;
  DTNEG: string;
  CODPARC: number;
  CODVEND: number;
  VLRNOTA: number;
  CODTIPOPER: number;
  CODTIPVENDA: number;
  
  // Dados enriquecidos do parceiro
  parceiro?: {
    CODPARC: number;
    NOMEPARC: string;
    RAZAOSOCIAL: string;
    CGC_CPF: string;
    CODCID: number;
    ATIVO: string;
  };
  
  // Itens da nota enriquecidos
  itens?: ItemNotaEnriquecido[];
  
  // Totalizadores
  totalItens?: number;
  valorTotalItens?: number;
}

export interface ItemNotaEnriquecido {
  // Dados do item
  NUNOTA: number;
  SEQUENCIA: number;
  CODPROD: number;
  CODVOL: string;
  QTDNEG: number;
  VLRUNIT: number;
  VLRTOT: number;
  
  // Dados enriquecidos do produto
  produto?: {
    CODPROD: number;
    DESCRPROD: string;
    ATIVO: string;
  };
  
  // Informações de estoque (se disponível)
  estoque?: number;
}

/**
 * Serviço para enriquecer dados de notas com informações de parceiros e produtos
 */
export class NotasEnrichmentService {
  
  /**
   * Enriquece uma lista de notas com dados de parceiros e produtos
   */
  static async enriquecerNotas(
    cabecalhos: any[],
    itens: any[]
  ): Promise<NotaEnriquecida[]> {
    try {
      console.log(`🔄 Enriquecendo ${cabecalhos.length} notas com dados do IndexedDB...`);
      
      // Buscar todos os parceiros e produtos do IndexedDB
      const [parceiros, produtos] = await Promise.all([
        OfflineDataService.getParceiros(),
        OfflineDataService.getProdutos({ ativo: 'S' })
      ]);
      
      // Criar mapas para busca rápida
      const parceirosMap = new Map(parceiros.map(p => [p.CODPARC, p]));
      const produtosMap = new Map(produtos.map(p => [p.CODPROD, p]));
      
      // Agrupar itens por NUNOTA
      const itensPorNota = new Map<number, any[]>();
      itens.forEach(item => {
        const nunota = item.NUNOTA;
        if (!itensPorNota.has(nunota)) {
          itensPorNota.set(nunota, []);
        }
        itensPorNota.get(nunota)!.push(item);
      });
      
      // Enriquecer cada nota
      const notasEnriquecidas: NotaEnriquecida[] = cabecalhos.map(cabecalho => {
        const nota: NotaEnriquecida = {
          ...cabecalho,
          NUNOTA: cabecalho.NUNOTA,
          DTNEG: cabecalho.DTNEG,
          CODPARC: cabecalho.CODPARC,
          CODVEND: cabecalho.CODVEND,
          VLRNOTA: parseFloat(cabecalho.VLRNOTA || 0),
          CODTIPOPER: cabecalho.CODTIPOPER,
          CODTIPVENDA: cabecalho.CODTIPVENDA,
        };
        
        // Enriquecer com dados do parceiro
        const parceiro = parceirosMap.get(cabecalho.CODPARC);
        if (parceiro) {
          nota.parceiro = {
            CODPARC: parceiro.CODPARC,
            NOMEPARC: parceiro.NOMEPARC,
            RAZAOSOCIAL: parceiro.RAZAOSOCIAL,
            CGC_CPF: parceiro.CGC_CPF,
            CODCID: parceiro.CODCID,
            ATIVO: parceiro.ATIVO
          };
        }
        
        // Enriquecer com itens
        const itensNota = itensPorNota.get(cabecalho.NUNOTA) || [];
        nota.itens = itensNota.map(item => {
          const itemEnriquecido: ItemNotaEnriquecido = {
            NUNOTA: item.NUNOTA,
            SEQUENCIA: item.SEQUENCIA,
            CODPROD: item.CODPROD,
            CODVOL: item.CODVOL,
            QTDNEG: parseFloat(item.QTDNEG || 0),
            VLRUNIT: parseFloat(item.VLRUNIT || 0),
            VLRTOT: parseFloat(item.VLRTOT || 0)
          };
          
          // Enriquecer com dados do produto
          const produto = produtosMap.get(item.CODPROD);
          if (produto) {
            itemEnriquecido.produto = {
              CODPROD: produto.CODPROD,
              DESCRPROD: produto.DESCRPROD,
              ATIVO: produto.ATIVO
            };
          }
          
          return itemEnriquecido;
        });
        
        // Calcular totalizadores
        nota.totalItens = nota.itens.length;
        nota.valorTotalItens = nota.itens.reduce((sum, item) => sum + item.VLRTOT, 0);
        
        return nota;
      });
      
      console.log(`✅ ${notasEnriquecidas.length} notas enriquecidas com sucesso!`);
      console.log(`📊 Parceiros encontrados: ${notasEnriquecidas.filter(n => n.parceiro).length}/${notasEnriquecidas.length}`);
      console.log(`📦 Total de itens: ${notasEnriquecidas.reduce((sum, n) => sum + (n.totalItens || 0), 0)}`);
      
      return notasEnriquecidas;
      
    } catch (error) {
      console.error('❌ Erro ao enriquecer notas:', error);
      throw error;
    }
  }
  
  /**
   * Busca uma nota específica enriquecida
   */
  static async buscarNotaEnriquecida(
    nunota: number,
    cabecalhos: any[],
    itens: any[]
  ): Promise<NotaEnriquecida | null> {
    const cabecalho = cabecalhos.find(c => c.NUNOTA === nunota);
    if (!cabecalho) return null;
    
    const itensNota = itens.filter(i => i.NUNOTA === nunota);
    const notasEnriquecidas = await this.enriquecerNotas([cabecalho], itensNota);
    
    return notasEnriquecidas[0] || null;
  }
  
  /**
   * Busca notas de um parceiro específico
   */
  static async buscarNotasPorParceiro(
    codParc: number,
    cabecalhos: any[],
    itens: any[]
  ): Promise<NotaEnriquecida[]> {
    const cabecalhosParceiro = cabecalhos.filter(c => c.CODPARC === codParc);
    const nunotas = cabecalhosParceiro.map(c => c.NUNOTA);
    const itensParceiro = itens.filter(i => nunotas.includes(i.NUNOTA));
    
    return await this.enriquecerNotas(cabecalhosParceiro, itensParceiro);
  }
  
  /**
   * Busca notas que contém um produto específico
   */
  static async buscarNotasPorProduto(
    codProd: number,
    cabecalhos: any[],
    itens: any[]
  ): Promise<NotaEnriquecida[]> {
    const itensComProduto = itens.filter(i => i.CODPROD === codProd);
    const nunotas = [...new Set(itensComProduto.map(i => i.NUNOTA))];
    const cabecalhosFiltrados = cabecalhos.filter(c => nunotas.includes(c.NUNOTA));
    const itensFiltrados = itens.filter(i => nunotas.includes(i.NUNOTA));
    
    return await this.enriquecerNotas(cabecalhosFiltrados, itensFiltrados);
  }
  
  /**
   * Estatísticas de vendas por parceiro
   */
  static async estatisticasPorParceiro(
    cabecalhos: any[],
    itens: any[]
  ): Promise<Map<number, {
    CODPARC: number;
    NOMEPARC: string;
    totalNotas: number;
    valorTotal: number;
    totalItens: number;
  }>> {
    const notasEnriquecidas = await this.enriquecerNotas(cabecalhos, itens);
    const stats = new Map();
    
    notasEnriquecidas.forEach(nota => {
      if (!nota.parceiro) return;
      
      const codParc = nota.CODPARC;
      if (!stats.has(codParc)) {
        stats.set(codParc, {
          CODPARC: codParc,
          NOMEPARC: nota.parceiro.NOMEPARC,
          totalNotas: 0,
          valorTotal: 0,
          totalItens: 0
        });
      }
      
      const stat = stats.get(codParc);
      stat.totalNotas++;
      stat.valorTotal += nota.VLRNOTA;
      stat.totalItens += nota.totalItens || 0;
    });
    
    return stats;
  }
  
  /**
   * Estatísticas de vendas por produto
   */
  static async estatisticasPorProduto(
    cabecalhos: any[],
    itens: any[]
  ): Promise<Map<number, {
    CODPROD: number;
    DESCRPROD: string;
    quantidadeVendida: number;
    valorTotal: number;
    numeroNotas: number;
  }>> {
    const notasEnriquecidas = await this.enriquecerNotas(cabecalhos, itens);
    const stats = new Map();
    
    notasEnriquecidas.forEach(nota => {
      nota.itens?.forEach(item => {
        if (!item.produto) return;
        
        const codProd = item.CODPROD;
        if (!stats.has(codProd)) {
          stats.set(codProd, {
            CODPROD: codProd,
            DESCRPROD: item.produto.DESCRPROD,
            quantidadeVendida: 0,
            valorTotal: 0,
            numeroNotas: 0
          });
        }
        
        const stat = stats.get(codProd);
        stat.quantidadeVendida += item.QTDNEG;
        stat.valorTotal += item.VLRTOT;
        stat.numeroNotas++;
      });
    });
    
    return stats;
  }
}
