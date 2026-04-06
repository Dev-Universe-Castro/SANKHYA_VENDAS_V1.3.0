import { db } from '@/lib/client-db';
import { toast } from 'sonner';

export interface PedidoPendenteDetalhado {
  id?: number;
  payload: any;
  synced: number;
  createdAt: number;
  tentativas: number;
  ultimaTentativa?: number;
  status: 'PENDENTE' | 'SINCRONIZANDO' | 'SUCESSO' | 'ERRO';
  erro?: any;
  nunotaGerado?: string;
  ambiente: 'OFFLINE' | 'ONLINE';
  statusAprovacao?: 'NORMAL' | 'PENDENTE' | 'APROVADO' | 'REJEITADO'; // Novo campo
  violacoes?: string[]; // Novo campo
  justificativa?: string; // Novo campo
  idAprovador?: number; // Novo campo
}

export const PedidoSyncService = {
  async triggerBackgroundSync() {
    // Método stub para compatibilidade
    console.log('🔄 Background sync trigger (stub)')
  },

  // Adicionar método removerPedido
  async removerPedido(id: number) {
    await db.pedidosPendentes.delete(id);
    console.log(`✅ Pedido ${id} removido da fila`);
  },

  // 1. Tenta salvar online, se falhar, salva offline
  async salvarPedido(pedido: any, origem: 'LEAD' | 'RAPIDO' | 'OFFLINE' = 'RAPIDO') {
    const isOnline = navigator.onLine;
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (isOnline) {
      try {
        // A origem já é passada como parâmetro, então não precisamos mais deduzir aqui.
        // const origem = pedido.CODLEAD ? 'LEAD' : 'RAPIDO';

        // Tenta enviar para a API oficial
        const response = await fetch('/api/sankhya/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedido)
        });

        const result = await response.json();

        // Tratamento para erro 400 com NullPointerException (falha no servidor Sankhya que não gerou nota)
        const isNullPointer = result.error?.details === "java.lang.NullPointerException" ||
          (result.error?.message === "Ocorreu algum erro inesperado!" && result.error?.details?.includes("NullPointerException"));

        if (!response.ok || isNullPointer) {
          // Criar objeto de erro estruturado
          const erroObj = {
            mensagem: result.error?.message || result.error || 'Erro desconhecido',
            details: result.error?.details,
            statusCode: response.status,
            timestamp: new Date().toISOString()
          };

          // QUALQUER erro 4xx ou 5xx = registrar como ERRO e NÃO salvar offline
          console.error('❌ Erro na API - registrando como ERRO:', result.error);

          // Registrar como ERRO no controle FDV
          await fetch('/api/pedidos-fdv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origem, // Usar a origem passada como parâmetro
              codLead: pedido.CODLEAD,
              corpoJson: pedido,
              status: 'ERRO',
              erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
              tentativas: 1
            })
          }).catch(err => console.error('Erro ao registrar log FDV:', err));

          // Mostrar erro na tela
          toast.error('❌ Erro ao criar pedido', {
            description: result.error || 'Verifique os dados e tente novamente',
            duration: 8000,
            position: 'top-center'
          });

          // Retornar com erro (não salvar offline)
          return {
            success: false,
            error: result.error || erroObj.mensagem || 'Erro ao processar pedido',
            validationError: true
          };
        }

        // Registrar sucesso no controle FDV
        const nunota = result.nunota || result.NUNOTA;
        await fetch('/api/pedidos-fdv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origem, // Usar a origem passada como parâmetro
            codLead: pedido.CODLEAD,
            corpoJson: pedido,
            status: 'SUCESSO',
            nunota,
            tentativas: 1
          })
        }).catch(err => console.error('Erro ao registrar log FDV:', err));

        // Mostrar resultado do cálculo de impostos (se houver)
        if (result.impostos) {
          if (result.impostos.success) {
            console.log('📊 Cálculo de impostos incluído:', result.impostos);
            toast.success('✅ Pedido criado com sucesso!', {
              description: `NUNOTA: ${nunota} | Impostos calculados (${result.impostos.regraAplicada})`,
              duration: 6000,
              position: 'top-center'
            });
          } else {
            console.warn('⚠️ Cálculo de impostos falhou:', result.impostos.error);
            toast.success('✅ Pedido criado com sucesso!', {
              description: `NUNOTA: ${nunota} (Aviso: cálculo de impostos falhou)`,
              duration: 6000,
              position: 'top-center'
            });
          }
        } else {
          toast.success('✅ Pedido criado com sucesso!', {
            description: `NUNOTA: ${nunota}`,
            duration: 5000,
            position: 'top-center'
          });
        }

        return { success: true, nunota, impostos: result.impostos };

      } catch (error: any) {
        console.error('❌ Erro ao criar pedido ONLINE:', error);

        // Se erro de rede, salvar offline
        if (!navigator.onLine || error.message?.includes('fetch')) {
          console.log('💾 Salvando pedido OFFLINE na fila local...');
          await this.salvarOffline(pedido, origem); // Passar a origem aqui
          toast.warning('📱 Sem conexão - Pedido salvo offline', {
            description: 'Será sincronizado automaticamente quando houver conexão',
            duration: 6000,
            position: 'top-center'
          });
          return { success: true, offline: true };
        }

        // Outros erros
        toast.error('❌ Erro ao criar pedido', {
          description: error.message || 'Tente novamente',
          duration: 5000,
          position: 'top-center'
        });
        return { success: false, error: error.message };
      }
    } else {
      // Modo OFFLINE: salvar na fila local
      console.log('📴 Modo OFFLINE - salvando na fila local');
      await this.salvarOffline(pedido, origem); // Passar a origem aqui
      toast.warning('📱 Modo Offline', {
        description: 'Pedido salvo localmente e será sincronizado quando houver conexão',
        duration: 6000,
        position: 'top-center'
      });
      return { success: true, offline: true };
    }
  },

  // Salvar pedido na fila local (IndexedDB)
  async salvarOffline(
    pedido: any,
    origem: 'LEAD' | 'RAPIDO' | 'OFFLINE' = 'RAPIDO',
    aprovacao?: {
      status: 'NORMAL' | 'PENDENTE',
      violacoes: string[],
      justificativa?: string,
      idAprovador?: number
    }
  ) {
    const pedidoPendente: PedidoPendenteDetalhado = {
      payload: pedido,
      synced: 0,
      createdAt: Date.now(),
      tentativas: 0,
      status: 'PENDENTE',
      ambiente: 'OFFLINE',
      statusAprovacao: aprovacao?.status || 'NORMAL',
      violacoes: aprovacao?.violacoes || [],
      justificativa: aprovacao?.justificativa,
      idAprovador: aprovacao?.idAprovador
    };

    await db.pedidosPendentes.add(pedidoPendente);
    console.log('✅ Pedido salvo na fila offline', aprovacao?.status === 'PENDENTE' ? '(Aguardando Aprovação)' : '');
  },

  // Registrar solicitação de aprovação online
  async registrarAprovacaoOnline(pedido: any, violacoes: string[], justificativa?: string, idAprovador?: number) {
    try {
      const isOnline = navigator.onLine;
      if (!isOnline) {
        throw new Error('Você precisa estar online para enviar uma solicitação de aprovação.');
      }

      const response = await fetch('/api/pedidos-fdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem: pedido.CODLEAD ? 'LEAD' : 'RAPIDO',
          codLead: pedido.CODLEAD,
          corpoJson: pedido,
          status: 'PENDENTE',
          violacoes,
          justificativa,
          idAprovador
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao registrar solicitação online');
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erro ao registrar aprovação online:', error);
      throw error;
    }
  },

  // Processar fila de pedidos pendentes (SOMENTE quando online)
  async processarFila() {
    if (!navigator.onLine) {
      console.warn('⚠️ Sem conexão - não é possível sincronizar');
      return;
    }

    // Sincronizar primeiro as solicitações de aprovação que foram feitas offline
    await this.sincronizarSolicitacoesAprovacao();

    const pedidosPendentes = await db.pedidosPendentes
      .where('synced')
      .equals(0)
      .and(p => p.statusAprovacao !== 'PENDENTE') // Ignorar pedidos pendentes de aprovação
      .toArray();

    console.log(`🔄 Sincronizando ${pedidosPendentes.length} pedidos...`);

    for (const pedido of pedidosPendentes) {
      try {
        // Atualizar status para SINCRONIZANDO
        await db.pedidosPendentes.update(pedido.id!, {
          status: 'SINCRONIZANDO',
          tentativas: (pedido.tentativas || 0) + 1,
          ultimaTentativa: Date.now()
        });

        // Tentar enviar para API
        const response = await fetch('/api/sankhya/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedido.payload)
        });

        const result = await response.json();

        // Tratamento para erro 400 com NullPointerException (falha no servidor Sankhya que não gerou nota)
        const isNullPointer = result.error?.details === "java.lang.NullPointerException" ||
          (result.error?.message === "Ocorreu algum erro inesperado!" && result.error?.details?.includes("NullPointerException"));

        if (!response.ok || isNullPointer) {
          // ERRO: Registrar na tabela AD_PEDIDOS_FDV com origem OFFLINE e status ERRO
          const erroObj = {
            mensagem: result.error?.message || result.error || 'Erro desconhecido',
            details: result.error?.details,
            statusCode: response.status,
            timestamp: new Date().toISOString()
          };

          // Determinar a origem correta para o log FDV
          const origemLog = pedido.payload.CODLEAD ? 'LEAD' : 'OFFLINE'; // Se CODLEAD existe, é LEAD, senão é OFFLINE

          await fetch('/api/pedidos-fdv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origem: origemLog, // Usar origem determinada
              codLead: pedido.payload.CODLEAD,
              corpoJson: pedido.payload,
              status: 'ERRO',
              erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
              tentativas: pedido.tentativas || 1
            })
          }).catch(err => console.error('Erro ao registrar log FDV:', err));

          // Marcar como ERRO na fila local
          await db.pedidosPendentes.update(pedido.id!, {
            status: 'ERRO',
            erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
            synced: 1
          });

          toast.error('❌ Erro ao sincronizar pedido', {
            description: result.error || 'Erro desconhecido',
            duration: 8000,
            position: 'top-center'
          });
          continue;
        }

        // SUCESSO: Registrar na tabela AD_PEDIDOS_FDV com origem OFFLINE e status SUCESSO
        const nunota = result.nunota || result.NUNOTA;

        // Determinar a origem correta para o log FDV
        const origemLog = pedido.payload.CODLEAD ? 'LEAD' : 'OFFLINE'; // Se CODLEAD existe, é LEAD, senão é OFFLINE

        await fetch('/api/pedidos-fdv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origem: origemLog, // Usar origem determinada
            codLead: pedido.payload.CODLEAD,
            corpoJson: pedido.payload,
            status: 'SUCESSO',
            nunota,
            tentativas: pedido.tentativas || 1
          })
        }).catch(err => console.error('Erro ao registrar log FDV:', err));

        // Marcar como sincronizado na fila local
        await db.pedidosPendentes.update(pedido.id!, {
          synced: 1,
          status: 'SUCESSO',
          nunotaGerado: nunota?.toString()
        });

        toast.success('✅ Pedido sincronizado com sucesso!', {
          description: `NUNOTA: ${nunota}`,
          duration: 5000,
          position: 'top-center'
        });

      } catch (error: any) {
        console.error('❌ Erro ao sincronizar pedido:', error);

        // Registrar erro na tabela AD_PEDIDOS_FDV
        const erroObj = {
          mensagem: error.message || 'Erro de conexão',
          timestamp: new Date().toISOString()
        };

        // Determinar a origem correta para o log FDV
        const origemLog = pedido.payload.CODLEAD ? 'LEAD' : 'OFFLINE'; // Se CODLEAD existe, é LEAD, senão é OFFLINE

        await fetch('/api/pedidos-fdv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origem: origemLog, // Usar origem determinada
            codLead: pedido.payload.CODLEAD,
            corpoJson: pedido.payload,
            status: 'ERRO',
            erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
            tentativas: pedido.tentativas || 1
          })
        }).catch(err => console.error('Erro ao registrar log FDV:', err));

        // Marcar como ERRO na fila local
        await db.pedidosPendentes.update(pedido.id!, {
          status: 'ERRO',
          erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
          synced: 1
        });
      }
    }

    console.log('✅ Sincronização concluída');
  },

  // Sincronizar um pedido individual (ex: após aprovação manual)
  async sincronizarPedidoIndividual(id: number) {
    const pedido = await db.pedidosPendentes.get(id);
    if (!pedido) {
      toast.error('Pedido não encontrado na fila local.');
      return { success: false, error: 'Pedido não encontrado' };
    }

    if (!navigator.onLine) {
      toast.error('Sem conexão com a internet para sincronizar.');
      return { success: false, error: 'Offline' };
    }

    // Se estiver pendente de aprovação, não sincronizar
    if (pedido.statusAprovacao === 'PENDENTE') {
      toast.error('Este pedido ainda aguarda aprovação.');
      return { success: false, error: 'Aguardando aprovação' };
    }

    try {
      // Atualizar status para SINCRONIZANDO
      await db.pedidosPendentes.update(id, {
        status: 'SINCRONIZANDO',
        tentativas: (pedido.tentativas || 0) + 1,
        ultimaTentativa: Date.now()
      });

      console.log(`🚀 Sincronizando pedido individual ${id}...`);

      const response = await fetch('/api/sankhya/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido.payload)
      });

      const result = await response.json();

      const isNullPointer = result.error?.details === "java.lang.NullPointerException" ||
        (result.error?.message === "Ocorreu algum erro inesperado!" && result.error?.details?.includes("NullPointerException"));

      if (!response.ok || isNullPointer) {
        const erroObj = {
          mensagem: result.error?.message || result.error || 'Erro desconhecido',
          details: result.error?.details,
          statusCode: response.status,
          timestamp: new Date().toISOString()
        };

        const origemLog = pedido.payload.CODLEAD ? 'LEAD' : 'OFFLINE';

        await fetch('/api/pedidos-fdv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origem: origemLog,
            codLead: pedido.payload.CODLEAD,
            corpoJson: pedido.payload,
            status: 'ERRO',
            erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
            tentativas: pedido.tentativas || 1
          })
        }).catch(err => console.error('Erro ao registrar log FDV:', err));

        await db.pedidosPendentes.update(id, {
          status: 'ERRO',
          erro: typeof erroObj === 'string' ? erroObj : JSON.stringify(erroObj, null, 2),
          synced: 1
        });

        toast.error('❌ Erro ao sincronizar pedido', {
          description: result.error || 'Erro desconhecido',
          duration: 8000
        });
        return { success: false, error: result.error };
      }

      const nunota = result.nunota || result.NUNOTA;
      const origemLog = pedido.payload.CODLEAD ? 'LEAD' : 'OFFLINE';

      await fetch('/api/pedidos-fdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem: origemLog,
          codLead: pedido.payload.CODLEAD,
          corpoJson: pedido.payload,
          status: 'SUCESSO',
          nunota,
          tentativas: pedido.tentativas || 1
        })
      }).catch(err => console.error('Erro ao registrar log FDV:', err));

      await db.pedidosPendentes.update(id, {
        synced: 1,
        status: 'SUCESSO',
        nunotaGerado: nunota?.toString()
      });

      toast.success('✅ Pedido sincronizado com sucesso!', {
        description: `NUNOTA: ${nunota}`,
        duration: 5000
      });

      return { success: true, nunota };

    } catch (error: any) {
      console.error('❌ Erro ao sincronizar pedido:', error);

      await db.pedidosPendentes.update(id, {
        status: 'ERRO',
        erro: error.message || 'Erro de conexão',
        synced: 1
      });

      toast.error('Erro de conexão ao sincronizar');
      return { success: false, error: error.message };
    }
  },

  // Buscar quantidade de pedidos pendentes
  async getPendentesCount() {
    try {
      return await db.pedidosPendentes.where('synced').equals(0).count();
    } catch (error) {
      console.error('Erro ao buscar contagem de pendentes:', error);
      return 0;
    }
  },

  // Buscar pedidos pendentes
  async getPedidosPendentes(): Promise<PedidoPendenteDetalhado[]> {
    return await db.pedidosPendentes.toArray();
  },

  // Retentar um pedido específico
  async retentarPedido(id: number) {
    const pedido = await db.pedidosPendentes.get(id);
    if (!pedido) return;

    await db.pedidosPendentes.update(id, {
      synced: 0,
      status: 'PENDENTE',
      tentativas: 0,
      erro: undefined
    });

    await this.processarFila();
  },

  // Sincronizar solicitações de aprovação feitas offline
  async sincronizarSolicitacoesAprovacao() {
    const pedidosComAprovacaoPendente = await db.pedidosPendentes
      .where('statusAprovacao')
      .equals('PENDENTE')
      .and(p => p.synced === 0)
      .toArray();

    if (pedidosComAprovacaoPendente.length === 0) return;

    console.log(`🔄 Sincronizando ${pedidosComAprovacaoPendente.length} solicitações de aprovação...`);

    for (const pedido of pedidosComAprovacaoPendente) {
      try {
        await this.registrarAprovacaoOnline(
          pedido.payload,
          pedido.violacoes || [],
          pedido.justificativa,
          pedido.idAprovador
        );

        // Se conseguiu registrar online, marcar como sincronizado (aprovado ou pendente de aprovação online)
        await db.pedidosPendentes.update(pedido.id!, {
          statusAprovacao: 'NORMAL',
          synced: 1,
          status: 'SUCESSO'
        });

        console.log(`✅ Solicitação para pedido local ${pedido.id} enviada com sucesso.`);
      } catch (error) {
        console.error(`❌ Falha ao sincronizar solicitação ${pedido.id}:`, error);
      }
    }
  },

  // Limpar pedidos sincronizados
  async limparSincronizados() {
    await db.pedidosPendentes.where('synced').equals(1).delete();
    console.log('✅ Pedidos sincronizados removidos da fila');
  }
};