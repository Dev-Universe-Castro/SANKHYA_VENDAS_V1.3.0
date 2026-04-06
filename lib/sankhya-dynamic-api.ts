import axios from 'axios';
import { contratosService } from './contratos-service';

class SankhyaDynamicAPI {

  async obterToken(idEmpresa: number): Promise<string> {
    console.log(`🔐 Gerando novo token para empresa ${idEmpresa}`);

    const credentials = await contratosService.getSankhyaCredentials(idEmpresa);

    try {
      if (credentials.authType === 'OAUTH2') {
        // Autenticação OAuth2 - usa endpoint /authenticate
        console.log(`🔑 Usando autenticação OAuth2 para empresa ${idEmpresa}`);
        const authenticateUrl = `${credentials.baseUrl}/authenticate`;

        // OAuth2 usa x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', credentials.clientId);
        params.append('client_secret', credentials.clientSecret);

        const response = await axios.post(authenticateUrl, params, {
          headers: {
            'X-Token': credentials.xToken,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        });

        const token = response.data.access_token || response.data.bearerToken || response.data.token;

        if (!token) {
          console.error('❌ Token OAuth2 não retornado:', response.data);
          throw new Error('Token OAuth2 não retornado pela API Sankhya');
        }

        console.log(`✅ Token OAuth2 gerado para empresa ${idEmpresa}`);
        return token;

      } else {
        // Autenticação Legacy - usa endpoint /login com JSON
        console.log(`🔑 Usando autenticação Legacy para empresa ${idEmpresa}`);
        const loginUrl = `${credentials.baseUrl}/login`;

        const response = await axios.post(loginUrl, {}, {
          headers: {
            'token': credentials.token,
            'appkey': credentials.appkey,
            'username': credentials.username,
            'password': credentials.password,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const token = response.data.bearerToken || response.data.token;

        if (!token) {
          console.error('❌ Token Legacy não retornado:', response.data);
          throw new Error('Token Legacy não retornado pela API Sankhya');
        }

        console.log(`✅ Token Legacy gerado para empresa ${idEmpresa}`);
        return token;
      }

    } catch (error: any) {
      console.error('❌ Erro ao gerar token:', error.message);
      if (error.response) {
        console.error('❌ Resposta do servidor:', error.response.data);
        throw new Error(`Erro no login Sankhya: ${error.response.data?.error || error.message}`);
      }
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  async fazerRequisicao(idEmpresa: number, endpoint: string, method: string, data?: any, tentativa: number = 1): Promise<any> {
    const token = await this.obterToken(idEmpresa)
    const credentials = await contratosService.getSankhyaCredentials(idEmpresa)
    const MAX_TENTATIVAS = 3
    const TIMEOUT_MS = 30000 // 30 segundos

    // Construir URL corretamente usando baseUrl do contrato
    const url = `${credentials.baseUrl}${endpoint}`

    // Verificar se é uma requisição de imagem (dbimage)
    const isImageRequest = endpoint.toLowerCase().includes('dbimage')

    const config: any = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
      timeout: TIMEOUT_MS
    }

    // Para requisições de imagem, mudar o responseType
    if (isImageRequest) {
      config.responseType = 'arraybuffer'
    }

    try {
      console.log(`🔄 Tentativa ${tentativa}/${MAX_TENTATIVAS} - ${method.toUpperCase()} ${url}`)

      const response = await axios(config)

      // Para imagens, retornar o buffer diretamente
      if (isImageRequest) {
        const buffer = Buffer.from(response.data)
        console.log(`✅ Imagem recebida (${buffer.length} bytes)`)
        return buffer
      }

      return response.data
    } catch (error: any) {
      const errorMsg = error.message || 'Erro desconhecido'
      const errorCode = error.code || 'NO_CODE'
      const errorStatus = error.response?.status || 'NO_STATUS'
      const errorData = error.response?.data || 'NO_DATA'

      console.error(`❌ Erro na requisição Sankhya (tentativa ${tentativa}):`, errorMsg, `[${errorCode}] [HTTP ${errorStatus}]`)

      if (errorStatus === 400) {
        console.error(`❌ Detalhes do erro 400:`, errorData)
        console.error(`❌ URL da requisição:`, url)
        console.error(`❌ Headers enviados:`, config.headers)
      }

      // Retry em caso de timeout ou connection reset
      if ((errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT' || errorMsg.includes('timeout')) && tentativa < MAX_TENTATIVAS) {
        console.log(`⏳ Aguardando 2s antes de tentar novamente...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return this.fazerRequisicao(idEmpresa, endpoint, method, data, tentativa + 1)
      }

      throw error
    }
  }
}

export const sankhyaDynamicAPI = new SankhyaDynamicAPI();