import { db } from '@/lib/client-db';
import { toast } from 'sonner';

export interface VisitaPendenteOffline {
  id?: number;
  action: 'checkin' | 'checkout' | 'cancelar';
  codVisita?: number;
  localVisitaId?: string;
  codRota?: number;
  codParc: number;
  codVend: number;
  latitude?: number;
  longitude?: number;
  observacao?: string;
  pedidoGerado?: boolean;
  nunota?: number;
  vlrTotal?: number;
  horaCheckin?: string;
  horaCheckout?: string;
  synced: number;
  createdAt: number;
  tentativas: number;
  ultimaTentativa?: number;
  status: 'PENDENTE' | 'SINCRONIZANDO' | 'SUCESSO' | 'ERRO';
  erro?: string;
}

export interface RotaOffline {
  CODROTA: number;
  ID_EMPRESA: number;
  DESCRICAO: string;
  CODVEND: number;
  NOMEVENDEDOR?: string;
  TIPO_RECORRENCIA: string;
  DIAS_SEMANA?: string;
  INTERVALO_DIAS?: number;
  DATA_INICIO?: string;
  DATA_FIM?: string;
  ATIVO: string;
}

export interface RotaParceiroOffline {
  id?: number;
  CODROTA: number;
  CODPARC: number;
  NOMEPARC?: string;
  ORDEM: number;
  LATITUDE?: number;
  LONGITUDE?: number;
  TEMPO_ESTIMADO?: number;
  ENDERECO?: string;
  CIDADE?: string;
  UF?: string;
}

export interface VisitaOffline {
  CODVISITA: number;
  localId?: string;
  CODROTA?: number;
  CODPARC: number;
  CODVEND: number;
  DATA_VISITA: string;
  HORA_CHECKIN?: string;
  HORA_CHECKOUT?: string;
  LAT_CHECKIN?: number;
  LNG_CHECKIN?: number;
  LAT_CHECKOUT?: number;
  LNG_CHECKOUT?: number;
  STATUS: string;
  OBSERVACAO?: string;
  PEDIDO_GERADO: string;
  NUNOTA?: number;
  VLRTOTAL?: number;
  NOMEPARC?: string;
  NOMEVENDEDOR?: string;
  NOME_ROTA?: string;
  offline?: boolean;
}

