
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

        const { message, history, filtro, sessionId } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
        }

        // 0. Validar e restringir período para no máximo 3 meses (90 dias)
        let finalFiltro = { ...filtro };
        if (filtro?.dataInicio && filtro?.dataFim) {
            const d1 = new Date(filtro.dataInicio);
            const d2 = new Date(filtro.dataFim);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 90) {
                console.log(`⚠️ Ajustando período de chat de ${diffDays} dias para 90 dias.`);
                const adjustedD1 = new Date(d2);
                adjustedD1.setDate(d2.getDate() - 90);
                finalFiltro.dataInicio = adjustedD1.toISOString().split('T')[0];
            }
        }

        const user = JSON.parse(userCookie.value);
        const idEmpresa = user.ID_EMPRESA || user.idEmpresa;
        const userId = user.CODUSUARIO || user.id;

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
                credential: aiConfigs[0].CREDENTIAL
            };
        } else if (process.env.GEMINI_API_KEY) {
            config = {
                provedor: 'GEMINI',
                modelo: 'gemini-1.5-pro',
                credential: process.env.GEMINI_API_KEY
            };
        } else {
            return NextResponse.json({ error: 'Configuração de IA não encontrada no banco nem no .env' }, { status: 404 });
        }

        // 2. Buscar contexto de dados
        const contextData = await buscarDadosAnalise(
            {
                dataInicio: finalFiltro?.dataInicio,
                dataFim: finalFiltro?.dataFim,
                idEmpresa,
                codUsuario: userId
            },
            userId,
            user.isAdmin,
            idEmpresa
        );

        // 3. Preparar Prompt
        const systemPrompt = `
      Você é o Assistant PredictSales, uma IA especializada em gestão de vendas e CRM.
      Seu objetivo é ajudar o vendedor/gestor a tomar melhores decisões baseadas em dados reais do sistema.
      
      Regras de Resposta:
      1. PROFISSIONALISMO: Seja profissional, direto e útil.
      2. NOMES OBRIGATÓRIOS: Utilize SEMPRE os NOMES de Parceiros e Vendedores presentes nos dados de contexto. NUNCA use apenas os códigos se os nomes estiverem disponíveis.
      3. TABELAS MARKDOWN: Para rankings e comparações, use tabelas Markdown bem formatadas (colunas separadas por pipes e hífens).
      IMPORTANTE: Use quebras de linha reais (\n) entre o cabeçalho, a linha de separação e as linhas de dados para que a tabela seja renderizada corretamente. Nunca envie a tabela em uma única linha.
      4. COMPLETITUDE: Certifique-se de finalizar seu raciocínio. Adicione uma breve conclusão ou sugestão de próxima ação ao final.
      5. FOCO EM DADOS: Baseie suas sugestões nos dados do contexto fornecido ("agrupamentosVendas").

      CONTEXTO DO SISTEMA (Período: ${finalFiltro?.dataInicio} a ${finalFiltro?.dataFim}):
      - Clientes: ${contextData.totalClientes} ativos.
      - Pedidos: ${contextData.totalPedidos} realizados, somando R$ ${contextData.valorTotalPedidos.toFixed(2)}.
      - Leads: ${contextData.totalLeads} ativos em diversos estágios do funil.
      - Tarefas/Atividades: ${contextData.totalAtividades} agendadas.
      - Visitas: ${contextData.totalVisitas} planejadas/realizadas.
      
      DADOS DETALHADOS (Resumo e Agrupamentos):
      ${JSON.stringify({
            maioresClientes: contextData.maioresClientes,
            resumoTarefas: contextData.atividades.slice(0, 5),
            resumoLeads: contextData.leads.slice(0, 5),
            agrupamentosVendas: contextData.agrupamentos
        })}
    `;

        // 4. Implementar Streaming SSE
        const model = AIService.getModel(config);

        console.log('\n📊 === RELATÓRIO DE DADOS ENVIADOS PARA A IA (CHAT) ===');
        console.log(`📅 Período analisado: ${finalFiltro?.dataInicio} a ${finalFiltro?.dataFim}`);
        console.log(`🗃️  Tabelas acessadas e quantidade de registros (Pós-filtro de acesso):`);
        console.log(` - Clientes/Parceiros (API + AD_ACESSOS): ${contextData.clientes?.length || 0} registros`);
        console.log(` - Pedidos (Sankhya API loadRecords): ${contextData.pedidos?.length || 0} registros (R$ ${contextData.valorTotalPedidos?.toFixed(2) || '0.00'})`);
        console.log(` - Leads (AD_LEADS): ${contextData.leads?.length || 0} registros`);
        console.log(` - Tarefas / Atividades (AD_ADLEADSATIVIDADES): ${contextData.atividades?.length || 0} registros`);
        console.log(` - Visitas (AD_VISITAS): ${contextData.visitas?.length || 0} registros`);
        console.log(` - Produtos (Itens dos Pedidos API + AS_PRODUTOS): ${contextData.produtos?.length || 0} registros`);
        console.log(` - Rotas (AD_ROTAS): ${contextData.rotas?.length || 0} registros`);

        try {
            const tokenCount = await model.countTokens({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'user', parts: [{ text: message }] }
                ]
            });
            console.log(`🧮 Tokens enviados para o modelo: ${tokenCount.totalTokens}`);
        } catch (e) {
            console.log(`🧮 Tamanho do Prompt: ${systemPrompt.length + message.length} caracteres (Estimativa de tokens indisponível)`);
        }
        console.log('=======================================================\n');

        const chat = model.startChat({
            history: (history || []).map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })),
            generationConfig: {
                maxOutputTokens: 4096,
            },
        });

        const stream = new ReadableStream({
            async start(controller) {
                const textEncoder = new TextEncoder();

                try {
                    // Enviar sinal de carregamento inicial
                    controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ progress: 10, message: 'Processando...' })}\n\n`));

                    const result = await AIService.withRetry(() => 
                        chat.sendMessageStream([
                            { text: systemPrompt },
                            { text: message }
                        ])
                    );

                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            const data = JSON.stringify({ text: chunkText });
                            controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
                        }
                    }

                    controller.enqueue(textEncoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error: any) {
                    console.error('Streaming error:', error);
                    controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Error in /api/gemini/chat:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
