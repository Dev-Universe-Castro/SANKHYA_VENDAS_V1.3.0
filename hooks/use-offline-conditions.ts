import { useState, useEffect } from 'react';
import { OfflineDataService } from '@/lib/offline-data-service';

export function useRotas(codVend?: number) {
    const [rotas, setRotas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getRotas({ codVend }).then(setRotas).finally(() => setLoading(false));
    }, [codVend]);

    return { rotas, loading };
}


export function useEstados() {
    const [estados, setEstados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getEstados().then(data => {
            console.log('[useEstados] Loaded:', data.length);
            setEstados(data);
        }).finally(() => setLoading(false));
    }, []);

    return { estados, loading };
}

export function useCidades(uf?: string) {
    const [cidades, setCidades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // uf pode ser "SP" ou "SP,RJ"
        OfflineDataService.getCidades({ uf }).then(setCidades).finally(() => setLoading(false));
    }, [uf]);

    return { cidades, loading };
}

export function useBairros(codCid?: string) { // Changed to string to support "123,456"
    const [bairros, setBairros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!codCid) {
            setBairros([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        OfflineDataService.getBairros({ codCid: codCid }).then(setBairros).finally(() => setLoading(false));
    }, [codCid]);

    return { bairros, loading };
}

export function useRegioes() {
    const [regioes, setRegioes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getRegioes().then(setRegioes).finally(() => setLoading(false));
    }, []);

    return { regioes, loading };
}

export function useVendedores() {
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getVendedores().then(setVendedores).finally(() => setLoading(false));
    }, []);

    return { vendedores, loading };
}

export function useEquipes() {
    const [equipes, setEquipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getEquipes().then(setEquipes).finally(() => setLoading(false));
    }, []);

    return { equipes, loading };
}

export function useMarcas() {
    const [marcas, setMarcas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getMarcas().then(setMarcas).finally(() => setLoading(false));
    }, []);

    return { marcas, loading };
}

export function useGruposProdutos() {
    const [grupos, setGrupos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getGruposProdutos().then(setGrupos).finally(() => setLoading(false));
    }, []);

    return { grupos, loading };
}

export function useTabelasPrecos() {
    const [tabelas, setTabelas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        OfflineDataService.getTabelasPrecos().then(setTabelas).finally(() => setLoading(false));
    }, []);

    return { tabelas, loading };
}

export function useParceiros(search?: string) {
    const [parceiros, setParceiros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!search && parceiros.length > 0) return; // Cache simples
        OfflineDataService.getParceiros({ search: search || '' }).then(setParceiros).finally(() => setLoading(false));
    }, [search]);

    return { parceiros, loading };
}
