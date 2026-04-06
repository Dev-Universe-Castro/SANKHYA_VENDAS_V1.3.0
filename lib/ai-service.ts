
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIConfig {
    provedor: string;
    modelo: string;
    credential: string;
    responseMimeType?: string;
}

export class AIService {
    static getModel(config: AIConfig) {
        const provedor = config.provedor?.toLowerCase() || 'gemini';
        const modelo = config.modelo || 'gemini-1.5-flash';
        const credential = config.credential;

        if (provedor === 'gemini' || provedor === 'google') {
            const genAI = new GoogleGenerativeAI(credential);
            return genAI.getGenerativeModel({
                model: modelo,
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 8192,
                    topP: 0.95,
                    topK: 40,
                    ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {})
                }
            });
        }

        // Futuras implementações para OpenAI, Grok, etc.
        if (provedor === 'openai') {
            throw new Error('Provedor OpenAI ainda não implementado no AIService');
        }

        throw new Error(`Provedor de IA desconhecido: ${provedor}`);
    }

    static isGemini(provedor?: string) {
        const p = provedor?.toLowerCase() || 'gemini';
        return p === 'gemini' || p === 'google';
    }

    /**
     * Executa uma função com lógica de retry e backoff exponencial.
     * Ideal para lidar com erros 503 (Service Unavailable) e 429 (Too Many Requests).
     */
    static async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
        let lastError: any;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                const status = error.status || (error.response?.status);
                
                // Erros que valem a pena tentar denovo: 503 (indisponível), 504 (timeout), 429 (quota)
                const shouldRetry = status === 503 || status === 429 || status === 504 || 
                                   error.message?.includes('high demand') || 
                                   error.message?.includes('Service Unavailable');

                if (shouldRetry && i < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, i); // Backoff exponencial: 2s, 4s, 8s...
                    console.warn(`[AIService] Erro temporário da IA (Status: ${status}). Tentativa ${i + 1} de ${maxRetries}. Aguardando ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error;
            }
        }
        
        throw lastError;
    }
}
