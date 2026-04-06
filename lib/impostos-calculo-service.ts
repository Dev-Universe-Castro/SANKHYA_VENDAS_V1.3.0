import { sankhyaDynamicAPI } from './sankhya-dynamic-api';

export interface CalculoImpostoPayload {
  notaModelo: number;
  codigoCliente: number;
  codigoEmpresa: number;
  produtos: Array<{
    codigoProduto: number;
    quantidade: number;
    valorUnitario: number;
    unidade: string;
    valorDesconto?: number;
  }>;
}

export interface CalculoImpostoResposta {
  success: boolean;
  produtos?: Array<{
    codigoProduto: number;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    valorTotal: number;
    impostos: Array<{
      tipo: string;
      cst: string;
      aliquota: number;
      valorBase: number;
      valorImposto: number;
    }>;
  }>;
  error?: string;
}

export const impostosCalculoService = {
  async calcularImpostos(
    idEmpresa: number,
    payload: CalculoImpostoPayload
  ): Promise<CalculoImpostoResposta> {
    try {
      console.log('\n📊 [IMPOSTOS] Iniciando cálculo de impostos...');

      const endpoint = '/v1/fiscal/impostos/calculo';

      const corpoRequisicao = {
        notaModelo: payload.notaModelo,
        codigoCliente: payload.codigoCliente,
        produtos: payload.produtos.map(p => ({
          codigoProduto: p.codigoProduto,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
          unidade: p.unidade,
          valorDesconto: p.valorDesconto || 0
        }))
      };

      console.log('📤 Enviando para API Sankhya:', endpoint);
      console.log('📄 Corpo:', JSON.stringify(corpoRequisicao, null, 2));

      const resposta = await sankhyaDynamicAPI.fazerRequisicao(
        idEmpresa,
        endpoint,
        'POST',
        corpoRequisicao
      );

      console.log('📥 Resposta da API:', JSON.stringify(resposta, null, 2));

      if (resposta?.statusCode && resposta.statusCode >= 400) {
        const errorMsg = resposta?.error?.message || resposta?.statusMessage || 'Erro no cálculo de impostos';
        console.error('❌ Erro no cálculo:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      const produtosResponse = resposta?.produtos || resposta?.data?.produtos || [];

      // Filtrar apenas impostos com valorImposto > 0
      const produtosProcessados = produtosResponse.map((prod: any) => ({
        ...prod,
        impostos: (prod.impostos || []).filter((imp: any) => (imp.valorImposto || 0) > 0)
      }));

      console.log('✅ Cálculo de impostos concluído com sucesso!');

      return {
        success: true,
        produtos: produtosProcessados
      };

    } catch (error: any) {
      console.error('❌ Erro ao calcular impostos:', error.message);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao calcular impostos'
      };
    }
  }
};