export const RotasSyncService = {
  async sincronizarRotas(): Promise<void> {
    if (!navigator.onLine) {
      console.log('📴 Offline - usando rotas do cache local');
      return;
    }

    try {
      const response = await fetch('/api/rotas');
      if (!response.ok) throw new Error('Erro ao buscar rotas');
      
      const rotas = await response.json();
      
      await db.rotas.clear();
      await db.rotasParceiros.clear();
      
      for (const rota of rotas) {
        await db.rotas.put({
          CODROTA: rota.CODROTA,
          ID_EMPRESA: rota.ID_EMPRESA,
          DESCRICAO: rota.DESCRICAO,
          CODVEND: rota.CODVEND,
          NOMEVENDEDOR: rota.NOMEVENDEDOR,
          TIPO_RECORRENCIA: rota.TIPO_RECORRENCIA,
          DIAS_SEMANA: rota.DIAS_SEMANA,
          INTERVALO_DIAS: rota.INTERVALO_DIAS,
          DATA_INICIO: rota.DATA_INICIO,
          DATA_FIM: rota.DATA_FIM,
          ATIVO: rota.ATIVO
        });
        
        if (rota.parceiros && rota.parceiros.length > 0) {
          for (const parceiro of rota.parceiros) {
            await db.rotasParceiros.add({
              CODROTA: rota.CODROTA,
              CODPARC: parceiro.CODPARC,
              NOMEPARC: parceiro.NOMEPARC,
              ORDEM: parceiro.ORDEM,
              LATITUDE: parceiro.LATITUDE,
              LONGITUDE: parceiro.LONGITUDE,
              TEMPO_ESTIMADO: parceiro.TEMPO_ESTIMADO,
              ENDERECO: parceiro.ENDERECO,
              CIDADE: parceiro.CIDADE,
              UF: parceiro.UF
            });
          }
        }
      }
      
      console.log(`✅ ${rotas.length} rotas sincronizadas para offline`);
    } catch (error) {
      console.error('❌ Erro ao sincronizar rotas:', error);
    }
  },

  async getRotasOffline(): Promise<RotaOffline[]> {
    const rotas = await db.rotas.toArray();
    
    for (const rota of rotas) {
      const parceiros = await db.rotasParceiros
        .where('CODROTA')
        .equals(rota.CODROTA)
        .sortBy('ORDEM');
      rota.parceiros = parceiros;
    }
    
    return rotas;
  },

  async getRotaOffline(codRota: number): Promise<RotaOffline | null> {
    const rota = await db.rotas.get(codRota);
    if (!rota) return null;
    
    const parceiros = await db.rotasParceiros
      .where('CODROTA')
      .equals(codRota)
      .sortBy('ORDEM');
    rota.parceiros = parceiros;
    
    return rota;
  },

  async getParceirosOffline(): Promise<any[]> {
    return await db.parceiros.toArray();
  },

  async getVisitasOffline(): Promise<VisitaOffline[]> {
    const visitasOnline = await db.visitas.toArray();
    
    const visitasPendentes = await db.visitasPendentes
      .where('synced')
      .equals(0)
      .toArray();
    
    const visitasLocais: VisitaOffline[] = visitasPendentes
      .filter(v => v.action === 'checkin')
      .map(v => ({
        CODVISITA: 0,
        localId: v.localVisitaId,
        CODROTA: v.codRota,
        CODPARC: v.codParc,
        CODVEND: v.codVend,
        DATA_VISITA: new Date(v.createdAt).toISOString().split('T')[0],
        HORA_CHECKIN: v.horaCheckin,
        HORA_CHECKOUT: visitasPendentes.find(
          checkout => checkout.action === 'checkout' && checkout.localVisitaId === v.localVisitaId
        )?.horaCheckout,
        LAT_CHECKIN: v.latitude,
        LNG_CHECKIN: v.longitude,
        STATUS: visitasPendentes.find(
          checkout => checkout.action === 'checkout' && checkout.localVisitaId === v.localVisitaId
        ) ? 'CONCLUIDA' : 'CHECKIN',
        OBSERVACAO: v.observacao,
        PEDIDO_GERADO: v.pedidoGerado ? 'S' : 'N',
        NUNOTA: v.nunota,
        VLRTOTAL: v.vlrTotal,
        offline: true
      }));
    
    return [...visitasLocais, ...visitasOnline];
  },

  generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  async fazerCheckinOffline(params: {
    codRota?: number;
    codParc: number;
    codVend: number;
    latitude?: number;
    longitude?: number;
    observacao?: string;
  }): Promise<{ success: boolean; localVisitaId?: string; codVisita?: number; offline?: boolean }> {
    const isOnline = navigator.onLine;
    const localVisitaId = this.generateLocalId();
    const horaCheckin = new Date().toISOString();

    if (isOnline) {
      try {
        const response = await fetch('/api/rotas/visitas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkin',
            codRota: params.codRota,
            codParc: params.codParc,
            latitude: params.latitude,
            longitude: params.longitude,
            observacao: params.observacao
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Erro ao fazer check-in');
        }

        toast.success('Check-in realizado!', {
          description: 'Visita iniciada com sucesso',
          duration: 3000
        });

        return { success: true, codVisita: result.codVisita };
      } catch (error: any) {
        if (!navigator.onLine || error.message?.includes('fetch')) {
          console.log('💾 Salvando check-in offline...');
        } else {
          toast.error('Erro ao fazer check-in', { description: error.message });
          return { success: false };
        }
      }
    }

    const visitaPendente: VisitaPendenteOffline = {
      action: 'checkin',
      localVisitaId,
      codRota: params.codRota,
      codParc: params.codParc,
      codVend: params.codVend,
      latitude: params.latitude,
      longitude: params.longitude,
      observacao: params.observacao,
      horaCheckin,
      synced: 0,
      createdAt: Date.now(),
      tentativas: 0,
      status: 'PENDENTE'
    };

    await db.visitasPendentes.add(visitaPendente);

    toast.warning('📱 Check-in salvo offline', {
      description: 'Será sincronizado quando houver conexão',
      duration: 4000
    });

    return { success: true, localVisitaId, offline: true };
  },

  async fazerCheckoutOffline(params: {
    codVisita?: number;
    localVisitaId?: string;
    codParc: number;
    codVend: number;
    latitude?: number;
    longitude?: number;
    observacao?: string;
    pedidoGerado?: boolean;
    nunota?: number;
    vlrTotal?: number;
  }): Promise<{ success: boolean; offline?: boolean }> {
    const isOnline = navigator.onLine;
    const horaCheckout = new Date().toISOString();

    if (isOnline && params.codVisita) {
      try {
        const response = await fetch('/api/rotas/visitas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkout',
            codVisita: params.codVisita,
            latitude: params.latitude,
            longitude: params.longitude,
            observacao: params.observacao,
            pedidoGerado: params.pedidoGerado,
            nunota: params.nunota,
            vlrTotal: params.vlrTotal
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Erro ao fazer check-out');
        }

        toast.success('Check-out realizado!', {
          description: params.pedidoGerado ? 'Visita concluída com pedido' : 'Visita concluída',
          duration: 3000
        });

        return { success: true };
      } catch (error: any) {
        if (!navigator.onLine || error.message?.includes('fetch')) {
          console.log('💾 Salvando check-out offline...');
        } else {
          toast.error('Erro ao fazer check-out', { description: error.message });
          return { success: false };
        }
      }
    }

    const visitaPendente: VisitaPendenteOffline = {
      action: 'checkout',
      codVisita: params.codVisita,
      localVisitaId: params.localVisitaId,
      codParc: params.codParc,
      codVend: params.codVend,
      latitude: params.latitude,
      longitude: params.longitude,
      observacao: params.observacao,
      pedidoGerado: params.pedidoGerado,
      nunota: params.nunota,
      vlrTotal: params.vlrTotal,
      horaCheckout,
      synced: 0,
      createdAt: Date.now(),
      tentativas: 0,
      status: 'PENDENTE'
    };

    await db.visitasPendentes.add(visitaPendente);

    toast.warning('📱 Check-out salvo offline', {
      description: 'Será sincronizado quando houver conexão',
      duration: 4000
    });

    return { success: true, offline: true };
  },

  async getVisitasPendentes(): Promise<VisitaPendenteOffline[]> {
    return await db.visitasPendentes
      .where('synced')
      .equals(0)
      .toArray();
  },

  async processarFilaVisitas(): Promise<void> {
    if (!navigator.onLine) {
      console.warn('⚠️ Sem conexão - não é possível sincronizar visitas');
      return;
    }

    const visitasPendentes = await db.visitasPendentes
      .where('synced')
      .equals(0)
      .sortBy('createdAt');

    if (visitasPendentes.length === 0) {
      return;
    }

    console.log(`🔄 Sincronizando ${visitasPendentes.length} visitas pendentes...`);

    const checkins = visitasPendentes.filter(v => v.action === 'checkin');
    const checkouts = visitasPendentes.filter(v => v.action === 'checkout');

    const localIdToCodVisita = new Map<string, number>();

    for (const checkin of checkins) {
      try {
        await db.visitasPendentes.update(checkin.id!, {
          status: 'SINCRONIZANDO',
          tentativas: (checkin.tentativas || 0) + 1,
          ultimaTentativa: Date.now()
        });

        const response = await fetch('/api/rotas/visitas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkin',
            codRota: checkin.codRota,
            codParc: checkin.codParc,
            latitude: checkin.latitude,
            longitude: checkin.longitude,
            observacao: checkin.observacao
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao sincronizar check-in');
        }

        if (checkin.localVisitaId) {
          localIdToCodVisita.set(checkin.localVisitaId, result.codVisita);
          
          await db.visitaIdMappings.put({
            localVisitaId: checkin.localVisitaId,
            codVisita: result.codVisita,
            createdAt: Date.now()
          });
          
          await db.visitasPendentes
            .where('localVisitaId')
            .equals(checkin.localVisitaId)
            .and(v => v.action === 'checkout' && v.synced === 0)
            .modify({ codVisita: result.codVisita });
        }

        await db.visitasPendentes.update(checkin.id!, {
          synced: 1,
          status: 'SUCESSO',
          codVisita: result.codVisita
        });

        console.log(`✅ Check-in sincronizado: ${result.codVisita}`);
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar check-in:', error);
        await db.visitasPendentes.update(checkin.id!, {
          status: 'ERRO',
          erro: error.message
        });
      }
    }

    for (const checkout of checkouts) {
      try {
        let codVisita = checkout.codVisita;

        if (!codVisita && checkout.localVisitaId) {
          codVisita = localIdToCodVisita.get(checkout.localVisitaId);
          
          if (!codVisita) {
            const mapping = await db.visitaIdMappings.get(checkout.localVisitaId);
            if (mapping) {
              codVisita = mapping.codVisita;
              await db.visitasPendentes.update(checkout.id!, { codVisita });
            }
          }
        }

        if (!codVisita) {
          console.warn('⚠️ Check-out sem codVisita correspondente, aguardando check-in sincronizar...');
          continue;
        }

        await db.visitasPendentes.update(checkout.id!, {
          status: 'SINCRONIZANDO',
          tentativas: (checkout.tentativas || 0) + 1,
          ultimaTentativa: Date.now()
        });

        const response = await fetch('/api/rotas/visitas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkout',
            codVisita,
            latitude: checkout.latitude,
            longitude: checkout.longitude,
            observacao: checkout.observacao,
            pedidoGerado: checkout.pedidoGerado,
            nunota: checkout.nunota,
            vlrTotal: checkout.vlrTotal
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao sincronizar check-out');
        }

        await db.visitasPendentes.update(checkout.id!, {
          synced: 1,
          status: 'SUCESSO'
        });

        if (checkout.localVisitaId) {
          await db.visitaIdMappings.delete(checkout.localVisitaId);
        }

        console.log(`✅ Check-out sincronizado`);
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar check-out:', error);
        await db.visitasPendentes.update(checkout.id!, {
          status: 'ERRO',
          erro: error.message
        });
      }
    }

    const totalSincronizados = await db.visitasPendentes
      .where('synced')
      .equals(1)
      .count();

    if (totalSincronizados > 0) {
      await db.visitasPendentes
        .where('synced')
        .equals(1)
        .delete();
    }

    toast.success('Visitas sincronizadas!', {
      description: `${totalSincronizados} visita(s) enviada(s) com sucesso`,
      duration: 4000
    });
  },

  async getVisitaAtivaLocal(codVend: number): Promise<VisitaPendenteOffline | null> {
    const checkins = await db.visitasPendentes
      .where('action')
      .equals('checkin')
      .filter(v => v.synced === 0 && v.codVend === codVend)
      .toArray();

    if (checkins.length === 0) return null;

    const ultimoCheckin = checkins[checkins.length - 1];

    const checkoutExiste = await db.visitasPendentes
      .where('localVisitaId')
      .equals(ultimoCheckin.localVisitaId || '')
      .filter(v => v.action === 'checkout')
      .first();

    if (checkoutExiste) return null;

    return ultimoCheckin;
  }
};
