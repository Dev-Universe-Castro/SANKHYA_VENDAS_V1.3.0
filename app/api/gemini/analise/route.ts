
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AIService } from '@/lib/ai-service';
import { buscarDadosAnalise } from '@/lib/analise-service';
import { oracleService } from '@/lib/oracle-db';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const user = JSON.parse(userCookie.value);
        const idEmpresa = user.ID_EMPRESA || user.idEmpresa;
        const userId = user.CODUSUARIO || user.id;

        const { prompt, dataInicio, dataFim } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });
        }

        // 0. Validar e restringir período para no máximo 3 meses (90 dias)
        let finalDataInicio = dataInicio;
        let finalDataFim = dataFim;

        if (dataInicio && dataFim) {
            const d1 = new Date(dataInicio);
            const d2 = new Date(dataFim);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 90) {
                console.log(`⚠️ Ajustando período de análise de ${diffDays} dias para 90 dias.`);
                const adjustedD1 = new Date(d2);
                adjustedD1.setDate(d2.getDate() - 90);
                finalDataInicio = adjustedD1.toISOString().split('T')[0];
            }
        }

        // 1. Buscar credenciais da IA
        const aiConfigSql = `
      SELECT AI_PROVEDOR as PROVEDOR, AI_MODELO as MODELO, AI_CREDENTIAL as CREDENTIAL
      FROM AD_CONTRATOS
      WHERE ID_EMPRESA = :idEmpresa AND ATIVO = 'S'
      FETCH FIRST 1 ROWS ONLY
    `;

        let aiConfigs: any[] = [];
        try {
            aiConfigs = await oracleService.executeQuery<any>(aiConfigSql, { idEmpresa });
        } catch (dbError: any) {
            console.warn("Tabela AD_CONTRATOS não encontrada ou erro na query. Usando config de ambiente.");
        }

        let config;
        if (aiConfigs.length > 0) {
            config = {
                provedor: aiConfigs[0].PROVEDOR,
                modelo: aiConfigs[0].MODELO,
                credential: aiConfigs[0].CREDENTIAL,
                responseMimeType: 'application/json'
            };
        } else if (process.env.GEMINI_API_KEY) {
            config = {
                provedor: 'GEMINI',
                modelo: 'gemini-1.5-pro',
                credential: process.env.GEMINI_API_KEY,
                responseMimeType: 'application/json'
            };
        } else {
            return NextResponse.json({ error: 'Configuração de IA não encontrada no banco nem no .env' }, { status: 404 });
        }

        // 2. Buscar dados reais para o contexto da análise
        const dados = await buscarDadosAnalise(
            { dataInicio: finalDataInicio, dataFim: finalDataFim, idEmpresa, codUsuario: userId },
            userId,
            user.isAdmin,
            idEmpresa
        );

        // 3. Preparar Prompt do Sistema
        const systemPrompt = `
      Você é um especialista em análise de dados comerciais e CRM da PredictSales.
      Sua tarefa é analisar os dados fornecidos e retornar uma lista de WIDGETS para visualização.
      
      REGRAS CRÍTICAS DE FORMATAÇÃO:
      1. PROIBIÇÃO DE TABELAS MARKDOWN: Nunca use tabelas no formato markdown (com pipes | e traços -) dentro de widgets de 'explicacao'.
      2. WIDGET DE TABELA OBRIGATÓRIO: Toda e qualquer informação que possa ser exibida em colunas (Rankings de Parceiros, Rankings de Produtos, Listagem de Vendedores, etc.) DEVE ser um widget do tipo 'tabela'.
      3. FRAGMENTAÇÃO: Não tente colocar tudo em um ou dois widgets gigantes. Divida sua análise em 5 a 8 widgets menores e focados. Use uma mistura de 'card', 'grafico_barras', 'tabela' e 'explicacao'.
      4. CONCISÃO: Seja direto. Insights curtos são mais valiosos que textos longos que podem ser cortados.

      IMPORTANTE: Retorne APENAS um JSON válido seguindo este formato:
      {
        "widgets": [
          {
            "tipo": "card" | "grafico_barras" | "grafico_linha" | "grafico_pizza" | "tabela" | "explicacao",
            "titulo": "Título Curto",
            "dados": { ... dependendo do tipo ... },
            "metadados": { "info": "opcional" }
          }
        ]
      }

      Estrutura de dados detalhada:
      - card: { "valor": "R$ 10k", "subtitulo": "Comparado ao mês anterior", "variacao": "+5%" }
      - grafico_barras/linha/pizza: { "labels": ["Jan", "Fev"], "values": [10, 20] }
      - tabela: { "colunas": ["Ranking", "Nome", "Valor"], "linhas": [ ["1", "João", 5000], ["2", "Maria", 4500] ] } (Linhas são arrays de valores correspondentes às colunas)
      - explicacao: { "texto": "Breve parágrafo com insights estratégicos (SEM TABELAS MARKDOWN)" }

      Contexto dos dados atuais (Período: ${finalDataInicio} até ${finalDataFim}):
      - Total Leads: ${dados.totalLeads}
      - Total Pedidos: ${dados.totalPedidos}
      - Valor Total Pedidos: R$ ${dados.valorTotalPedidos.toFixed(2)}
      - Total Clientes: ${dados.totalClientes}
      - Total Tarefas/Atividades: ${dados.totalAtividades}
      - Visitas Realizadas: ${dados.totalVisitas}
      - Dados Brutos resumidos e AGRUPAMENTOS DE VENDAS (USE ISTO PARA ANÁLISE PROFUNDA): ${JSON.stringify({
            agrupamentosVendas: dados.agrupamentos,
            leads: dados.leads.slice(0, 5),
            pedidos: dados.pedidos.slice(0, 5),
            tarefas: dados.atividades.slice(0, 5)
        })}
    `;

        // 4. Chamar IA
        const model = AIService.getModel(config);

        console.log('\n📊 === RELATÓRIO DE DADOS ENVIADOS PARA A IA (ANÁLISE) ===');
        console.log(`📅 Período analisado: ${finalDataInicio} a ${finalDataFim}`);
        console.log(`🗃️  Tabelas acessadas e quantidade de registros (Pós-filtro de acesso):`);
        console.log(` - Clientes/Parceiros (API + AD_ACESSOS): ${dados.clientes?.length || 0} registros`);
        console.log(` - Pedidos (Sankhya API loadRecords): ${dados.pedidos?.length || 0} registros (R$ ${dados.valorTotalPedidos?.toFixed(2) || '0.00'})`);
        console.log(` - Leads (AD_LEADS): ${dados.leads?.length || 0} registros`);
        console.log(` - Tarefas / Atividades (AD_ADLEADSATIVIDADES): ${dados.atividades?.length || 0} registros`);
        console.log(` - Visitas (AD_VISITAS): ${dados.visitas?.length || 0} registros`);
        console.log(` - Produtos (Itens dos Pedidos API + AS_PRODUTOS): ${dados.produtos?.length || 0} registros`);
        console.log(` - Rotas (AD_ROTAS): ${dados.rotas?.length || 0} registros`);

        try {
            const tokenCount = await model.countTokens({
                contents: [{ role: 'user', parts: [{ text: systemPrompt }, { text: `Usuário solicitou: ${prompt}` }] }]
            });
            console.log(`🧮 Tokens enviados para o modelo: ${tokenCount.totalTokens}`);
        } catch (e) {
            console.log(`🧮 Tamanho do Prompt: ${systemPrompt.length + prompt?.length} caracteres (Estimativa de tokens indisponível)`);
        }
        console.log('=======================================================\n');

        const result = await AIService.withRetry(() => 
            model.generateContent([
                systemPrompt,
                `Usuário solicitou: ${prompt}`
            ])
        );

        const responseText = result.response.text();

        // Limpar markdown code blocks se existirem
        const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();

        try {
            const parsed = JSON.parse(jsonString);
            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error('Erro ao parsear JSON da IA:', responseText);
            return NextResponse.json({
                error: 'Erro na resposta da IA',
                raw: responseText
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error in /api/gemini/analise:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
