import { PoliticaComercial } from './politicas-comerciais-service';

export interface PolicyContext {
    tenantId?: number; // ID_EMPRESA (Pretech/System ID)
    codEmp: number;    // CODEMP (Business Company Code)
    codParc?: number;
    uf?: string;        // UF Sigla (ex: MG)
    codCid?: number;
    codBai?: number;
    codReg?: number;
    codProd?: number;
    marca?: string | number;
    grupo?: number;
    codVend?: number;
    codEquipe?: number;
    codTipVenda?: number; // Condição Comercial
}

export interface PoliticaComercialAvaliada extends PoliticaComercial {
    _evaluationLogs?: any[];
}

export function calculateSpecificity(policy: PoliticaComercial, context: PolicyContext, verbose: boolean = false): { score: number, logs: any[] } {
    let score = 0;
    const logs: any[] = [];

    // Helper to check match and calculate score.
    const checkMatch = (policyField: string | undefined | null, contextValue: string | number | undefined, fieldName: string): boolean => {
        const policyValStr = (policyField !== undefined && policyField !== null) ? String(policyField).trim() : '';
        // Handle 0 correctly: String(0) is "0", which is what we want.
        const contextValStr = (contextValue !== undefined && contextValue !== null) ? String(contextValue).trim() : '';

        let matchResult = false;
        let isWildcard = false;
        let scoreIncrement = 0;

        let policyValues: string[] = [];
        let contextStr = '';

        if (!policyValStr) {
            isWildcard = true;
            matchResult = true; // Wildcard (No constraint)
        } else if (contextValue === undefined || contextValue === null || String(contextValue).trim() === '') {
            matchResult = false; // Context missing but policy required
        } else {
            // Normalize for comparison
            policyValues = policyValStr.split(',').map(s => s.trim().toUpperCase());
            contextStr = contextValStr.toUpperCase();

            if (policyValues.includes(contextStr)) {
                scoreIncrement = 1; // Basic Match = 1 Point
                score += scoreIncrement;
                matchResult = true;
            } else {
                matchResult = false;
            }
        }

        if (verbose) {
            let detail = '';
            if (isWildcard) {
                detail = 'Curinga (Sem restrição)';
            } else if (matchResult) {
                detail = `Sucesso: Contexto '${contextStr}' encontrado em [${policyValues.join(', ')}]`;
            } else {
                detail = `Falha: Contexto '${contextStr}' NÃO encontrado em [${policyValues.join(', ')}]`;
            }

            logs.push({
                Campo: fieldName,
                Regra: policyValStr || '(Qualquer)',
                Contexto: (contextValue === undefined || contextValue === null || String(contextValue).trim() === '') ? '(Ausente)' : contextValStr,
                Resultado: matchResult ? '✅ SIM' : '❌ NÃO',
                Motivo: detail,
                Score: matchResult && !isWildcard ? '+1' : '0'
            });
        }

        return matchResult;
    };

    // Helper to log and return
    const finish = (resultScore: number) => {
        if (verbose && logs.length > 0) {
            console.table(logs);
        }
        return { score: resultScore, logs };
    };

    // 0. Condition of Sale (TipVenda)
    if (!checkMatch(policy.COND_COMERCIAIS, context.codTipVenda, 'COND_COMERCIAIS')) return finish(-1);

    // 1. General Scope (Tenant & Company)
    if (context.tenantId && policy.ID_EMPRESA && context.tenantId !== policy.ID_EMPRESA) return finish(-1);

    // Validate Business Company (CODEMP - Escopo)
    if (!checkMatch(policy.ESCOPO_EMPRESAS, context.codEmp, 'ESCOPO_EMPRESAS')) return finish(-1);

    // 2. Geographic Scope (Parceiro)
    if (!checkMatch(policy.ESCOPO_ESTADOS, context.uf, 'ESCOPO_ESTADOS')) return finish(-1);
    if (!checkMatch(policy.ESCOPO_CIDADES, context.codCid, 'ESCOPO_CIDADES')) return finish(-1);
    if (!checkMatch(policy.ESCOPO_BAIRROS, context.codBai, 'ESCOPO_BAIRROS')) return finish(-1);
    if (!checkMatch(policy.ESCOPO_REGIOES, context.codReg, 'ESCOPO_REGIOES')) return finish(-1);

    // 3. Segmentation Scope (Parceiro/Vendas)
    if (!checkMatch(policy.SEG_CLIENTES_MANUAL, context.codParc, 'SEG_CLIENTES_MANUAL')) return finish(-1);
    if (!checkMatch(policy.SEG_VENDEDORES, context.codVend, 'SEG_VENDEDORES')) return finish(-1);
    if (!checkMatch(policy.SEG_EQUIPES, context.codEquipe, 'SEG_EQUIPES')) return finish(-1);

    // 4. Product Scope (Produto)
    if (!checkMatch(policy.PROD_PRODUTOS_MANUAL, context.codProd, 'PROD_PRODUTOS_MANUAL')) return finish(-1);
    if (!checkMatch(policy.PROD_MARCAS, context.marca, 'PROD_MARCAS')) return finish(-1);
    if (!checkMatch(policy.PROD_FAMILIAS, context.grupo, 'PROD_FAMILIAS')) return finish(-1);

    // Tie-breaker: Priority field (Manual override)
    if (policy.PRIORIDADE) {
        score += (policy.PRIORIDADE / 1000);
    }

    return finish(score);
}

