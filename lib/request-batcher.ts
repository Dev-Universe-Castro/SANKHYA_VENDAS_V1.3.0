
// Serviço de batching para otimizar múltiplas requisições simultâneas
class RequestBatcher {
  private batches: Map<string, {
    items: any[];
    timer: NodeJS.Timeout;
    resolve: (value: any) => void;
  }> = new Map();

  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY = 10; // 10ms

  async add<T>(batchKey: string, item: any, processor: (items: any[]) => Promise<T[]>): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(batchKey);

      if (!batch) {
        batch = {
          items: [],
          timer: setTimeout(() => this.flush(batchKey, processor), this.BATCH_DELAY),
          resolve: () => {}
        };
        this.batches.set(batchKey, batch);
      }

      batch.items.push({ item, resolve, reject });

      // Se atingiu o tamanho máximo, processa imediatamente
      if (batch.items.length >= this.BATCH_SIZE) {
        clearTimeout(batch.timer);
        this.flush(batchKey, processor);
      }
    });
  }

  private async flush<T>(batchKey: string, processor: (items: any[]) => Promise<T[]>) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    try {
      const items = batch.items.map(b => b.item);
      const results = await processor(items);

      batch.items.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      batch.items.forEach(b => {
        b.reject(error);
      });
    }
  }
}

export const requestBatcher = new RequestBatcher();
