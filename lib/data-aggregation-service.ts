
/**
 * Serviço de Agregação de Dados para IA
 * Processa dados brutos e cria granularidade para reduzir volume enviado à IA
 */

export interface DadosAgregados {
  // Agregações por Parceiro
  porParceiro: {
    CODPARC: number;
    NOMEPARC: string;
    totalVendas: number;
    quantidadeNotas: number;
    quantidadeItens: number;
    ticketMedio: number;
    ultimaCompra: string;
    diasSemComprar: number;
    produtosMaisComprados: { CODPROD: number; DESCRPROD: string; quantidade: number }[];
    frequenciaCompra: number; // dias entre compras
    recencia: 'Ativo' | 'Morno' | 'Frio' | 'Inativo';
    valorMedioItem: number;
  }[];

  // Agregações por Produto
  porProduto: {
    CODPROD: number;
    DESCRPROD: string;
    quantidadeVendida: number;
    valorTotal: number;
    quantidadeNotas: number;
    precoMedio: number;
    precoMinimo: number;
    precoMaximo: number;
    ultimaVenda: string;
    clientesUnicos: number;
    vendedoresQueVendem: number;
    diasSemVender: number;
    velocidadeVenda: number; // unidades/dia
    margemMedia: number; // % baseada em variação de preço
  }[];

  // Agregações por Vendedor
  porVendedor: {
    CODVEND: number;
    NOMEVENDEDOR: string;
    totalVendas: number;
    quantidadeNotas: number;
    quantidadeItens: number;
    ticketMedio: number;
    clientesUnicos: number;
    produtosUnicos: number;
    diasAtivos: number;
    vendasPorDia: number;
    clientesFieis: number; // clientes com 2+ compras
    taxaRecompra: number; // %
    mixProdutos: number; // média de produtos por nota
  }[];

  // Análise Temporal (por dia/semana/mês)
  temporal: {
    porDia: {
      data: string;
      totalVendas: number;
      quantidadeNotas: number;
      quantidadeItens: number;
      ticketMedio: number;
      clientesUnicos: number;
      produtosUnicos: number;
      vendedoresAtivos: number;
      // Detalhes por entidade
      detalhesParceiros: { CODPARC: number; NOMEPARC: string; total: number; qtd: number; media: number }[];
      detalhesProdutos: { CODPROD: number; DESCRPROD: string; total: number; qtd: number; media: number }[];
      detalhesVendedores: { CODVEND: number; NOMEVENDEDOR: string; total: number; qtd: number; media: number }[];
    }[];
    porSemana: {
      semana: string;
      totalVendas: number;
      quantidadeNotas: number;
      quantidadeItens: number;
      ticketMedio: number;
      clientesUnicos: number;
      crescimentoSemanaAnterior: number; // %
    }[];
    porMes: {
      mes: string;
      totalVendas: number;
      quantidadeNotas: number;
      quantidadeItens: number;
      ticketMedio: number;
      clientesUnicos: number;
      clientesNovos: number;
      crescimentoMesAnterior: number; // %
    }[];
  };

  // Top Rankings
  rankings: {
    top10Clientes: { CODPARC: number; NOMEPARC: string; totalVendas: number; frequencia: number }[];
    top10Produtos: { CODPROD: number; DESCRPROD: string; quantidadeVendida: number; valorTotal: number }[];
    top10Vendedores: { CODVEND: number; NOMEVENDEDOR: string; totalVendas: number; eficiencia: number }[];
    top10ClientesPorTicket: { CODPARC: number; NOMEPARC: string; ticketMedio: number; totalCompras: number }[];
    top10ProdutosPorValor: { CODPROD: number; DESCRPROD: string; valorTotal: number; margemMedia: number }[];
  };

  // Combinações (Cross-Sell)
  combinacoes: {
    CODPROD1: number;
    PRODUTO1: string;
    CODPROD2: number;
    PRODUTO2: string;
    frequencia: number;
    valorMedio: number;
    clientesUnicos: number;
  }[];

  // Análise de Segmentação RFM (Recência, Frequência, Valor Monetário)
  segmentacaoRFM: {
    campeoes: number; // alto valor, alta frequência, compra recente
    fieis: number; // alta frequência, compra recente
    potenciais: number; // valor alto, frequência baixa
    emRisco: number; // não compra há tempo, mas tinha valor
    perdidos: number; // não compra há muito tempo
  };

  // Agregações Cruzadas - Cliente x Produto
  clienteProduto: {
    CODPARC: number;
    NOMEPARC: string;
    produtos: {
      CODPROD: number;
      DESCRPROD: string;
      quantidadeComprada: number;
      valorTotal: number;
      ultimaCompra: string;
      frequenciaCompra: number; // quantas vezes comprou esse produto
    }[];
  }[];

  // Agregações Cruzadas - Vendedor x Produto
  vendedorProduto: {
    CODVEND: number;
    NOMEVENDEDOR: string;
    produtos: {
      CODPROD: number;
      DESCRPROD: string;
      quantidadeVendida: number;
      valorTotal: number;
      clientesUnicos: number; // quantos clientes diferentes compraram esse produto deste vendedor
      ultimaVenda: string;
    }[];
  }[];

  // Agregações Cruzadas - Produto x Cliente
  produtoCliente: {
    CODPROD: number;
    DESCRPROD: string;
    clientes: {
      CODPARC: number;
      NOMEPARC: string;
      quantidadeComprada: number;
      valorTotal: number;
      ultimaCompra: string;
      ticketMedio: number;
    }[];
  }[];

  // Análise de Concentração
  concentracao: {
    pareto80_20: {
      top20ClientesRepresentam: number; // % do faturamento
      top20ProdutosRepresentam: number; // % do faturamento
    };
    dependencia: {
      clienteMaisImportante: { CODPARC: number; NOMEPARC: string; participacao: number };
      produtoMaisImportante: { CODPROD: number; DESCRPROD: string; participacao: number };
    };
  };

  // Sazonalidade e Padrões
  padroes: {
    diaSemanaComMaisVendas: string;
    horaPicoVendas: string; // se houver timestamp
    tendencia: 'Crescimento' | 'Estável' | 'Queda';
    sazonalidade: 'Alta' | 'Média' | 'Baixa';
  };