/**
 * Selects the best policy from a list based on the provided context.
 */
export function resolveBestPolicy(policies: PoliticaComercial[], context: PolicyContext): PoliticaComercialAvaliada | null {
    if (!policies || policies.length === 0) return null;

    console.group('🔍 [PolicyEngine] Resolving Best Policy');
    console.log('📋 Context:', JSON.stringify(context, null, 2));

    let bestPolicy: PoliticaComercialAvaliada | null = null;
    let maxScore = -1;

    for (const policy of policies) {
        // Only consider active policies
        if (policy.ATIVO !== 'S') continue;

        // Pass true for verbose logging to see the comparison table
        console.groupCollapsed(`Evaluating Policy: ${policy.NOME_POLITICA} (ID: ${policy.ID_POLITICA})`);
        const { score, logs } = calculateSpecificity(policy, context, true);
        console.groupEnd();

        if (score > -1) {
            console.log(`✅ [Match] Policy "${policy.NOME_POLITICA}" (ID: ${policy.ID_POLITICA}) Score: ${score}`);
            if (score > maxScore) {
                maxScore = score;
                bestPolicy = { ...policy, _evaluationLogs: logs };
            }
        } else {
            console.log(`⛔ [Mismatch] Policy "${policy.NOME_POLITICA}"`);
        }
    }

    if (bestPolicy) {
        console.log(`🏆 [WINNER] Policy "${bestPolicy.NOME_POLITICA}" (Score: ${maxScore})`);
        console.log(`   - Tabela: ${bestPolicy.RESULT_NUTAB || 'N/A'}`);
        console.log(`   - Desc. Max: ${bestPolicy.RESULT_PERCDESCONTO_MAX || 'N/A'}%`);
    } else {
        console.warn('⚠️ No matching policy found.');
    }
    console.groupEnd();

    if (maxScore === -1) return null;

    return bestPolicy;
}

/**
 * Returns all policies that match the context, sorted by score (descending).
 */
export function resolveAllApplicablePolicies(policies: PoliticaComercial[], context: PolicyContext): PoliticaComercial[] {
    if (!policies || policies.length === 0) return [];

    const applicablePolicies: { policy: PoliticaComercial, score: number }[] = [];

    for (const policy of policies) {
        if (policy.ATIVO !== 'S') continue;

        // Ativar log detalhado para cada política avaliada
        console.groupCollapsed(`Analisando Política: ${policy.NOME_POLITICA} (ID: ${policy.ID_POLITICA})`);
        const { score } = calculateSpecificity(policy, context, true);
        console.groupEnd();

        if (score > -1) {
            applicablePolicies.push({ policy, score });
        }
    }

    // Sort by score descending
    return applicablePolicies.sort((a, b) => b.score - a.score).map(p => p.policy);
}

export interface PolicyViolation {
    isViolated: boolean;
    reasons: string[];
}

export interface ItemPolicyContext {
    quantidade: number;
    desconto: number;
    precoBase: number;
    precoFinal: number;
}

/**
 * Validates a specific item action against the policy rules.
 */
export function validatePolicyViolations(policy: PoliticaComercial | null, itemContext: ItemPolicyContext): PolicyViolation {
    const violation: PolicyViolation = {
        isViolated: false,
        reasons: []
    };

    if (!policy) return violation;

    // 1. Check Max Discount %
    if (policy.RESULT_PERCDESCONTO_MAX !== undefined && policy.RESULT_PERCDESCONTO_MAX !== null) {
        if (itemContext.desconto > policy.RESULT_PERCDESCONTO_MAX) {
            violation.isViolated = true;
            violation.reasons.push(`Desconto de ${itemContext.desconto}% excede o máximo permitido de ${policy.RESULT_PERCDESCONTO_MAX}% pela política "${policy.NOME_POLITICA}"`);
        }
    }

    // 2. Check Max Markup % (Acréscimo)
    // If precoFinal > precoBase, we check if the difference is within the allowed markup
    if (policy.RESULT_PERCACIMA_MAX !== undefined && policy.RESULT_PERCACIMA_MAX !== null) {
        if (itemContext.precoFinal > itemContext.precoBase) {
            const markupPerc = ((itemContext.precoFinal - itemContext.precoBase) / itemContext.precoBase) * 100;
            if (markupPerc > (policy.RESULT_PERCACIMA_MAX + 0.01)) { // Adding small epsilon for floating point
                violation.isViolated = true;
                violation.reasons.push(`Acréscimo de ${markupPerc.toFixed(2)}% excede o máximo permitido de ${policy.RESULT_PERCACIMA_MAX}% pela política "${policy.NOME_POLITICA}"`);
            }
        }
    }

    return violation;
}
