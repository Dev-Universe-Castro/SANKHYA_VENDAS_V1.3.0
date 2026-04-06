
import { useState, useEffect } from 'react';
import { OfflineDataService } from '@/lib/offline-data-service';
import { toast } from 'sonner';

export function useOfflineLoad() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const loadLastSync = async () => {
      const sync = await OfflineDataService.getLastSync();
      if (sync) setLastSync(sync);
    };
    loadLastSync();
  }, []);

  const realizarCargaOffline = async () => {
    if (!navigator.onLine) {
      toast.error("Necessário internet para atualizar a base offline.");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Sincronizando base de dados...");

    try {
      console.log('🔄 Iniciando sincronização IndexedDB...');

      // Buscar dados do prefetch
      const response = await fetch('/api/prefetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error("Erro ao buscar dados");
      }

      // Sincronizar tudo no IndexedDB
      await OfflineDataService.sincronizarTudo(result, 'useOfflineLoad');

      const now = new Date().toISOString();
      setLastSync(now);

      const totalRegistros = Object.values(result).reduce((sum: number, r: any) => sum + (r?.count || 0), 0);

      toast.success(`✅ Base atualizada! ${totalRegistros} registros sincronizados.`);
      console.log('✅ Sincronização IndexedDB concluída com sucesso');

    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      toast.error("Falha na sincronização offline.");
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  return { realizarCargaOffline, isLoading, lastSync };
}
