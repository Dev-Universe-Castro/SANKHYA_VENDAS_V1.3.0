"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Trash2, Search, Plus, Package } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"
import { QuantidadeProdutoModal } from "@/components/quantidade-produto-modal"
import VendedorSelectorModal from "@/components/vendedor-selector-modal"
import { PedidoSyncService } from "@/lib/pedido-sync"
import { OfflineDataService } from '@/lib/offline-data-service'
import { db } from "@/lib/client-db"
import { ConfiguracaoProdutoModal, ConfiguracaoProduto, UnidadeVolume } from "@/components/configuracao-produto-modal"
import { ApproverSelectionModal } from "@/components/approver-selection-modal"
import { validatePolicyViolations } from "@/lib/policy-engine"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"

interface PedidoVendaFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function PedidoVendaForm({ onSuccess, onCancel }: PedidoVendaFormProps) {
  const [pedido, setPedido] = useState({
    CODEMP: "1",
    CODCENCUS: "0",
    NUNOTA: "",
    MODELO_NOTA: "",
    DTNEG: new Date().toISOString().split('T')[0],
    DTFATUR: "",
    DTENTSAI: "",
    CODPARC: "",
    CODTIPOPER: "974",
    TIPMOV: "P",
    CODTIPVENDA: "0",
    CODTAB: "0",
    CODVEND: "0",
    OBSERVACAO: "",
    VLOUTROS: 0,
    VLRDESCTOT: 0,
    VLRFRETE: 0,
    TIPFRETE: "S",
    ORDEMCARGA: "",
    CODPARCTRANSP: "0",
    PERCDESC: 0,
    CODNAT: "0",
    TIPO_CLIENTE: "PJ",
    CPF_CNPJ: "",
    IE_RG: "",
    RAZAO_SOCIAL: "",
    RAZAOSOCIAL: ""
  })

  const [itens, setItens] = useState<any[]>([])
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [produtoEstoqueSelecionado, setProdutoEstoqueSelecionado] = useState<any>(null)

