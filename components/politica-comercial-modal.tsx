import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PoliticaComercial } from '@/lib/politicas-comerciais-service';
import { toast } from 'sonner';
import { X, MapPin, Users, Package, Settings, Settings2, FileText, ChevronsUpDown, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelectOption } from '@/components/ui/async-multi-select-combobox';
import { AsyncMultiSelectInput } from '@/components/ui/async-multi-select-input';
import { OfflineDataService } from '@/lib/offline-data-service';
import { useEstados } from '@/hooks/use-offline-conditions'; // Mantendo apenas useEstados pois é pequeno e útil carregar tudo

interface PoliticaComercialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  politica: PoliticaComercial | null;
}

const initialFormData: Partial<PoliticaComercial> = {
  NOME_POLITICA: '',
  DESCRICAO: '',
  ATIVO: 'S',
  PRIORIDADE: 0,
  ID_EMPRESA: undefined,
  ESCOPO_EMPRESAS: '',
  COND_COMERCIAIS: '',
  PREF_PARCEIRO_EMPRESA: 'N',
};

export default function PoliticaComercialModal({ isOpen, onClose, onSave, politica }: PoliticaComercialModalProps) {
  const [formData, setFormData] = useState<Partial<PoliticaComercial>>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [preSelectedItems, setPreSelectedItems] = useState<Record<string, MultiSelectOption[]>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Offline Data Hooks - Mantendo apenas estados para o dropdown simples
  const { estados } = useEstados();

  useEffect(() => {
    if (politica) {
      // Se ESCOPO_EMPRESAS estiver vazio, usa ID_EMPRESA (legado) para exibição
      const initialData = {
        ...politica,
        ESCOPO_EMPRESAS: politica.ESCOPO_EMPRESAS || (politica.ID_EMPRESA ? String(politica.ID_EMPRESA) : '')
      };
      setFormData(initialData);
      loadLabels(initialData);
    } else {
      setFormData(initialFormData);
      setPreSelectedItems({});
    }
  }, [politica, isOpen]);

  const loadLabels = async (p: PoliticaComercial) => {
    const newPreSelected: Record<string, MultiSelectOption[]> = {};

    const resolveIds = async (idsStr: string | undefined, fetcher: (ids: number[]) => Promise<any[]>, valueKey: string, labelKey: string, fieldName: string, prefix: string = '') => {
      if (!idsStr) return;
      const ids = idsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (ids.length === 0) return;

      try {
        const items = await fetcher(ids);
        newPreSelected[fieldName] = items.map(item => ({
          value: String(item[valueKey]),
          label: item[labelKey] || `${fieldName} ${item[valueKey]}`
        }));
      } catch (e) {
        console.error(`Error loading labels for ${fieldName}`, e);
      }
    };

    // Parallel fetching
    await Promise.all([
      resolveIds(p.ESCOPO_ESTADOS, OfflineDataService.getEstadosByIds, 'CODUF', 'DESCRICAO', 'ESCOPO_ESTADOS', ''),
      resolveIds(p.ESCOPO_CIDADES, OfflineDataService.getCidadesByIds, 'CODCID', 'NOMECID', 'ESCOPO_CIDADES'),
      resolveIds(p.ESCOPO_BAIRROS, OfflineDataService.getBairrosByIds, 'CODBAI', 'NOMEBAI', 'ESCOPO_BAIRROS'),

      resolveIds(p.ESCOPO_REGIOES, OfflineDataService.getRegioesByIds, 'CODREG', 'NOMEREG', 'ESCOPO_REGIOES'),
      resolveIds(p.SEG_EQUIPES, OfflineDataService.getEquipesByIds, 'CODEQUIPE', 'NOME', 'SEG_EQUIPES'),
      resolveIds(p.SEG_VENDEDORES, OfflineDataService.getVendedoresByIds, 'CODVEND', 'APELIDO', 'SEG_VENDEDORES'),
      resolveIds(p.SEG_CLIENTES_MANUAL, OfflineDataService.getClientesByIds, 'CODPARC', 'NOMEPARC', 'SEG_CLIENTES_MANUAL'),
      resolveIds(p.PROD_MARCAS, OfflineDataService.getMarcasByIds, 'CODIGO', 'DESCRICAO', 'PROD_MARCAS'),
      resolveIds(p.PROD_FAMILIAS, OfflineDataService.getGruposProdutosByIds, 'CODGRUPOPROD', 'DESCRGRUPOPROD', 'PROD_FAMILIAS'),
      resolveIds(String(p.PROD_PRODUTOS_MANUAL || ''), OfflineDataService.getProdutosByIds, 'CODPROD', 'DESCRPROD', 'PROD_PRODUTOS_MANUAL'),
      resolveIds(String(p.RESULT_NUTAB || ''), OfflineDataService.getTabelasPrecosByIds, 'NUTAB', 'NUTAB', 'RESULT_NUTAB'), // Result NUTAB label might need improvement
      // O RESULT_CODTAB também poderá ser resolvido depois se necessário
      resolveIds(String(p.ESCOPO_EMPRESAS || ''), OfflineDataService.getEmpresasByIds, 'CODEMP', 'NOMEFANTASIA', 'ESCOPO_EMPRESAS'),
      // For Tipos Negociacao, we need a resolve function. OfflineDataService didn't have getTiposNegociacaoByIds. 
      // I'll skip pre-loading labels for now or simpler: just load all and find. 
      // Or better: Implement resolve logic later if needed. For now let's just use the value.
      // Actually, AsyncMultiSelectInput needs preSelectedItems to show labels correctly on edit.
    ]);

    // Manual resolution for COND_COMERCIAIS since we don't have a specific bulk fetcher yet and list is small
    if (p.COND_COMERCIAIS) {
      const ids = p.COND_COMERCIAIS.split(',').map(s => s.trim());
      const allTypes = await OfflineDataService.getTiposNegociacao();
      const selectedTypes = allTypes.filter((t: any) => ids.includes(String(t.CODTIPVENDA)));
      newPreSelected['COND_COMERCIAIS'] = selectedTypes.map((t: any) => ({
        value: String(t.CODTIPVENDA),
        label: t.DESCRTIPVENDA || `Tipo ${t.CODTIPVENDA}`
      }));
    }

    if (newPreSelected['RESULT_NUTAB']) {
      newPreSelected['RESULT_NUTAB'] = newPreSelected['RESULT_NUTAB'].map(i => ({ ...i, label: `NUTAB ${i.value}` }));
    }

    if (p.RESULT_CODTAB) {
      newPreSelected['RESULT_CODTAB'] = [{ value: String(p.RESULT_CODTAB), label: `Tabela ${p.RESULT_CODTAB}` }];
    }

    setPreSelectedItems(newPreSelected);
  };

  // Logic to map saved CODUF (in formData) back to UF string for City Search
  const selectedCodUfs = formData.ESCOPO_ESTADOS ? formData.ESCOPO_ESTADOS.split(',') : [];
  const selectedUfs = estados
    .filter(e => selectedCodUfs.includes(String(e.CODUF)))
    .map(e => e.UF)
    .join(',');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: keyof PoliticaComercial, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetchers for AsyncMultiSelectInput
  const fetchEstados = async (search: string) => {
    const data = await OfflineDataService.getEstados(search);
    console.log('Dados dos estados presentes:', data);
    return data.map((e: any) => ({ value: String(e.CODUF), label: e.DESCRICAO || e.UF }));
  };

  const fetchCidades = useCallback(async (search: string) => {
    const data = await OfflineDataService.getCidades({ search });
    console.log('Dados das cidades presentes:', data);
    return data.map((c: any) => ({ value: String(c.CODCID), label: c.NOMECID }));
  }, []);

  const fetchBairros = useCallback(async (search: string) => {
    const data = await OfflineDataService.getBairros({ search });
    console.log('Dados dos bairros presentes:', data);
    return data.map((b: any) => ({ value: String(b.CODBAI), label: b.NOMEBAI }));
  }, []);



  const fetchRegioes = async (search: string) => {
    const data = await OfflineDataService.getRegioes(search);
    console.log('Dados das regiões presentes:', data);
    return data.map((r: any) => ({ value: String(r.CODREG), label: r.NOMEREG || `Região ${r.CODREG}` }));
  };

  const fetchEquipes = async (search: string) => {
    const data = await OfflineDataService.getEquipes(search);
    console.log('Dados das equipes presentes:', data);
    return data.map((e: any) => ({ value: String(e.CODEQUIPE), label: e.NOME || `Equipe ${e.CODEQUIPE}` }));
  };

  const fetchVendedores = async (search: string) => {
    const data = await OfflineDataService.getVendedores(search);
    console.log('Dados dos vendedores presentes:', data);
    return data.map((v: any) => ({ value: String(v.CODVEND), label: v.APELIDO || v.NOME || `Vend. ${v.CODVEND}` }));
  };

  const fetchClientes = async (search: string) => {
    const data = await OfflineDataService.getClientes(search);
    console.log('Dados dos clientes presentes:', data);
    return data.map((p: any) => ({ value: String(p.CODPARC), label: p.NOMEPARC || `Parceiro ${p.CODPARC}` }));
  };

  const fetchMarcas = async (search: string) => {
    const data = await OfflineDataService.getMarcas(search);
    console.log('Dados das marcas presentes:', data);
    return data.map((m: any) => ({ value: String(m.CODIGO), label: m.DESCRICAO || `Marca ${m.CODIGO}` }));
  };

  const fetchGrupos = async (search: string) => {
    const data = await OfflineDataService.getGruposProdutos(search);
    console.log('Dados dos grupos presentes:', data);
    return data.map((g: any) => ({ value: String(g.CODGRUPOPROD), label: g.DESCRGRUPOPROD || `Grupo ${g.CODGRUPOPROD}` }));
  };

  const fetchProdutos = async (search: string) => {
    const data = await OfflineDataService.getProdutos({ search });
    console.log('Dados dos produtos presentes:', data);
    return data.map((p: any) => ({ value: String(p.CODPROD), label: p.DESCRPROD || `Prod. ${p.CODPROD}` }));
  };

  const fetchTabelasPrecos = async (search: string) => {
    // Busca todas as tabelas distintas (CODTAB)
    const data = await OfflineDataService.getTabelasPrecos(search);

    // Extrai CODTABs únicos para apresentar na seleção
    const uniqueCodTabs = Array.from(new Set(data.map((t: any) => t.CODTAB))).filter(Boolean);

    return uniqueCodTabs.map(codTab => {
      // Pega a primeira para ter uma descrição se houver
      const t = data.find((x: any) => x.CODTAB === codTab);
      return { value: String(codTab), label: `Tabela ${codTab} ${t?.DESCRICAO ? '- ' + t.DESCRICAO : ''}` }
    });
  };

  const fetchNuTabs = async (search: string) => {
    // Busca os NUTABs correspondentes ao CODTAB selecionado
    const data = await OfflineDataService.getTabelasPrecos();

    let filteredData = data;

    if (formData.RESULT_CODTAB) {
      filteredData = data.filter((t: any) => String(t.CODTAB) === String(formData.RESULT_CODTAB));
    }

    if (search) {
      filteredData = filteredData.filter((t: any) => String(t.NUTAB).includes(search));
    }

    return filteredData.map((t: any) => ({ value: String(t.NUTAB), label: `NUTAB ${t.NUTAB}` }));
  };

  const fetchEmpresas = async (search: string) => {
    const data = await OfflineDataService.getEmpresas(search);
    console.log('Dados das empresas presentes:', data);
    return data.map((e: any) => ({ value: String(e.CODEMP), label: e.NOMEFANTASIA || `Empresa ${e.CODEMP}` }));
  };

  const fetchTiposNegociacao = async (search: string) => {
    // Tipos de Negociação usually is a small list, but we can filter if needed.
    // OfflineDataService.getTiposNegociacao() doesn't currently support search param in the method signature I saw earlier? 
    // Let's check if I need to update OfflineDataService or if I can filter client-side.
    // The previous view of OfflineDataService.getTiposNegociacao showed no args.
    // I'll grab all and filter here for now, or assume AsyncMultiSelectInput handles searching if I pass a filtered list? 
    // AsyncMultiSelectInput expects a promise.
    const data = await OfflineDataService.getTiposNegociacao();
    const searchLower = search.toLowerCase();
    const filtered = data.filter((t: any) =>
      String(t.CODTIPVENDA).includes(search) ||
      (t.DESCRTIPVENDA && t.DESCRTIPVENDA.toLowerCase().includes(searchLower))
    );
    console.log('Tipos Negociacao filtered:', filtered);
    return filtered.map((t: any) => ({ value: String(t.CODTIPVENDA), label: t.DESCRTIPVENDA || `Tipo ${t.CODTIPVENDA}` }));
  };




  const handleDelete = async () => {
    console.log('Botão Excluir clicado. Política:', politica);
    if (!politica?.ID_POLITICA) {
      console.warn('ID_POLITICA não encontrado', politica);
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta política? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/politicas?id=${politica.ID_POLITICA}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir a política');
      }

      toast.success('Política excluída com sucesso!');

      // SYNC LOCAL DB
      console.log('🔄 [Sync] Removendo política do IndexedDB:', politica.ID_POLITICA);
      await OfflineDataService.deletePolitica(politica.ID_POLITICA);

      onSave(); // Recarrega a lista
      onClose(); // Fecha o modal
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir política');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.NOME_POLITICA) {
      toast.error('O nome da política é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/politicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar a política');
      }

      const data = await response.json();

      toast.success('Política salva com sucesso!');

      // SYNC LOCAL DB
      if (data.politica) {
        console.log('🔄 [Sync] Salvando política no IndexedDB:', data.politica);
        await OfflineDataService.savePolitica(data.politica);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none sm:max-w-4xl sm:h-[90vh] sm:w-full flex flex-col p-0 rounded-none sm:rounded-2xl border-[#F2F2F2] overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-[#F2F2F2] bg-slate-50/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#1E5128]">{politica ? 'Editar Política Comercial' : 'Criar Nova Política Comercial'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="geral" className="h-full flex flex-col">
            <div className="w-full px-0 sm:px-6 pt-4 relative flex items-center gap-2 border-b border-[#F2F2F2]/50 pb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 sm:hidden text-slate-400"
                onClick={() => scrollTabs('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div
                ref={scrollContainerRef}
                className="w-full overflow-x-auto pb-2 scrollbar-hide"
              >
                <TabsList className="flex w-max min-w-full justify-start px-4 sm:px-0 bg-transparent h-10 p-0">
                  <TabsTrigger value="geral" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 mr-2"><FileText className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
                  <TabsTrigger value="local" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 mr-2"><MapPin className="w-4 h-4 mr-2" /> Local</TabsTrigger>
                  <TabsTrigger value="org" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 mr-2"><Users className="w-4 h-4 mr-2" /> Segmentação</TabsTrigger>
                  <TabsTrigger value="prod" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 mr-2"><Package className="w-4 h-4 mr-2" /> Produtos</TabsTrigger>
                  <TabsTrigger value="pref" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 mr-2"><Settings2 className="w-4 h-4 mr-2" /> Preferências</TabsTrigger>
                  <TabsTrigger value="result" className="text-xs sm:text-sm font-bold text-slate-500 rounded-xl transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2"><Settings className="w-4 h-4 mr-2" /> Resultado</TabsTrigger>
                </TabsList>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 sm:hidden text-slate-400"
                onClick={() => scrollTabs('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 md:p-4">
                <TabsContent value="geral" className="space-y-6 m-0 pt-4">
                  <div className="space-y-5">
                    <div className="grid gap-2">
                      <Label htmlFor="NOME_POLITICA" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Política *</Label>
                      <Input
                        id="NOME_POLITICA"
                        name="NOME_POLITICA"
                        value={formData.NOME_POLITICA}
                        onChange={handleChange}
                        placeholder="Ex: Política de Varejo - SP"
                        className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="ID_EMPRESA" className={cn("text-xs font-bold text-slate-500 uppercase tracking-wider", formData.PREF_PARCEIRO_EMPRESA === 'S' && "opacity-50")}>Empresa {formData.PREF_PARCEIRO_EMPRESA === 'S' && "(Dinâmico)"}</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchEmpresas}
                        value={formData.ESCOPO_EMPRESAS || ''}
                        onSelect={(val) => {
                          console.log('Empresa Selecionada:', val);
                          setFormData(prev => ({ ...prev, ESCOPO_EMPRESAS: val }));
                        }}
                        preSelectedItems={preSelectedItems['ESCOPO_EMPRESAS']}
                        placeholder={formData.PREF_PARCEIRO_EMPRESA === 'S' ? "Resolvido por Parceiro/Empresa" : "Selecione a empresa"}
                        emptyText="Nenhuma empresa encontrada"
                        disabled={formData.PREF_PARCEIRO_EMPRESA === 'S'}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="COND_COMERCIAIS" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condição Comercial</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchTiposNegociacao}
                        value={formData.COND_COMERCIAIS || ''}
                        onSelect={(val) => {
                          console.log('Condição Comercial Selecionada:', val);
                          setFormData(prev => ({ ...prev, COND_COMERCIAIS: val }));
                        }}
                        preSelectedItems={preSelectedItems['COND_COMERCIAIS']}
                        placeholder="Selecione as condições comerciais"
                        emptyText="Nenhuma condição comercial encontrada"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="DESCRICAO" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</Label>
                      <Textarea
                        id="DESCRICAO"
                        name="DESCRICAO"
                        value={formData.DESCRICAO || ''}
                        onChange={handleChange}
                        placeholder="Descreva o objetivo desta política"
                        rows={4}
                        className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] resize-none"
                      />
                    </div>

                    <div className="grid gap-2 w-1/3">
                      <Label htmlFor="PRIORIDADE" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</Label>
                      <Input
                        id="PRIORIDADE"
                        name="PRIORIDADE"
                        type="number"
                        value={formData.PRIORIDADE}
                        onChange={handleChange}
                        placeholder="0"
                        className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10"
                      />
                      <p className="text-xs text-slate-400 font-medium">Maior número = maior prioridade na aplicação.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="local" className="space-y-6 m-0 pt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estados (UF)</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchEstados}
                        value={formData.ESCOPO_ESTADOS || ''}
                        onSelect={(val) => {
                          console.log('UF Selecionada:', val);
                          handleSelectChange('ESCOPO_ESTADOS', val);
                        }}
                        preSelectedItems={preSelectedItems['ESCOPO_ESTADOS']}
                        placeholder="Selecione Estados"
                        emptyText="Nenhum estado encontrado"
                      />
                      <p className="text-xs text-slate-400 font-medium">Estados de atuação.</p>
                    </div>

                  </div>

                  <Separator className="bg-[#F2F2F2]" />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidades</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchCidades}
                        value={formData.ESCOPO_CIDADES || ''}
                        onSelect={(val) => {
                          console.log('Cidades Selecionadas:', val);
                          handleSelectChange('ESCOPO_CIDADES', val);
                        }}
                        preSelectedItems={preSelectedItems['ESCOPO_CIDADES']}
                        placeholder="Selecione Cidades"
                        emptyText="Nenhuma cidade encontrada"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bairros</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchBairros}
                        value={formData.ESCOPO_BAIRROS || ''}
                        onSelect={(val) => {
                          console.log('Bairros Selecionados:', val);
                          handleSelectChange('ESCOPO_BAIRROS', val);
                        }}
                        preSelectedItems={preSelectedItems['ESCOPO_BAIRROS']}
                        placeholder="Selecione Bairros"
                        emptyText="Nenhum bairro encontrado"
                      />
                    </div>
                  </div>

                  <Separator className="bg-[#F2F2F2]" />

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Região</Label>
                    <AsyncMultiSelectInput
                      fetcher={fetchRegioes}
                      value={formData.ESCOPO_REGIOES || ''}
                      onSelect={(val) => {
                        console.log('Regiões Selecionadas:', val);
                        handleSelectChange('ESCOPO_REGIOES', val);
                      }}
                      preSelectedItems={preSelectedItems['ESCOPO_REGIOES']}
                      placeholder="Selecione Regiões"
                      emptyText="Nenhuma região encontrada"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="org" className="space-y-6 m-0 pt-4">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipes</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchEquipes}
                        value={formData.SEG_EQUIPES || ''}
                        onSelect={(val) => {
                          console.log('Equipes Selecionadas:', val);
                          handleSelectChange('SEG_EQUIPES', val);
                        }}
                        preSelectedItems={preSelectedItems['SEG_EQUIPES']}
                        placeholder="Selecione Equipes"
                        emptyText="Nenhuma equipe encontrada"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendedores</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchVendedores}
                        value={formData.SEG_VENDEDORES || ''}
                        onSelect={(val) => {
                          console.log('Vendedores Selecionados:', val);
                          handleSelectChange('SEG_VENDEDORES', val);
                        }}
                        preSelectedItems={preSelectedItems['SEG_VENDEDORES']}
                        placeholder="Selecione Vendedores"
                        emptyText="Nenhum vendedor encontrado"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={cn("text-xs font-bold text-slate-500 uppercase tracking-wider", formData.PREF_PARCEIRO_EMPRESA === 'S' && "opacity-50")}>Clientes {formData.PREF_PARCEIRO_EMPRESA === 'S' && "(Dinâmico)"}</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchClientes}
                        value={formData.SEG_CLIENTES_MANUAL || ''}
                        onSelect={(val) => {
                          console.log('Clientes Selecionados:', val);
                          handleSelectChange('SEG_CLIENTES_MANUAL', val);
                        }}
                        preSelectedItems={preSelectedItems['SEG_CLIENTES_MANUAL']}
                        placeholder={formData.PREF_PARCEIRO_EMPRESA === 'S' ? "Resolvido por Parceiro/Empresa" : "Selecione Clientes"}
                        emptyText="Nenhum cliente encontrado"
                        disabled={formData.PREF_PARCEIRO_EMPRESA === 'S'}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pref" className="space-y-6 m-0 pt-4">
                  <div className="space-y-6 px-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-[#1E5128] flex items-center gap-2">
                            <Users className="w-4 h-4" /> Parceiro/Empresa
                          </h4>
                          <p className="text-xs text-slate-500 max-w-md">
                            Quando ativado, os campos de Cliente, Empresa e Tabela serão determinados automaticamente pela tabela de ICMS sincronizada.
                          </p>
                        </div>
                        <div
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-within:ring-offset-2",
                            formData.PREF_PARCEIRO_EMPRESA === 'S' ? "bg-[#76BA1B]" : "bg-slate-200"
                          )}
                          onClick={() => setFormData(prev => ({ ...prev, PREF_PARCEIRO_EMPRESA: prev.PREF_PARCEIRO_EMPRESA === 'S' ? 'N' : 'S' }))}
                        >
                          <span
                            className={cn(
                              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                              formData.PREF_PARCEIRO_EMPRESA === 'S' ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {formData.PREF_PARCEIRO_EMPRESA === 'S' && (
                      <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex gap-3 text-orange-800">
                        <Settings2 className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold">Modo Dinâmico Ativado</p>
                          <p className="text-xs">Os campos de segmentação e resultado foram bloqueados para respeitar a resolução dinâmica via banco de dados.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="prod" className="space-y-6 m-0 pt-4">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marcas</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchMarcas}
                        value={formData.PROD_MARCAS || ''}
                        onSelect={(val) => {
                          console.log('Marcas Selecionadas:', val);
                          handleSelectChange('PROD_MARCAS', val);
                        }}
                        preSelectedItems={preSelectedItems['PROD_MARCAS']}
                        placeholder="Selecione Marcas"
                        emptyText="Nenhuma marca encontrada"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grupos de Produtos</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchGrupos}
                        value={formData.PROD_FAMILIAS || ''}
                        onSelect={(val) => {
                          console.log('Grupos Selecionados:', val);
                          handleSelectChange('PROD_FAMILIAS', val);
                        }}
                        preSelectedItems={preSelectedItems['PROD_FAMILIAS']}
                        placeholder="Selecione Grupos"
                        emptyText="Nenhum grupo encontrado"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Produtos</Label>
                      <AsyncMultiSelectInput
                        fetcher={fetchProdutos}
                        value={formData.PROD_PRODUTOS_MANUAL || ''}
                        onSelect={(val) => {
                          console.log('Produtos Selecionados:', val);
                          handleSelectChange('PROD_PRODUTOS_MANUAL', val);
                        }}
                        preSelectedItems={preSelectedItems['PROD_PRODUTOS_MANUAL']}
                        placeholder="Selecione Produtos"
                        emptyText="Nenhum produto encontrado"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="result" className="space-y-6 m-0 pt-4">
                  <div className="space-y-2">
                    <Label className={cn("text-xs font-bold text-slate-500 uppercase tracking-wider", formData.PREF_PARCEIRO_EMPRESA === 'S' && "opacity-50")}>Tabela (CODTAB) {formData.PREF_PARCEIRO_EMPRESA === 'S' && "(Dinâmico)"}</Label>
                    <AsyncMultiSelectInput
                      fetcher={fetchTabelasPrecos}
                      value={formData.RESULT_CODTAB ? String(formData.RESULT_CODTAB) : ''}
                      onSelect={(val) => {
                        console.log('Tabela Selecionada (CODTAB):', val);
                        handleSelectChange('RESULT_CODTAB', val as any);
                      }}
                      preSelectedItems={preSelectedItems['RESULT_CODTAB']}
                      placeholder={formData.PREF_PARCEIRO_EMPRESA === 'S' ? "Resolvido por Parceiro/Empresa" : "Selecione a Tabela"}
                      emptyText="Nenhuma tabela encontrada"
                      multi={false}
                      disabled={formData.PREF_PARCEIRO_EMPRESA === 'S'}
                    />
                    <p className="text-xs text-slate-400 font-medium pt-1">
                      {formData.PREF_PARCEIRO_EMPRESA === 'S' 
                        ? "A tabela será identificada automaticamente durante a venda." 
                        : "A tabela que deverá ser aplicada e que aparecerá no produto."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[#F2F2F2]">
                    <div className="space-y-2">
                      <Label htmlFor="RESULT_PERCDESCONTO_MAX" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto Máximo (%)</Label>
                      <Input
                        id="RESULT_PERCDESCONTO_MAX"
                        name="RESULT_PERCDESCONTO_MAX"
                        type="number"
                        value={formData.RESULT_PERCDESCONTO_MAX || ''}
                        onChange={handleChange}
                        placeholder="EX: 10.00"
                        className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="RESULT_PERCACIMA_MAX" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acréscimo Máximo (%)</Label>
                      <Input
                        id="RESULT_PERCACIMA_MAX"
                        name="RESULT_PERCACIMA_MAX"
                        type="number"
                        value={formData.RESULT_PERCACIMA_MAX || ''}
                        onChange={handleChange}
                        placeholder="EX: 5.00"
                        className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 font-bold"
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#F2F2F2] bg-slate-50/50 flex justify-between sm:rounded-b-2xl">
          <div>
            {politica && (
              <Button variant="destructive" className="rounded-xl font-bold font-bold h-10 px-6" onClick={handleDelete} disabled={isSaving} type="button">
                Excluir (DEL)
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl border-[#F2F2F2] hover:bg-slate-100 font-bold text-slate-600 h-10 px-6" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button className="bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md h-10 px-6 transition-all" onClick={handleSave} disabled={isSaving} type="button">
              {isSaving ? 'Salvando...' : 'Salvar Política'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