  // Métricas Gerais
  metricas: {
    totalVendas: number;
    totalNotas: number;
    totalItens: number;
    ticketMedio: number;
    produtosUnicos: number;
    clientesUnicos: number;
    vendedoresAtivos: number;
    itensPorNota: number; // média
    valorMedioPorItem: number;
    taxaCrescimento: number; // % comparado com período anterior
    churnRate: number; // % clientes que não voltaram
    ltv: number; // Lifetime Value médio do cliente
  };

  // Análise de Performance
  performance: {
    notasPorVendedor: number; // média
    vendasPorCliente: number; // média
    eficienciaVendedor: { // vendedor que mais converte em valor
      CODVEND: number;
      NOMEVENDEDOR: string;
      conversao: number;
    };
  };
}

export class DataAggregationService {
  
  /**
   * Agrega dados de notas e itens para análise pela IA
   */
  static async agregarDados(
    cabecalhos: any[],
    itens: any[],
    produtos: any[] = [],
    parceiros: any[] = [],
    vendedores: any[] = [],
    onProgress?: (progress: number, message: string) => void
  ): Promise<DadosAgregados> {
    

    const reportProgress = (progress: number, message: string) => {
      if (onProgress) onProgress(progress, message);
    };

    // Criar mapas para lookup rápido com log de debug
    // IMPORTANTE: Converter CODPROD, CODPARC e CODVEND para Number para garantir match correto
    const produtosMap = new Map(produtos.map(p => [Number(p.CODPROD), p]));
    const parceirosMap = new Map(parceiros.map(p => [Number(p.CODPARC), p]));
    const vendedoresMap = new Map(vendedores.map(v => [Number(v.CODVEND), v]));

    // Log para debug de mapeamento
    console.log(`[Agregação] Mapas criados: ${produtosMap.size} produtos, ${parceirosMap.size} parceiros, ${vendedoresMap.size} vendedores`);
    if (produtos.length > 0) {
      const sampleProd = produtos[0];
      console.log(`[Agregação] Amostra produto: CODPROD=${sampleProd.CODPROD}, DESCRPROD=${sampleProd.DESCRPROD}`);
    }
    if (vendedores.length > 0) {
      const sampleVend = vendedores[0];
      console.log(`[Agregação] Amostra vendedor: CODVEND=${sampleVend.CODVEND}, APELIDO=${sampleVend.APELIDO}`);
    }
    if (parceiros.length > 0) {
      const sampleParc = parceiros[0];
      console.log(`[Agregação] Amostra parceiro: CODPARC=${sampleParc.CODPARC}, NOMEPARC=${sampleParc.NOMEPARC}`);
    }

    // Helper para garantir que sempre peguemos o nome correto
    const getNomeParceiro = (codParc: number): string => {
      const parceiro = parceirosMap.get(codParc);
      if (!parceiro) return 'Cliente não identificado';
      const nome = parceiro.NOMEPARC || parceiro.RAZAOSOCIAL || parceiro.NOME;
      return nome && nome.trim() !== '' ? nome : 'Cliente não identificado';
    };

    const getNomeProduto = (codProd: number): string => {
      const produto = produtosMap.get(codProd);
      if (!produto) return 'Produto não identificado';
      const nome = produto.DESCRPROD || produto.NOMEPROD || produto.NOME;
      return nome && nome.trim() !== '' ? nome : 'Produto não identificado';
    };

    const getNomeVendedor = (codVend: number): string => {
      const vendedor = vendedoresMap.get(codVend);
      if (!vendedor) {
        console.warn(`[Agregação] Vendedor ${codVend} não encontrado no mapa (${vendedoresMap.size} vendedores carregados)`);
        return 'Vendedor não identificado';
      }
      // Tentar múltiplos campos de nome possíveis
      const nome = vendedor.APELIDO || vendedor.NOMEVENDEDOR || vendedor.NOME || vendedor.NOMEVEND;
      if (!nome || nome.trim() === '') {
        console.warn(`[Agregação] Vendedor ${codVend} sem nome definido`);
        return 'Vendedor não identificado';
      }
      return nome;
    };

    // Mapa de itens por nota para facilitar joins
    const itensPorNotaMap = new Map<string, any[]>();
    itens.forEach(item => {
      const nunota = item.NUNOTA.toString();
      if (!itensPorNotaMap.has(nunota)) {
        itensPorNotaMap.set(nunota, []);
      }
      itensPorNotaMap.get(nunota)!.push(item);
    });

    // ====================================
    // 1. AGREGAÇÃO AVANÇADA POR PARCEIRO
    // ====================================
    reportProgress(10, 'Agregando dados por parceiro...');
    const porParceiroMap = new Map<number, any>();
    const comprasPorParceiro = new Map<number, string[]>(); // para calcular frequência
    
    cabecalhos.forEach(cab => {
      const codParc = Number(cab.CODPARC);
      
      if (!porParceiroMap.has(codParc)) {
        // SEMPRE usar o helper para garantir nome correto
        const nomeParceiro = getNomeParceiro(codParc);
        porParceiroMap.set(codParc, {
          CODPARC: codParc,
          NOMEPARC: nomeParceiro,
          totalVendas: 0,
          quantidadeNotas: 0,
          quantidadeItens: 0,
          ultimaCompra: cab.DTNEG,
          primeiraCompra: cab.DTNEG,
          produtosComprados: new Map<number, { DESCRPROD: string; quantidade: number }>(),
          valoresItens: []
        });
        comprasPorParceiro.set(codParc, []);
      }
      
      const aggParc = porParceiroMap.get(codParc)!;
      aggParc.totalVendas += parseFloat(cab.VLRNOTA || 0);
      aggParc.quantidadeNotas += 1;
      comprasPorParceiro.get(codParc)!.push(cab.DTNEG);
      
      // Atualizar primeira e última compra
      if (cab.DTNEG < aggParc.primeiraCompra) {
        aggParc.primeiraCompra = cab.DTNEG;
      }
      if (cab.DTNEG > aggParc.ultimaCompra) {
        aggParc.ultimaCompra = cab.DTNEG;
      }

      // Processar itens desta nota para o parceiro
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      itensNota.forEach(item => {
        aggParc.quantidadeItens += parseFloat(item.QTDNEG || 0);
        aggParc.valoresItens.push(parseFloat(item.VLRUNIT || 0));
        
        // Rastrear produtos comprados (sempre com nome usando helper)
        const codProd = Number(item.CODPROD);
        const nomeProduto = getNomeProduto(codProd);
        if (!aggParc.produtosComprados.has(codProd)) {
          aggParc.produtosComprados.set(codProd, {
            DESCRPROD: nomeProduto,
            quantidade: 0
          });
        }
        aggParc.produtosComprados.get(codProd)!.quantidade += parseFloat(item.QTDNEG || 0);
      });
    });

    // Processar métricas avançadas por parceiro
    const hoje = new Date();
    const porParceiro = Array.from(porParceiroMap.values()).map(p => {
      const ticketMedio = p.quantidadeNotas > 0 ? p.totalVendas / p.quantidadeNotas : 0;
      const diasSemComprar = Math.floor((hoje.getTime() - new Date(p.ultimaCompra).getTime()) / (1000 * 60 * 60 * 24));
      
      // Calcular frequência de compra
      const compras = comprasPorParceiro.get(p.CODPARC) || [];
      const datas = compras.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
      let frequenciaCompra = 0;
      if (datas.length > 1) {
        const diferencas = [];
        for (let i = 1; i < datas.length; i++) {
          diferencas.push((datas[i].getTime() - datas[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        }
        frequenciaCompra = diferencas.reduce((a, b) => a + b, 0) / diferencas.length;
      }

      // Classificar recência
      let recencia: 'Ativo' | 'Morno' | 'Frio' | 'Inativo' = 'Inativo';
      if (diasSemComprar <= 30) recencia = 'Ativo';
      else if (diasSemComprar <= 60) recencia = 'Morno';
      else if (diasSemComprar <= 90) recencia = 'Frio';

      // Top 3 produtos mais comprados
      const produtosMaisComprados = Array.from(p.produtosComprados.entries())
        .map(([CODPROD, data]) => ({ CODPROD, DESCRPROD: data.DESCRPROD, quantidade: data.quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);

      // Valor médio por item
      const valorMedioItem = p.valoresItens.length > 0 
        ? p.valoresItens.reduce((a: number, b: number) => a + b, 0) / p.valoresItens.length 
        : 0;

      return {
        CODPARC: p.CODPARC,
        NOMEPARC: p.NOMEPARC,
        totalVendas: p.totalVendas,
        quantidadeNotas: p.quantidadeNotas,
        quantidadeItens: p.quantidadeItens,
        ticketMedio,
        ultimaCompra: p.ultimaCompra,
        diasSemComprar,
        produtosMaisComprados,
        frequenciaCompra: Math.round(frequenciaCompra),
        recencia,
        valorMedioItem
      };
    });

    // ====================================
    // 2. AGREGAÇÃO AVANÇADA POR PRODUTO
    // ====================================
    reportProgress(25, 'Agregando dados por produto...');
    const porProdutoMap = new Map<number, any>();
    
    itens.forEach(item => {
      const codProd = Number(item.CODPROD);
      
      if (!porProdutoMap.has(codProd)) {
        // SEMPRE usar o helper para garantir nome correto
        const nomeProduto = getNomeProduto(codProd);
        porProdutoMap.set(codProd, {
          CODPROD: codProd,
          DESCRPROD: nomeProduto,
          quantidadeVendida: 0,
          valorTotal: 0,
          precos: [],
          ultimaVenda: '',
          clientes: new Set<number>(),
          vendedores: new Set<number>(),
          notasUnicas: new Set<string>()
        });
      }
      
      const aggProd = porProdutoMap.get(codProd)!;
      const qtd = parseFloat(item.QTDNEG || 0);
      const vlrTotal = parseFloat(item.VLRTOT || 0);
      const vlrUnit = parseFloat(item.VLRUNIT || 0);
      
      aggProd.quantidadeVendida += qtd;
      aggProd.valorTotal += vlrTotal;
      aggProd.precos.push(vlrUnit);
      aggProd.notasUnicas.add(item.NUNOTA.toString());
      
      // Buscar informações da nota
      const cab = cabecalhos.find(c => c.NUNOTA === item.NUNOTA);
      if (cab) {
        if (!aggProd.ultimaVenda || cab.DTNEG > aggProd.ultimaVenda) {
          aggProd.ultimaVenda = cab.DTNEG;
        }
        aggProd.clientes.add(cab.CODPARC);
        aggProd.vendedores.add(cab.CODVEND);
      }
    });

    const porProduto = Array.from(porProdutoMap.values()).map(p => {
      const precos = p.precos.filter((preco: number) => preco > 0);
      const precoMedio = precos.length > 0 ? precos.reduce((a: number, b: number) => a + b, 0) / precos.length : 0;
      const precoMinimo = precos.length > 0 ? Math.min(...precos) : 0;
      const precoMaximo = precos.length > 0 ? Math.max(...precos) : 0;
      const diasSemVender = p.ultimaVenda ? Math.floor((hoje.getTime() - new Date(p.ultimaVenda).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      // Velocidade de venda (unidades por dia)
      const primeiraVenda = cabecalhos.find(c => {
        const itensNota = itensPorNotaMap.get(c.NUNOTA.toString()) || [];
        return itensNota.some(i => i.CODPROD === p.CODPROD);
      });
      let velocidadeVenda = 0;
      if (primeiraVenda && p.ultimaVenda) {
        const diasPeriodo = Math.max(1, (new Date(p.ultimaVenda).getTime() - new Date(primeiraVenda.DTNEG).getTime()) / (1000 * 60 * 60 * 24));
        velocidadeVenda = p.quantidadeVendida / diasPeriodo;
      }

      // Margem média (variação percentual entre min e max)
      const margemMedia = precoMaximo > 0 ? ((precoMaximo - precoMinimo) / precoMaximo) * 100 : 0;

      return {
        CODPROD: p.CODPROD,
        DESCRPROD: p.DESCRPROD,
        quantidadeVendida: p.quantidadeVendida,
        valorTotal: p.valorTotal,
        quantidadeNotas: p.notasUnicas.size,
        precoMedio,
        precoMinimo,
        precoMaximo,
        ultimaVenda: p.ultimaVenda,
        clientesUnicos: p.clientes.size,
        vendedoresQueVendem: p.vendedores.size,
        diasSemVender,
        velocidadeVenda: parseFloat(velocidadeVenda.toFixed(2)),
        margemMedia: parseFloat(margemMedia.toFixed(2))
      };
    });

    // ====================================
    // 3. AGREGAÇÃO AVANÇADA POR VENDEDOR
    // ====================================
    reportProgress(40, 'Agregando dados por vendedor...');
    const porVendedorMap = new Map<number, any>();
    const clientesPorVendedor = new Map<number, Set<number>>();
    const produtosPorVendedor = new Map<number, Set<number>>();
    const diasAtivosPorVendedor = new Map<number, Set<string>>();
    const comprasRepetidasPorVendedor = new Map<number, Map<number, number>>();
    
    cabecalhos.forEach(cab => {
      const codVend = Number(cab.CODVEND);
      
      if (!porVendedorMap.has(codVend)) {
        // SEMPRE usar o helper para garantir nome correto
        const nomeVendedor = getNomeVendedor(codVend);
        porVendedorMap.set(codVend, {
          CODVEND: codVend,
          NOMEVENDEDOR: nomeVendedor,
          totalVendas: 0,
          quantidadeNotas: 0,
          quantidadeItens: 0,
          itensPorNota: []
        });
        clientesPorVendedor.set(codVend, new Set());
        produtosPorVendedor.set(codVend, new Set());
        diasAtivosPorVendedor.set(codVend, new Set());
        comprasRepetidasPorVendedor.set(codVend, new Map());
      }
      
      const aggVend = porVendedorMap.get(codVend)!;
      aggVend.totalVendas += parseFloat(cab.VLRNOTA || 0);
      aggVend.quantidadeNotas += 1;
      clientesPorVendedor.get(codVend)!.add(cab.CODPARC);
      diasAtivosPorVendedor.get(codVend)!.add(cab.DTNEG);
      
      // Rastrear compras repetidas por cliente
      const comprasCliente = comprasRepetidasPorVendedor.get(codVend)!;
      comprasCliente.set(cab.CODPARC, (comprasCliente.get(cab.CODPARC) || 0) + 1);

      // Processar itens
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      aggVend.itensPorNota.push(itensNota.length);
      itensNota.forEach(item => {
        aggVend.quantidadeItens += parseFloat(item.QTDNEG || 0);
        produtosPorVendedor.get(codVend)!.add(item.CODPROD);
      });
    });

    const porVendedor = Array.from(porVendedorMap.values()).map(v => {
      const ticketMedio = v.quantidadeNotas > 0 ? v.totalVendas / v.quantidadeNotas : 0;
      const clientesUnicos = clientesPorVendedor.get(v.CODVEND)?.size || 0;
      const produtosUnicos = produtosPorVendedor.get(v.CODVEND)?.size || 0;
      const diasAtivos = diasAtivosPorVendedor.get(v.CODVEND)?.size || 0;
      const vendasPorDia = diasAtivos > 0 ? v.quantidadeNotas / diasAtivos : 0;
      
      // Clientes fiéis (2+ compras)
      const comprasClientes = comprasRepetidasPorVendedor.get(v.CODVEND)!;
      const clientesFieis = Array.from(comprasClientes.values()).filter(count => count >= 2).length;
      const taxaRecompra = clientesUnicos > 0 ? (clientesFieis / clientesUnicos) * 100 : 0;
      
      // Mix de produtos (média de itens diferentes por nota)
      const mixProdutos = v.itensPorNota.length > 0 
        ? v.itensPorNota.reduce((a: number, b: number) => a + b, 0) / v.itensPorNota.length 
        : 0;

      return {
        CODVEND: v.CODVEND,
        NOMEVENDEDOR: v.NOMEVENDEDOR,
        totalVendas: v.totalVendas,
        quantidadeNotas: v.quantidadeNotas,
        quantidadeItens: v.quantidadeItens,
        ticketMedio,
        clientesUnicos,
        produtosUnicos,
        diasAtivos,
        vendasPorDia: parseFloat(vendasPorDia.toFixed(2)),
        clientesFieis,
        taxaRecompra: parseFloat(taxaRecompra.toFixed(2)),
        mixProdutos: parseFloat(mixProdutos.toFixed(2))
      };
    });

    // ====================================
    // 4. ANÁLISE TEMPORAL AVANÇADA
    // ====================================
    reportProgress(55, 'Criando análise temporal...');
    const porDiaMap = new Map<string, any>();
    const porSemanaMap = new Map<string, any>();
    const porMesMap = new Map<string, any>();

    // Mapas para detalhes por data
    const parceirosDataMap = new Map<string, Map<number, { total: number, qtd: number }>>();
    const produtosDataMap = new Map<string, Map<number, { total: number, qtd: number }>>();
    const vendedoresDataMap = new Map<string, Map<number, { total: number, qtd: number }>>();

    cabecalhos.forEach(cab => {
      const data = new Date(cab.DTNEG);
      const diaStr = cab.DTNEG;
      const semanaStr = `${data.getFullYear()}-W${this.getWeekNumber(data)}`;
      const mesStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      
      const vlrNota = parseFloat(cab.VLRNOTA || 0);
      const codParc = Number(cab.CODPARC);
      const codVend = Number(cab.CODVEND);

      // Inicializar mapas de data
      if (!parceirosDataMap.has(diaStr)) parceirosDataMap.set(diaStr, new Map());
      if (!produtosDataMap.has(diaStr)) produtosDataMap.set(diaStr, new Map());
      if (!vendedoresDataMap.has(diaStr)) vendedoresDataMap.set(diaStr, new Map());

      // Agregação Parceiro/Data
      const pMap = parceirosDataMap.get(diaStr)!;
      const pData = pMap.get(codParc) || { total: 0, qtd: 0 };
      pData.total += vlrNota;
      pData.qtd += 1;
      pMap.set(codParc, pData);

      // Agregação Vendedor/Data
      const vMap = vendedoresDataMap.get(diaStr)!;
      const vData = vMap.get(codVend) || { total: 0, qtd: 0 };
      vData.total += vlrNota;
      vData.qtd += 1;
      vMap.set(codVend, vData);

      // Por dia
      if (!porDiaMap.has(diaStr)) {
        porDiaMap.set(diaStr, {
          data: diaStr,
          totalVendas: 0,
          quantidadeNotas: 0,
          quantidadeItens: 0,
          clientes: new Set<number>(),
          produtos: new Set<number>(),
          vendedores: new Set<number>()
        });
      }
      const aggDia = porDiaMap.get(diaStr)!;
      aggDia.totalVendas += vlrNota;
      aggDia.quantidadeNotas += 1;
      aggDia.clientes.add(codParc);
      aggDia.vendedores.add(codVend);

      // Itens para Produto/Data
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      itensNota.forEach(item => {
        const codProd = Number(item.CODPROD);
        const vlrTotItem = parseFloat(item.VLRTOT || 0);
        const qtdItem = parseFloat(item.QTDNEG || 0);
        
        aggDia.produtos.add(codProd);
        aggDia.quantidadeItens += qtdItem;

        const prMap = produtosDataMap.get(diaStr)!;
        const prData = prMap.get(codProd) || { total: 0, qtd: 0 };
        prData.total += vlrTotItem;
        prData.qtd += qtdItem;
        prMap.set(codProd, prData);
      });

      // Por semana
      if (!porSemanaMap.has(semanaStr)) {
        porSemanaMap.set(semanaStr, {
          semana: semanaStr,
          totalVendas: 0,
          quantidadeNotas: 0,
          quantidadeItens: 0,
          clientes: new Set<number>()
        });
      }
      const aggSemana = porSemanaMap.get(semanaStr)!;
      aggSemana.totalVendas += vlrNota;
      aggSemana.quantidadeNotas += 1;
      aggSemana.clientes.add(codParc);

      // Por mês
      if (!porMesMap.has(mesStr)) {
        porMesMap.set(mesStr, {
          mes: mesStr,
          totalVendas: 0,
          quantidadeNotas: 0,
          quantidadeItens: 0,
          clientes: new Set<number>(),
          clientesHistorico: new Set<number>()
        });
      }
      const aggMes = porMesMap.get(mesStr)!;
      aggMes.totalVendas += vlrNota;
      aggMes.quantidadeNotas += 1;
      aggMes.clientes.add(codParc);

      // Processar itens para contagens
      itensNota.forEach(item => {
        const qtd = parseFloat(item.QTDNEG || 0);
        aggSemana.quantidadeItens += qtd;
        aggMes.quantidadeItens += qtd;
      });
    });

    // Processar dias com métricas completas
    const porDia = Array.from(porDiaMap.values()).map(d => {
      const pMap = parceirosDataMap.get(d.data)!;
      const prMap = produtosDataMap.get(d.data)!;
      const vMap = vendedoresDataMap.get(d.data)!;

      return {
        data: d.data,
        totalVendas: d.totalVendas,
        quantidadeNotas: d.quantidadeNotas,
        quantidadeItens: d.quantidadeItens,
        ticketMedio: d.quantidadeNotas > 0 ? d.totalVendas / d.quantidadeNotas : 0,
        clientesUnicos: d.clientes.size,
        produtosUnicos: d.produtos.size,
        vendedoresAtivos: d.vendedores.size,
        detalhesParceiros: Array.from(pMap.entries()).map(([cod, val]) => ({
          CODPARC: cod,
          NOMEPARC: getNomeParceiro(cod),
          total: val.total,
          qtd: val.qtd,
          media: val.qtd > 0 ? val.total / val.qtd : 0
        })),
        detalhesProdutos: Array.from(prMap.entries()).map(([cod, val]) => ({
          CODPROD: cod,
          DESCRPROD: getNomeProduto(cod),
          total: val.total,
          qtd: val.qtd,
          media: val.qtd > 0 ? val.total / val.qtd : 0
        })),
        detalhesVendedores: Array.from(vMap.entries()).map(([cod, val]) => ({
          CODVEND: cod,
          NOMEVENDEDOR: getNomeVendedor(cod),
          total: val.total,
          qtd: val.qtd,
          media: val.qtd > 0 ? val.total / val.qtd : 0
        }))
      };
    }).sort((a, b) => a.data.localeCompare(b.data));

    // Processar semanas com crescimento
    const semanasArray = Array.from(porSemanaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const porSemana = semanasArray.map((entry, index) => {
      const [semana, dados] = entry;
      let crescimentoSemanaAnterior = 0;
      if (index > 0) {
        const semanaAnterior = semanasArray[index - 1][1];
        if (semanaAnterior.totalVendas > 0) {
          crescimentoSemanaAnterior = ((dados.totalVendas - semanaAnterior.totalVendas) / semanaAnterior.totalVendas) * 100;
        }
      }
      return {
        semana,
        totalVendas: dados.totalVendas,
        quantidadeNotas: dados.quantidadeNotas,
        quantidadeItens: dados.quantidadeItens,
        ticketMedio: dados.quantidadeNotas > 0 ? dados.totalVendas / dados.quantidadeNotas : 0,
        clientesUnicos: dados.clientes.size,
        crescimentoSemanaAnterior: parseFloat(crescimentoSemanaAnterior.toFixed(2))
      };
    });

    // Processar meses com crescimento e novos clientes
    const mesesArray = Array.from(porMesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const clientesHistoricoGlobal = new Set<number>();
    const porMes = mesesArray.map((entry, index) => {
      const [mes, dados] = entry;
      
      // Clientes novos = clientes que não apareceram em meses anteriores
      const clientesNovos = Array.from(dados.clientes).filter(c => !clientesHistoricoGlobal.has(c)).length;
      dados.clientes.forEach((c: number) => clientesHistoricoGlobal.add(c));
      
      let crescimentoMesAnterior = 0;
      if (index > 0) {
        const mesAnterior = mesesArray[index - 1][1];
        if (mesAnterior.totalVendas > 0) {
          crescimentoMesAnterior = ((dados.totalVendas - mesAnterior.totalVendas) / mesAnterior.totalVendas) * 100;
        }
      }
      
      return {
        mes,
        totalVendas: dados.totalVendas,
        quantidadeNotas: dados.quantidadeNotas,
        quantidadeItens: dados.quantidadeItens,
        ticketMedio: dados.quantidadeNotas > 0 ? dados.totalVendas / dados.quantidadeNotas : 0,
        clientesUnicos: dados.clientes.size,
        clientesNovos,
        crescimentoMesAnterior: parseFloat(crescimentoMesAnterior.toFixed(2))
      };
    });

    // ====================================
    // 5. RANKINGS AVANÇADOS
    // ====================================
    reportProgress(70, 'Calculando rankings...');
    const top10Clientes = [...porParceiro]
      .sort((a, b) => b.totalVendas - a.totalVendas)
      .slice(0, 10)
      .map(({ CODPARC, NOMEPARC, totalVendas, quantidadeNotas }) => ({
        CODPARC,
        NOMEPARC,
        totalVendas,
        frequencia: quantidadeNotas
      }));

    const top10Produtos = [...porProduto]
      .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
      .slice(0, 10)
      .map(({ CODPROD, DESCRPROD, quantidadeVendida, valorTotal }) => ({
        CODPROD,
        DESCRPROD,
        quantidadeVendida,
        valorTotal
      }));

    const top10Vendedores = [...porVendedor]
      .sort((a, b) => b.totalVendas - a.totalVendas)
      .slice(0, 10)
      .map(({ CODVEND, NOMEVENDEDOR, totalVendas, vendasPorDia }) => ({
        CODVEND,
        NOMEVENDEDOR,
        totalVendas,
        eficiencia: vendasPorDia
      }));

    const top10ClientesPorTicket = [...porParceiro]
      .filter(p => p.quantidadeNotas >= 2) // apenas clientes recorrentes
      .sort((a, b) => b.ticketMedio - a.ticketMedio)
      .slice(0, 10)
      .map(({ CODPARC, NOMEPARC, ticketMedio, quantidadeNotas }) => ({
        CODPARC,
        NOMEPARC,
        ticketMedio,
        totalCompras: quantidadeNotas
      }));

    const top10ProdutosPorValor = [...porProduto]
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10)
      .map(({ CODPROD, DESCRPROD, valorTotal, margemMedia }) => ({
        CODPROD,
        DESCRPROD,
        valorTotal,
        margemMedia
      }));

    // ====================================
    // 6. COMBINAÇÕES (CROSS-SELL) AVANÇADAS
    // ====================================
    reportProgress(80, 'Identificando padrões de cross-sell...');
    const combinacoesMap = new Map<string, any>();
    
    itensPorNotaMap.forEach(itensNota => {
      if (itensNota.length < 2) return;
      
      for (let i = 0; i < itensNota.length; i++) {
        for (let j = i + 1; j < itensNota.length; j++) {
          const prod1 = itensNota[i].CODPROD;
          const prod2 = itensNota[j].CODPROD;
          const key = prod1 < prod2 ? `${prod1}-${prod2}` : `${prod2}-${prod1}`;
          
          if (!combinacoesMap.has(key)) {
            const codProd1 = Math.min(prod1, prod2);
            const codProd2 = Math.max(prod1, prod2);
            combinacoesMap.set(key, {
              CODPROD1: codProd1,
              PRODUTO1: getNomeProduto(codProd1),
              CODPROD2: codProd2,
              PRODUTO2: getNomeProduto(codProd2),
              frequencia: 0,
              valoresNotas: [],
              clientes: new Set<number>()
            });
          }
          
          const combo = combinacoesMap.get(key)!;
          combo.frequencia += 1;
          
          // Pegar informações da nota
          const cab = cabecalhos.find(c => c.NUNOTA === itensNota[i].NUNOTA);
          if (cab) {
            combo.valoresNotas.push(parseFloat(cab.VLRNOTA || 0));
            combo.clientes.add(cab.CODPARC);
          }
        }
      }
    });

    const combinacoes = Array.from(combinacoesMap.values())
      .map(c => ({
        CODPROD1: c.CODPROD1,
        PRODUTO1: c.PRODUTO1,
        CODPROD2: c.CODPROD2,
        PRODUTO2: c.PRODUTO2,
        frequencia: c.frequencia,
        valorMedio: c.valoresNotas.length > 0 
          ? c.valoresNotas.reduce((a: number, b: number) => a + b, 0) / c.valoresNotas.length 
          : 0,
        clientesUnicos: c.clientes.size
      }))
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 20);

    // ====================================
    // 7. AGREGAÇÕES CRUZADAS
    // ====================================
    reportProgress(75, 'Criando agregações cruzadas...');
    
    // 7.1 Cliente x Produto (quais produtos cada cliente comprou)
    const clienteProdutoMap = new Map<number, Map<number, any>>();
    
    cabecalhos.forEach(cab => {
      const codParc = Number(cab.CODPARC);
      
      if (!clienteProdutoMap.has(codParc)) {
        clienteProdutoMap.set(codParc, new Map());
      }
      
      const produtosCliente = clienteProdutoMap.get(codParc)!;
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      
      itensNota.forEach(item => {
        const codProd = Number(item.CODPROD);
        
        if (!produtosCliente.has(codProd)) {
          produtosCliente.set(codProd, {
            CODPROD: codProd,
            DESCRPROD: getNomeProduto(codProd),
            quantidadeComprada: 0,
            valorTotal: 0,
            ultimaCompra: cab.DTNEG,
            frequenciaCompra: 0
          });
        }
        
        const prodInfo = produtosCliente.get(codProd)!;
        prodInfo.quantidadeComprada += parseFloat(item.QTDNEG || 0);
        prodInfo.valorTotal += parseFloat(item.VLRTOT || 0);
        prodInfo.frequenciaCompra += 1;
        
        if (cab.DTNEG > prodInfo.ultimaCompra) {
          prodInfo.ultimaCompra = cab.DTNEG;
        }
      });
    });
    
    const clienteProduto = Array.from(clienteProdutoMap.entries()).map(([codParc, produtosMap]) => {
      return {
        CODPARC: codParc,
        NOMEPARC: getNomeParceiro(codParc),
        produtos: Array.from(produtosMap.values()).sort((a, b) => b.valorTotal - a.valorTotal)
      };
    });
    
    // 7.2 Vendedor x Produto (quais produtos cada vendedor vendeu)
    const vendedorProdutoMap = new Map<number, Map<number, any>>();
    
    cabecalhos.forEach(cab => {
      const codVend = Number(cab.CODVEND);
      
      if (!vendedorProdutoMap.has(codVend)) {
        vendedorProdutoMap.set(codVend, new Map());
      }
      
      const produtosVendedor = vendedorProdutoMap.get(codVend)!;
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      
      itensNota.forEach(item => {
        const codProd = Number(item.CODPROD);
        
        if (!produtosVendedor.has(codProd)) {
          produtosVendedor.set(codProd, {
            CODPROD: codProd,
            DESCRPROD: getNomeProduto(codProd),
            quantidadeVendida: 0,
            valorTotal: 0,
            clientes: new Set<number>(),
            ultimaVenda: cab.DTNEG
          });
        }
        
        const prodInfo = produtosVendedor.get(codProd)!;
        prodInfo.quantidadeVendida += parseFloat(item.QTDNEG || 0);
        prodInfo.valorTotal += parseFloat(item.VLRTOT || 0);
        prodInfo.clientes.add(cab.CODPARC);
        
        if (cab.DTNEG > prodInfo.ultimaVenda) {
          prodInfo.ultimaVenda = cab.DTNEG;
        }
      });
    });
    
    const vendedorProduto = Array.from(vendedorProdutoMap.entries()).map(([codVend, produtosMap]) => {
      return {
        CODVEND: codVend,
        NOMEVENDEDOR: getNomeVendedor(codVend),
        produtos: Array.from(produtosMap.values()).map(p => ({
          CODPROD: p.CODPROD,
          DESCRPROD: p.DESCRPROD,
          quantidadeVendida: p.quantidadeVendida,
          valorTotal: p.valorTotal,
          clientesUnicos: p.clientes.size,
          ultimaVenda: p.ultimaVenda
        })).sort((a, b) => b.valorTotal - a.valorTotal)
      };
    });
    
    // 7.3 Produto x Cliente (quais clientes compraram cada produto)
    const produtoClienteMap = new Map<number, Map<number, any>>();
    
    cabecalhos.forEach(cab => {
      const itensNota = itensPorNotaMap.get(cab.NUNOTA.toString()) || [];
      
      itensNota.forEach(item => {
        const codProd = Number(item.CODPROD);
        
        if (!produtoClienteMap.has(codProd)) {
          produtoClienteMap.set(codProd, new Map());
        }
        
        const clientesProduto = produtoClienteMap.get(codProd)!;
        const codParc = Number(cab.CODPARC);
        
        if (!clientesProduto.has(codParc)) {
          clientesProduto.set(codParc, {
            CODPARC: codParc,
            NOMEPARC: getNomeParceiro(codParc),
            quantidadeComprada: 0,
            valorTotal: 0,
            ultimaCompra: cab.DTNEG,
            numeroCompras: 0
          });
        }
        
        const clienteInfo = clientesProduto.get(codParc)!;
        clienteInfo.quantidadeComprada += parseFloat(item.QTDNEG || 0);
        clienteInfo.valorTotal += parseFloat(item.VLRTOT || 0);
        clienteInfo.numeroCompras += 1;
        
        if (cab.DTNEG > clienteInfo.ultimaCompra) {
          clienteInfo.ultimaCompra = cab.DTNEG;
        }
      });
    });
    
    const produtoCliente = Array.from(produtoClienteMap.entries()).map(([codProd, clientesMap]) => {
      return {
        CODPROD: codProd,
        DESCRPROD: getNomeProduto(codProd),
        clientes: Array.from(clientesMap.values()).map(c => ({
          ...c,
          ticketMedio: c.numeroCompras > 0 ? c.valorTotal / c.numeroCompras : 0
        })).sort((a, b) => b.valorTotal - a.valorTotal)
      };
    });

    // ====================================
    // 8. SEGMENTAÇÃO RFM
    // ====================================
    reportProgress(90, 'Segmentando clientes (RFM)...');
    let campeoes = 0, fieis = 0, potenciais = 0, emRisco = 0, perdidos = 0;
    
    porParceiro.forEach(p => {
      const valorAlto = p.totalVendas > (porParceiro.reduce((sum, c) => sum + c.totalVendas, 0) / porParceiro.length);
      const frequenciaAlta = p.quantidadeNotas >= 3;
      const recente = p.diasSemComprar <= 30;
      
      if (valorAlto && frequenciaAlta && recente) {
        campeoes++;
      } else if (frequenciaAlta && recente) {
        fieis++;
      } else if (valorAlto && !frequenciaAlta) {
        potenciais++;
      } else if (p.diasSemComprar > 60 && p.diasSemComprar <= 120) {
        emRisco++;
      } else if (p.diasSemComprar > 120) {
        perdidos++;
      }
    });

    // ====================================
    // 8. ANÁLISE DE CONCENTRAÇÃO (PARETO)
    // ====================================
    const totalFaturamento = cabecalhos.reduce((sum, c) => sum + parseFloat(c.VLRNOTA || 0), 0);
    
    // Top 20% clientes
    const top20PctClientes = Math.ceil(porParceiro.length * 0.2);
    const faturamentoTop20Clientes = porParceiro
      .sort((a, b) => b.totalVendas - a.totalVendas)
      .slice(0, top20PctClientes)
      .reduce((sum, c) => sum + c.totalVendas, 0);
    
    // Top 20% produtos
    const top20PctProdutos = Math.ceil(porProduto.length * 0.2);
    const faturamentoTop20Produtos = porProduto
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, top20PctProdutos)
      .reduce((sum, p) => sum + p.valorTotal, 0);

    const clienteMaisImportante = porParceiro.sort((a, b) => b.totalVendas - a.totalVendas)[0];
    const produtoMaisImportante = porProduto.sort((a, b) => b.valorTotal - a.valorTotal)[0];

    // ====================================
    // 9. PADRÕES E SAZONALIDADE
    // ====================================
    // Dia da semana com mais vendas
    const vendasPorDiaSemana = new Map<number, number>();
    cabecalhos.forEach(cab => {
      const data = new Date(cab.DTNEG);
      const diaSemana = data.getDay();
      vendasPorDiaSemana.set(diaSemana, (vendasPorDiaSemana.get(diaSemana) || 0) + 1);
    });
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaMaisVendas = Array.from(vendasPorDiaSemana.entries()).sort((a, b) => b[1] - a[1])[0];
    const diaSemanaComMaisVendas = diaMaisVendas ? diasSemana[diaMaisVendas[0]] : 'N/D';

    // Tendência (últimos 3 períodos)
    let tendencia: 'Crescimento' | 'Estável' | 'Queda' = 'Estável';
    if (porMes.length >= 3) {
      const ultimos3 = porMes.slice(-3);
      const crescimentos = ultimos3.map(m => m.crescimentoMesAnterior).filter(c => c !== 0);
      const mediaCresc = crescimentos.length > 0 ? crescimentos.reduce((a, b) => a + b, 0) / crescimentos.length : 0;
      if (mediaCresc > 5) tendencia = 'Crescimento';
      else if (mediaCresc < -5) tendencia = 'Queda';
    }

    // Sazonalidade (variação entre períodos)
    let sazonalidade: 'Alta' | 'Média' | 'Baixa' = 'Baixa';
    if (porMes.length >= 3) {
      const valores = porMes.map(m => m.totalVendas);
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      const desvios = valores.map(v => Math.abs(v - media));
      const desvioPadrao = Math.sqrt(desvios.reduce((a, b) => a + b * b, 0) / desvios.length);
      const coefVariacao = (desvioPadrao / media) * 100;
      if (coefVariacao > 30) sazonalidade = 'Alta';
      else if (coefVariacao > 15) sazonalidade = 'Média';
    }

    // ====================================
    // 10. MÉTRICAS GERAIS AVANÇADAS
    // ====================================
    const totalVendas = cabecalhos.reduce((sum, c) => sum + parseFloat(c.VLRNOTA || 0), 0);
    const totalNotas = cabecalhos.length;
    const totalItens = itens.reduce((sum, i) => sum + parseFloat(i.QTDNEG || 0), 0);
    const ticketMedio = totalNotas > 0 ? totalVendas / totalNotas : 0;
    const produtosUnicos = new Set(itens.map(i => i.CODPROD)).size;
    const clientesUnicos = new Set(cabecalhos.map(c => c.CODPARC)).size;
    const vendedoresAtivos = new Set(cabecalhos.map(c => c.CODVEND)).size;
    const itensPorNota = totalNotas > 0 ? totalItens / totalNotas : 0;
    const valorMedioPorItem = totalItens > 0 ? totalVendas / totalItens : 0;

    // Taxa de crescimento (comparar primeira metade vs segunda metade)
    let taxaCrescimento = 0;
    if (porMes.length >= 2) {
      const metade = Math.floor(porMes.length / 2);
      const primeiraMetade = porMes.slice(0, metade).reduce((sum, m) => sum + m.totalVendas, 0);
      const segundaMetade = porMes.slice(metade).reduce((sum, m) => sum + m.totalVendas, 0);
      if (primeiraMetade > 0) {
        taxaCrescimento = ((segundaMetade - primeiraMetade) / primeiraMetade) * 100;
      }
    }

    // Churn rate (clientes que não voltaram)
    const clientesAntigos = new Set<number>();
    const clientesRecentes = new Set<number>();
    const metadeData = porDia.length > 0 ? porDia[Math.floor(porDia.length / 2)].data : '';
    cabecalhos.forEach(cab => {
      if (cab.DTNEG < metadeData) {
        clientesAntigos.add(cab.CODPARC);
      } else {
        clientesRecentes.add(cab.CODPARC);
      }
    });
    const clientesQueVoltaram = Array.from(clientesAntigos).filter(c => clientesRecentes.has(c)).length;
    const churnRate = clientesAntigos.size > 0 ? ((clientesAntigos.size - clientesQueVoltaram) / clientesAntigos.size) * 100 : 0;

    // LTV (Lifetime Value médio)
    const ltv = clientesUnicos > 0 ? totalVendas / clientesUnicos : 0;

    // ====================================
    // 11. PERFORMANCE
    // ====================================
    const notasPorVendedor = vendedoresAtivos > 0 ? totalNotas / vendedoresAtivos : 0;
    const vendasPorCliente = clientesUnicos > 0 ? totalVendas / clientesUnicos : 0;
    
    const vendedorMaisEficiente = porVendedor.sort((a, b) => {
      const conversaoA = a.totalVendas / (a.quantidadeNotas || 1);
      const conversaoB = b.totalVendas / (b.quantidadeNotas || 1);
      return conversaoB - conversaoA;
    })[0];

    // ====================================
    // RESULTADO FINAL
    // ====================================
    const resultado: DadosAgregados = {
      porParceiro,
      porProduto,
      porVendedor,
      temporal: {
        porDia,
        porSemana,
        porMes
      },
      rankings: {
        top10Clientes,
        top10Produtos,
        top10Vendedores,
        top10ClientesPorTicket,
        top10ProdutosPorValor
      },
      combinacoes,
      segmentacaoRFM: {
        campeoes,
        fieis,
        potenciais,
        emRisco,
        perdidos
      },
      clienteProduto,
      vendedorProduto,
      produtoCliente,
      concentracao: {
        pareto80_20: {
          top20ClientesRepresentam: totalFaturamento > 0 ? (faturamentoTop20Clientes / totalFaturamento) * 100 : 0,
          top20ProdutosRepresentam: totalFaturamento > 0 ? (faturamentoTop20Produtos / totalFaturamento) * 100 : 0
        },
        dependencia: {
          clienteMaisImportante: clienteMaisImportante ? {
            CODPARC: clienteMaisImportante.CODPARC,
            NOMEPARC: clienteMaisImportante.NOMEPARC,
            participacao: totalFaturamento > 0 ? (clienteMaisImportante.totalVendas / totalFaturamento) * 100 : 0
          } : { CODPARC: 0, NOMEPARC: 'N/D', participacao: 0 },
          produtoMaisImportante: produtoMaisImportante ? {
            CODPROD: produtoMaisImportante.CODPROD,
            DESCRPROD: produtoMaisImportante.DESCRPROD,
            participacao: totalFaturamento > 0 ? (produtoMaisImportante.valorTotal / totalFaturamento) * 100 : 0
          } : { CODPROD: 0, DESCRPROD: 'N/D', participacao: 0 }
        }
      },
      padroes: {
        diaSemanaComMaisVendas,
        horaPicoVendas: 'N/D', // implementar se houver timestamp
        tendencia,
        sazonalidade
      },
      metricas: {
        totalVendas,
        totalNotas,
        totalItens,
        ticketMedio,
        produtosUnicos,
        clientesUnicos,
        vendedoresAtivos,
        itensPorNota: parseFloat(itensPorNota.toFixed(2)),
        valorMedioPorItem: parseFloat(valorMedioPorItem.toFixed(2)),
        taxaCrescimento: parseFloat(taxaCrescimento.toFixed(2)),
        churnRate: parseFloat(churnRate.toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2))
      },
      performance: {
        notasPorVendedor: parseFloat(notasPorVendedor.toFixed(2)),
        vendasPorCliente: parseFloat(vendasPorCliente.toFixed(2)),
        eficienciaVendedor: vendedorMaisEficiente ? {
          CODVEND: vendedorMaisEficiente.CODVEND,
          NOMEVENDEDOR: vendedorMaisEficiente.NOMEVENDEDOR,
          conversao: vendedorMaisEficiente.ticketMedio
        } : { CODVEND: 0, NOMEVENDEDOR: 'N/D', conversao: 0 }
      }
    };

    reportProgress(100, 'Agregação concluída!');
    

    return resultado;
  }

  /**
   * Calcula o número da semana do ano
   */
  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