  // Approval Flow State
  const [showApproverModal, setShowApproverModal] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null)

  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [vendedores, setVendedores] = useState<any[]>([])
  const [parceiros, setParceiros] = useState<any[]>([])
  const [showParceiroModal, setShowParceiroModal] = useState(false)
  const [searchParceiro, setSearchParceiro] = useState("")
  const [tiposOperacao, setTiposOperacao] = useState<any[]>([])
  const [loadingTiposOperacao, setLoadingTiposOperacao] = useState(false)
  const [tiposNegociacao, setTiposNegociacao] = useState<any[]>([])
  const [loadingTiposNegociacao, setLoadingTiposNegociacao] = useState(false)
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [loadingTabelasPrecos, setLoadingTabelasPrecos] = useState(false)

  const [isOffline, setIsOffline] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      const offline = await OfflineDataService.isDataAvailable();
      setIsOffline(offline);

      if (offline) {
        console.log("Sistema offline: Carregando dados do serviço offline.");
        await carregarDadosOffline();
      } else {
        console.log("Sistema online: Carregando dados da API.");
        carregarVendedorUsuario();
        carregarEmpresas();
        carregarTiposOperacao(); // Adicionado
        carregarTiposNegociacao();
        verificarPermissaoAdmin();
        carregarTabelasPrecos();
      }
    };
    initializeData();
  }, []);

  const [itemEditando, setItemEditando] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [unidadesEdit, setUnidadesEdit] = useState<UnidadeVolume[]>([])
  const [configEditInicial, setConfigEditInicial] = useState<Partial<ConfiguracaoProduto>>({
    quantidade: 1,
    desconto: 0,
    preco: 0,
    unidade: 'UN'
  })

  const abrirEdicaoItem = async (item: any, index: number) => {
    try {
      const volumes = await OfflineDataService.getVolumes(item.CODPROD)
      const unidades: UnidadeVolume[] = [
        {
          CODVOL: item.UNIDADE_PADRAO || 'UN',
          DESCRICAO: `${item.UNIDADE_PADRAO || 'UN'} - Unidade Padrão`,
          QUANTIDADE: 1,
          isPadrao: true
        },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({
          CODVOL: v.CODVOL,
          DESCRICAO: v.DESCRDANFE || v.CODVOL,
          QUANTIDADE: v.QUANTIDADE || 1,
          isPadrao: false
        }))
      ]

      setUnidadesEdit(unidades)
      setItemEditando({ ...item, index, preco: item.AD_VLRUNIT || item.VLRUNIT })
      setConfigEditInicial({
        quantidade: item.QTDNEG,
        desconto: item.PERCDESC || 0,
        acrescimo: (item.VLRUNIT > (item.AD_VLRUNIT || item.preco))
          ? Number((((item.VLRUNIT - (item.AD_VLRUNIT || item.preco)) / (item.AD_VLRUNIT || item.preco)) * 100).toFixed(2))
          : 0,
        preco: item.VLRUNIT,
        unidade: item.CODVOL || 'UN',
        precoBase: item.AD_VLRUNIT || item.preco || item.VLRUNIT
      })
      setShowEditModal(true)
    } catch (error) {
      console.error('Erro ao abrir edição:', error)
      toast.error('Erro ao carregar dados do item')
    }
  }

  const salvarEdicaoItem = (config: ConfiguracaoProduto) => {
    if (!itemEditando) return

    const precoBase = config.precoBase || config.preco
    const vlrTotal = config.preco * config.quantidade
    const vlrSubtotalOriginal = precoBase * config.quantidade
    const vlrDescontoReal = vlrSubtotalOriginal - vlrTotal

    const itemAtualizado = {
      ...itemEditando,
      QTDNEG: config.quantidade,
      PERCDESC: config.desconto,
      VLRUNIT: config.preco,
      VLRTOT: vlrTotal,
      VLRDESC: vlrDescontoReal > 0 ? vlrDescontoReal : 0,
      CODVOL: config.unidade,
      UNIDADE: config.unidade,
      AD_VLRUNIT: precoBase,
      preco: precoBase,
      politicaAplicada: itemEditando.politicaAplicada
    }

    setItens(prev => {
      const novos = [...prev]
      novos[itemEditando.index] = itemAtualizado
      return novos
    })

    setShowEditModal(false)
    setItemEditando(null)
    toast.success('Item atualizado')
  }

  const carregarDadosOffline = async () => {
    try {
      setLoadingTiposNegociacao(true);
      setLoadingTabelasPrecos(true);

      const [
        tiposOperacaoOffline,
        tiposNegociacaoOffline,
        tabelasPrecosConfigOffline,
        vendedoresOffline,
        parceirosOffline,
        empresasOffline
      ] = await Promise.all([
        OfflineDataService.getTiposOperacao(),
        OfflineDataService.getTiposNegociacao(),
        OfflineDataService.getTabelasPrecosConfig(),
        OfflineDataService.getVendedores(),
        OfflineDataService.getParceiros(),
        OfflineDataService.getEmpresas()
      ]);

      const operacoesFull = tiposOperacaoOffline || [];
      const negociacoesFull = tiposNegociacaoOffline || [];

      setTiposOperacao(operacoesFull);
      setTiposNegociacao(negociacoesFull);
      setTabelasPrecos(tabelasPrecosConfigOffline || []);
      setVendedores(vendedoresOffline || []);
      setParceiros(parceirosOffline || []);
      setEmpresas(empresasOffline || []);

      // Fallback: Se não houver empresas (dev mode), adicionar uma manual
      if (!empresasOffline || empresasOffline.length === 0) {
        console.warn("⚠️ Nenhuma empresa encontrada offline. Adicionando empresa padrão de desenvolvimento.");
        setEmpresas([{
          CODEMP: 1,
          NOMEFANTASIA: 'Empresa Teste Dev',
          RAZAOSOCIAL: 'Empresa Teste Desenvolvimento Ltda'
        }]);
        // Opcional: Salvar no banco para persistir
        try {
          await db.empresas.put({
            CODEMP: 1,
            NOMEFANTASIA: 'Empresa Teste Dev',
            RAZAOSOCIAL: 'Empresa Teste Desenvolvimento Ltda',
            CGC: '00.000.000/0001-00'
          });
        } catch (e) { console.error("Erro ao salvar empresa dev", e); }
      }

      console.log("✅ Dados offline carregados.");

      // Tentar carregar o vendedor e a empresa do usuário localmente
      const userStr = localStorage.getItem('currentUser'); // Assumindo que o usuário logado é salvo no localStorage

      console.log('🔍 [OFFLINE] LocalStorage currentUser string:', userStr);

      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('🔍 [OFFLINE] LocalStorage currentUser object:', user);

        setPedido(prev => {
          const nextState = { ...prev };
          if (user.codVendedor) {
            nextState.CODVEND = String(user.codVendedor);
            console.log('✅ [OFFLINE] Vendedor do usuário carregado do localStorage:', user.codVendedor);
          }
          const codEmp = user.CODEMP || user.codEmp || user.cod_emp;
          console.log('🔍 [OFFLINE] Valor encontrado para Empresa no LocalStorage:', codEmp);
          if (codEmp) {
            nextState.CODEMP = String(codEmp);
            console.log('✅ [OFFLINE] Empresa filial do usuário carregada do localStorage:', codEmp);
          }
          return nextState;
        });
      }
      // Verificar permissão admin do localStorage também
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsAdminUser(user.role === 'ADMIN');
      }

    } catch (error) {
      console.error("Erro ao carregar dados offline:", error);
      toast.error("Falha ao carregar dados offline.");
    } finally {
      setLoadingTiposNegociacao(false);
      setLoadingTabelasPrecos(false);
    }
  };

  const verificarPermissaoAdmin = () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))
        setIsAdminUser(user.role === 'ADMIN')
      }
    } catch (error) {
      console.error('Erro ao verificar permissão admin:', error)
    }
  }

  const carregarVendedorUsuario = () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      console.log('🔍 [ONLINE] Cookie user cru:', userStr);

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))

        console.log('🔍 [ONLINE] Cookie user decodificado:', user);

        setPedido(prev => {
          const nextState = { ...prev }
          if (user.codVendedor) {
            nextState.CODVEND = String(user.codVendedor)
            console.log('✅ [ONLINE] Vendedor do usuário carregado:', user.codVendedor)
          }
          const codEmp = user.CODEMP || user.codEmp || user.cod_emp;
          console.log('🔍 [ONLINE] Valor encontrado para Empresa no cookie:', codEmp);
          if (codEmp) {
            nextState.CODEMP = String(codEmp);
            console.log('✅ [ONLINE] Empresa filial do usuário carregada:', codEmp);
          }
          return nextState;
        })
      }
    } catch (error) {
      console.error('Erro ao carregar vendedor do usuário:', error)
    }
  }

  const carregarVendedores = async () => {
    if (isOffline) {
      const cachedVendedores = await OfflineDataService.getVendedores();
      if (cachedVendedores) {
        setVendedores(cachedVendedores);
        console.log('✅ Vendedores carregados do serviço offline:', cachedVendedores.length);
      }
      return;
    }

    try {
      const response = await fetch('/api/vendedores'); // Assumindo que esta API retorna os vendedores
      if (!response.ok) throw new Error('Erro ao carregar vendedores');
      const data = await response.json();
      const vendedoresList = Array.isArray(data) ? data : (data.data || []);

      const vendedoresAtivos = vendedoresList.filter((v: any) =>
        v.ATIVO === 'S' && v.TIPVEND === 'V'
      );

      setVendedores(vendedoresAtivos);
      console.log('✅ Vendedores carregados da API:', vendedoresAtivos.length);
    } catch (error) {
      console.error('Erro ao carregar vendedores da API:', error);
      setVendedores([]);
      toast.error("Falha ao carregar vendedores.");
    }
  }

  const carregarTiposOperacao = async () => {
    if (isOffline) {
      const cachedTiposOperacao = await OfflineDataService.getTiposOperacao();
      if (cachedTiposOperacao) {
        setTiposOperacao(cachedTiposOperacao);
        console.log('✅ Tipos de operação carregados do serviço offline:', cachedTiposOperacao.length);
      }
      return;
    }

    try {
      setLoadingTiposOperacao(true)
      const response = await fetch('/api/sankhya/tipos-negociacao?tipo=operacao')
      if (response.ok) {
        const data = await response.json()
        const tiposOperacaoList = data.tiposOperacao || []
        setTiposOperacao(tiposOperacaoList)
        console.log('✅ Tipos de operação carregados:', tiposOperacaoList.length)
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de operação:', error)
      setTiposOperacao([])
    } finally {
      setLoadingTiposOperacao(false)
    }
  }

  const carregarTiposNegociacao = async () => {
    if (isOffline) {
      const cachedTiposNegociacao = await OfflineDataService.getTiposNegociacao();
      if (cachedTiposNegociacao) {
        setTiposNegociacao(cachedTiposNegociacao);
        console.log('✅ Tipos de negociação carregados do serviço offline:', cachedTiposNegociacao.length);
      }
      return;
    }

    try {
      setLoadingTiposNegociacao(true)

      const response = await fetch('/api/sankhya/tipos-negociacao?tipo=negociacao')
      if (response.ok) {
        const data = await response.json()
        const tiposList = data.tiposNegociacao || []
        setTiposNegociacao(tiposList)
        console.log('✅ Tipos de negociação carregados:', tiposList.length)
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de negociação:', error)
      setTiposNegociacao([])
    } finally {
      setLoadingTiposNegociacao(false)
    }
  }

  const carregarTabelasPrecos = async () => {
    if (isOffline) {
      const cachedTabelas = await OfflineDataService.getTabelasPrecos();
      if (cachedTabelas) {
        setTabelasPrecos(cachedTabelas);
        console.log('✅ Tabelas de preços carregadas do serviço offline:', cachedTabelas.length);
      }
      return;
    }

    try {
      setLoadingTabelasPrecos(true)

      const response = await fetch('/api/tabelas-precos-config')
      if (!response.ok) throw new Error('Erro ao carregar tabelas de preços configuradas')
      const data = await response.json()
      const tabelas = data.configs || []

      const tabelasFormatadas = tabelas.map((config: any) => ({
        NUTAB: config.NUTAB,
        CODTAB: config.CODTAB,
        DESCRICAO: config.DESCRICAO,
        ATIVO: config.ATIVO
      }))

      setTabelasPrecos(tabelasFormatadas)
      console.log('✅ Tabelas de preços configuradas carregadas:', tabelasFormatadas.length)
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços configuradas:', error)
      toast.error("Falha ao carregar tabelas de preços. Verifique as configurações.")
      setTabelasPrecos([])
    } finally {
      setLoadingTabelasPrecos(false)
    }
  }

  const carregarEmpresas = async () => {
    if (isOffline) {
      const cachedEmpresas = await OfflineDataService.getEmpresas();
      if (cachedEmpresas) {
        setEmpresas(cachedEmpresas);
        console.log('✅ Empresas carregadas do serviço offline:', cachedEmpresas.length);
      }
      return;
    }

    try {
      setLoadingEmpresas(true)
      const response = await fetch('/api/public/empresas')
      if (response.ok) {
        const data = await response.json()
        setEmpresas(data)
        console.log('✅ Empresas carregadas:', data.length)
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      setEmpresas([])
    } finally {
      setLoadingEmpresas(false)
    }
  }

  const buscarParceiros = async (termo: string) => {
    if (termo.length < 3) {
      setParceiros([])
      return
    }

    if (isOffline) {
      const parceirosOffline = await OfflineDataService.getParceiros();
      const filteredParceiros = parceirosOffline?.filter((p: any) =>
        p.NOMEPARC.toLowerCase().includes(termo.toLowerCase()) ||
        p.RAZAOSOCIAL.toLowerCase().includes(termo.toLowerCase()) ||
        p.CODPARC.toString().includes(termo) ||
        p.CGC_CPF.replace(/[^\d]/g, '').includes(termo.replace(/[^\d]/g, ''))
      ) || [];
      setParceiros(filteredParceiros);
      console.log(`✅ Parceiros offline encontrados para "${termo}":`, filteredParceiros.length);
      return;
    }

    try {
      const response = await fetch(`/api/sankhya/parceiros/search?termo=${encodeURIComponent(termo)}`)
      if (response.ok) {
        const data = await response.json()
        setParceiros(data)
      }
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error)
      toast.error('Erro ao buscar parceiros')
    }
  }

  const selecionarParceiro = async (parceiro: any) => {
    console.log('🔍 Parceiro selecionado:', parceiro)

    setPedido(prev => ({
      ...prev,
      CODPARC: String(parceiro.CODPARC),
      RAZAOSOCIAL: parceiro.RAZAOSOCIAL || parceiro.NOMEPARC,
      RAZAO_SOCIAL: parceiro.RAZAOSOCIAL || parceiro.NOMEPARC,
      CPF_CNPJ: parceiro.CGC_CPF || '',
      IE_RG: parceiro.IDENTINSCESTAD || '',
      TIPO_CLIENTE: parceiro.TIPPESSOA === 'J' ? 'PJ' : 'PF'
    }))

    setShowParceiroModal(false)
    setParceiros([])
    setSearchParceiro("")
    toast.success(`Parceiro ${parceiro.RAZAOSOCIAL || parceiro.NOMEPARC} selecionado`)
  }

  const handleConfirmarProdutoEstoque = async (
    produto: any,
    quantidade: number,
    desconto: number,
    tabelaPreco?: string,
    precoForcado?: number,
    maxDesconto?: number,
    maxAcrescimo?: number,
    precoBase?: number,
    politicaAplicada?: any
  ) => {
    try {
      console.log('📦 Produto confirmado:', { produto, quantidade, desconto, tabelaPreco, precoForcado, maxDesconto, maxAcrescimo })

      const isOfflineStatus = !navigator.onLine
      let vlrUnit = precoForcado || produto.AD_VLRUNIT || produto.preco || produto.VLRUNIT || 0
      let vlrUnitTabela = vlrUnit

      if (vlrUnit === 0 && tabelaPreco && tabelaPreco !== 'PADRAO' && !isOfflineStatus) {
        try {
          const responsePreco = await fetch(
            `/api/oracle/preco?codProd=${produto.CODPROD}&tabelaPreco=${encodeURIComponent(tabelaPreco)}`
          )

          if (responsePreco.ok) {
            const dataPreco = await responsePreco.json()
            if (dataPreco.preco) {
              vlrUnitTabela = dataPreco.preco
              vlrUnit = dataPreco.preco
              console.log('💰 Preço da tabela aplicado:', vlrUnitTabela)
            }
          }
        } catch (error) {
          console.error('❌ Erro ao buscar preço da tabela:', error)
          toast.error('Erro ao buscar preço da tabela')
        }
      } else if (vlrUnit === 0 && tabelaPreco && tabelaPreco !== 'PADRAO' && isOfflineStatus) {
        // Se offline e sem preço, tenta buscar o preço da tabela offline
        // Precisamos do NUTAB da config selecionada
        const configTabela = tabelasPrecos.find((t: any) => t.CODTAB === tabelaPreco);
        if (configTabela && configTabela.NUTAB) {
          const precosOffline = await OfflineDataService.getPrecos(produto.CODPROD, configTabela.NUTAB);
          if (precosOffline && precosOffline.length > 0) {
            vlrUnitTabela = precosOffline[0].VLRVENDA || precosOffline[0].preco || 0;
            vlrUnit = vlrUnitTabela;
            console.log('💰 Preço da tabela offline aplicado:', vlrUnitTabela);
          }
        }
      }

      const vlrDesconto = (vlrUnit * desconto) / 100
      const vlrUnitFinal = vlrUnit - vlrDesconto
      const vlrTotal = vlrUnitFinal * quantidade

      // Garantir que CODVOL sempre seja definido
      const codVol = produto.CODVOL || produto.UNIDADE || 'UN';

      console.log('📦 CODVOL que será enviado:', codVol);

      const novoItem = {
        CODPROD: produto.CODPROD,
        DESCRPROD: produto.DESCRPROD,
        QTDNEG: quantidade,
        VLRUNIT: vlrUnitFinal,
        VLRTOT: vlrTotal,
        PERCDESC: desconto,
        VLRDESC: vlrDesconto * quantidade,
        CODVOL: codVol, // Garantir CODVOL sempre presente
        UNIDADE: codVol,
        CONTROLE: produto.CONTROLE || 'N',
        AD_VLRUNIT: precoBase !== undefined ? precoBase : vlrUnit, // Preservar preço base original
        preco: precoBase !== undefined ? precoBase : vlrUnit,
        TABELA_PRECO: tabelaPreco || 'PADRAO',
        MAX_DESC_PERMITIDO: maxDesconto,
        MAX_ACRE_PERMITIDO: maxAcrescimo,
        politicaAplicada: politicaAplicada
      }

      setItens(prev => [...prev, novoItem])
      setShowEstoqueModal(false)
      setProdutoEstoqueSelecionado(null)
      toast.success('Produto adicionado ao pedido')
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error)
      toast.error('Erro ao adicionar produto')
    }
  }

  // Wrapper para adaptar a assinatura do modal
  const handleConfirmarDoModal = (produto: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number) => {
    // Agora passamos o preço e os limites de política corretamente, incluindo o precoBase
    handleConfirmarProdutoEstoque(produto, quantidade, desconto || 0, tabela || 'PADRAO', preco, maxDesconto, maxAcrescimo, precoBase);
  }

  const removerItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index))
    toast.success('Produto removido')
  }

  const calcularTotalPedido = () => {
    const totalItens = itens.reduce((acc, item) => acc + (item.VLRTOT || 0), 0)
    const totalItensFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(totalItens)
    return { total: totalItens, formatado: totalItensFormatado }
  }

  const handleSubmit = async () => {
    if (!isFormValid) return;

    // 1. Verificação de Políticas Comerciais
    const violacoesDetectadas: string[] = []

    itens.forEach(item => {
      // 1. Validar Desconto
      if (item.MAX_DESC_PERMITIDO !== undefined && item.MAX_DESC_PERMITIDO !== null) {
        if (item.PERCDESC > item.MAX_DESC_PERMITIDO) {
          violacoesDetectadas.push(`Produto ${item.CODPROD}: Desconto de ${item.PERCDESC}% excede o máximo permitido de ${item.MAX_DESC_PERMITIDO}%`);
        }
      }

      // 2. Validar Acréscimo (Markup)
      if (item.MAX_ACRE_PERMITIDO !== undefined && item.MAX_ACRE_PERMITIDO !== null) {
        const precoBase = item.AD_VLRUNIT || item.preco || 0;
        const vlrUnitarioDigitado = item.VLRUNIT / (1 - (item.PERCDESC / 100)); // Reverter desconto para pegar o preço bruto digitado

        if (vlrUnitarioDigitado > precoBase) {
          const markupPerc = ((vlrUnitarioDigitado - precoBase) / precoBase) * 100;
          if (markupPerc > (item.MAX_ACRE_PERMITIDO + 0.01)) {
            violacoesDetectadas.push(`Produto ${item.CODPROD}: Acréscimo de ${markupPerc.toFixed(2)}% excede o máximo permitido de ${item.MAX_ACRE_PERMITIDO}%`);
          }
        }
      }
    });

    if (violacoesDetectadas.length > 0) {
      setViolations(violacoesDetectadas);
      setPendingOrderPayload({ ...pedido, ITENS: itens });
      setShowApproverModal(true);
      return;
    }

    const isOnlineEnv = navigator.onLine;

    try {
      if (!isOnlineEnv) {
        // MODO OFFLINE: Salvar direto na fila local como PENDENTE de sincronização
        toast.loading("Salvando pedido offline...");
        const saveResult = await PedidoSyncService.salvarPedido({ ...pedido, ITENS: itens });

        if (saveResult.success) {
          toast.success("Pedido salvo offline!");
          if (onSuccess) onSuccess();
        } else {
          toast.error("Erro ao salvar pedido offline: " + saveResult.error);
        }
        return;
      }

      toast.loading("Sincronizando pedido...");
      // Implementação simplificada do envio
      const setupResult = await PedidoSyncService.processarFila();

      const saveResult = await PedidoSyncService.salvarPedido({ ...pedido, ITENS: itens });

      if (saveResult.success) {
        toast.success("Pedido criado com sucesso!");
        if (onSuccess) onSuccess();
      } else {
        toast.error("Erro ao sincronizar pedido: " + saveResult.error);
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      toast.error("Erro ao processar pedido");
    } finally {
      toast.dismiss();
    }
  };

  const handleRequestApproval = async (idAprovador: number, justificativa?: string) => {
    try {
      const isOnlineEnv = navigator.onLine;
      const payload = pendingOrderPayload || { ...pedido, ITENS: itens };

      if (!isOnlineEnv) {
        toast.loading("Salvando solicitação offline...");

        await PedidoSyncService.salvarOffline(payload, 'OFFLINE', {
          status: 'PENDENTE',
          violacoes: violations,
          justificativa,
          idAprovador
        });

        toast.success("Pedido com restrição salvo para aprovação offline!");
        setShowApproverModal(false);
        if (onSuccess) onSuccess();
        return;
      }

      toast.loading("Enviando solicitação de aprovação...");

      await PedidoSyncService.registrarAprovacaoOnline(
        payload,
        violations,
        justificativa,
        idAprovador
      );

      toast.success("Solicitação enviada com sucesso!");
      setShowApproverModal(false);
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Erro ao solicitar aprovação:", error);
      toast.error("Erro ao salvar solicitação.");
    } finally {
      toast.dismiss();
    }
  }

  const totals = calcularTotalPedido()
  const totalQuantidade = itens.reduce((acc, item) => acc + (item.QTDNEG || 0), 0)

  const isFormValid = pedido.CODPARC && pedido.CODVEND !== "0" && itens.length > 0 && pedido.CODTIPOPER && pedido.MODELO_NOTA

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-y-auto pb-32 px-4 pt-4">
        {/* Dados do Parceiro */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-700">Dados do Pedido</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Empresa *</Label>
                <Select
                  value={pedido.CODEMP}
                  onValueChange={(val) => setPedido(prev => ({ ...prev, CODEMP: val }))}
                  disabled={loadingEmpresas}
                >
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm bg-gray-50">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.CODEMP} value={String(emp.CODEMP)}>
                        {emp.CODEMP} - {emp.NOMEFANTASIA || emp.RAZAOSOCIAL}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-700">Dados do Parceiro</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Parceiro *</Label>
                <div className="flex gap-1">
                  <Input
                    value={pedido.RAZAOSOCIAL || pedido.RAZAO_SOCIAL || ''}
                    readOnly
                    placeholder="Buscar parceiro..."
                    className="text-xs md:text-sm h-8 md:h-10 bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowParceiroModal(true)}
                    className="h-8 w-8 md:h-10 md:w-10"
                  >
                    <Search className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
                {pedido.CODPARC && (
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    Código: {pedido.CODPARC}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo Cliente *</Label>
                <Select value={pedido.TIPO_CLIENTE} onValueChange={(value) => setPedido({ ...pedido, TIPO_CLIENTE: value })}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">CPF/CNPJ *</Label>
                <Input
                  value={pedido.CPF_CNPJ || ''}
                  onChange={(e) => setPedido(prev => ({ ...prev, CPF_CNPJ: e.target.value }))}
                  placeholder="Digite o CPF/CNPJ"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">IE/RG *</Label>
                <Input
                  value={pedido.IE_RG || ''}
                  onChange={(e) => setPedido(prev => ({ ...prev, IE_RG: e.target.value }))}
                  placeholder="Digite a IE/RG"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Razão Social *</Label>
                <Input
                  value={pedido.RAZAO_SOCIAL || ''}
                  onChange={(e) => setPedido(prev => ({ ...prev, RAZAO_SOCIAL: e.target.value }))}
                  placeholder="Digite a Razão Social"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados da Nota */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-green-700">Dados da Nota</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modelo Nota *</Label>
                <Input
                  type="number"
                  value={pedido.MODELO_NOTA}
                  onChange={(e) => setPedido({ ...pedido, MODELO_NOTA: e.target.value })}
                  placeholder="Digite o número do modelo"
                  className="text-xs md:text-sm h-8 md:h-10"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo de Movimento</Label>
                <Select value={pedido.TIPMOV} onValueChange={(value) => setPedido({ ...pedido, TIPMOV: value })}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Pedido</SelectItem>
                    <SelectItem value="V">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo de Operação *</Label>
                <Select
                  value={pedido.CODTIPOPER}
                  onValueChange={(value) => setPedido({ ...pedido, CODTIPOPER: value })}
                  disabled={loadingTiposOperacao}
                >
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder={loadingTiposOperacao ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPOPER} value={String(tipo.CODTIPOPER)}>
                        {tipo.CODTIPOPER} - {tipo.DESCRTIPOPER || tipo.NOME}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Condição de Pagamento *</Label>
                <Select
                  value={pedido.CODTIPVENDA}
                  onValueChange={(value) => setPedido({ ...pedido, CODTIPVENDA: value })}
                  disabled={loadingTiposNegociacao}
                >
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder={loadingTiposNegociacao ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNegociacao.map((neg) => (
                      <SelectItem key={neg.CODTIPVENDA} value={String(neg.CODTIPVENDA)}>
                        {neg.CODTIPVENDA} - {neg.DESCRTIPVENDA || neg.NOME}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data Negociação *</Label>
                <Input
                  type="date"
                  value={pedido.DTNEG}
                  onChange={(e) => setPedido({ ...pedido, DTNEG: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tabela de Preço</Label>
                <Select
                  value={pedido.CODTAB}
                  onValueChange={(value) => setPedido({ ...pedido, CODTAB: value })}
                  disabled={loadingTabelasPrecos}
                >
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder={loadingTabelasPrecos ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tabela Padrão (Sem Filtro)</SelectItem>
                    {tabelasPrecos.map((tabela) => (
                      <SelectItem key={tabela.NUTAB} value={String(tabela.CODTAB)}>
                        {tabela.CODTAB} - {tabela.DESCRICAO}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Vendedor *</Label>
                <div className="flex gap-1">
                  <Input
                    value={vendedores.find(v => v.CODVEND === Number(pedido.CODVEND))?.APELIDO || pedido.CODVEND || ''}
                    readOnly
                    placeholder="Vendedor"
                    className="text-xs md:text-sm h-8 md:h-10 bg-gray-50"
                  />
                  {isAdminUser && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowVendedorModal(true)}
                      className="h-8 w-8 md:h-10 md:w-10"
                    >
                      <Search className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens do Pedido */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-700">Produtos ({itens.length})</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProdutoModal(true)}
                className="h-8 text-xs border-green-600 text-green-600 hover:bg-green-50"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Produto
              </Button>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-gray-50">
                <Package className="h-8 w-8 mx-auto text-gray-300" />
                <p className="text-xs text-muted-foreground mt-2">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <Card key={index} className="border-green-100">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => abrirEdicaoItem(item, index)}
                        >
                          <p className="font-medium text-xs md:text-sm truncate">
                            {item.CODPROD} - {item.DESCRPROD}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] md:text-xs text-muted-foreground">
                            <span>Qtd: <span className="font-semibold text-foreground">{item.QTDNEG} {item.CODVOL}</span></span>
                            <span>Unit: <span className="font-semibold text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRUNIT)}</span></span>
                            {item.PERCDESC > 0 && (
                              <span className="text-red-500">Desc: {item.PERCDESC}%</span>
                            )}
                            <span className="font-bold text-green-600">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VLRTOT)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerItem(index)}
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ConfiguracaoProdutoModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          produto={itemEditando}
          unidades={unidadesEdit}
          configInicial={configEditInicial}
          onConfirmar={salvarEdicaoItem}
          modo="editar"
          maxDesconto={itemEditando?.MAX_DESC_PERMITIDO}
          maxAcrescimo={itemEditando?.MAX_ACRE_PERMITIDO}
          politicaAplicada={itemEditando?.politicaAplicada}
        />

        {/* Observações */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="text-xs">Observação</Label>
            <Textarea
              value={pedido.OBSERVACAO}
              onChange={(e) => setPedido({ ...pedido, OBSERVACAO: e.target.value })}
              placeholder="Informações adicionais do pedido..."
              className="text-xs md:text-sm min-h-[80px]"
            />
          </CardContent>
        </Card>
      </div>
      <ProdutoSelectorModal
        isOpen={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        onConfirm={handleConfirmarDoModal}
        idEmpresa={pedido.CODEMP}
        codParc={pedido.CODPARC}
        titulo="Adicionar Item"
      />

      {/* Rodapé fixo do modal de pedido */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Itens</span>
            <span className="text-lg font-bold text-[#2ECC71]">{itens.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Qtd</span>
            <span className="text-lg font-bold text-[#2ECC71]">{totalQuantidade}</span>
          </div>
          <div className="bg-[#2ECC71] px-4 py-1 rounded-lg flex flex-col justify-center">
            <span className="text-[10px] text-white/80 uppercase font-bold">Total</span>
            <span className="text-lg font-bold text-white leading-none">{totals.formatado}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold"
            disabled={!isFormValid}
          >
            Criar Pedido
          </Button>
        </div>
      </div>
      <ApproverSelectionModal
        isOpen={showApproverModal}
        onClose={() => setShowApproverModal(false)}
        onConfirm={handleRequestApproval}
        violations={violations}
      />
    </div>
  )
}