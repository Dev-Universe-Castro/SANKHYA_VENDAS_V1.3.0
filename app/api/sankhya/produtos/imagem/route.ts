import { NextRequest, NextResponse } from 'next/server';
import { sankhyaDynamicAPI } from '@/lib/sankhya-dynamic-api';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const codProd = searchParams.get('codProd');

        if (!codProd) {
            return new NextResponse('codigoProduto não fornecido', { status: 400 });
        }

        const cookieStore = cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return new NextResponse('Usuário não autenticado', { status: 401 });
        }

        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const idEmpresa = user.ID_EMPRESA || user.id_empresa;

        if (!idEmpresa) {
            return new NextResponse('Empresa não identificada', { status: 400 });
        }

        try {
            // Tentativa de buscar a imagem através do dbimage padrão Sankhya
            // Adicionando /gateway/v1 que é necessário para chamadas OAuth no Sandbox
            // Novo formato de endpoint conforme exemplo funcional fornecido pelo usuário:
            // https://api.sandbox.sankhya.com.br/gateway/v1/mge/Produto@IMAGEM@CODPROD=530.dbimage
            const endpoint = `/gateway/v1/mge/Produto@IMAGEM@CODPROD=${codProd}.dbimage`;
            console.log(`🖼️ [IMAGEM] Solicitando imagem para produto ${codProd} na empresa ${idEmpresa}`);

            const imageBuffer = await sankhyaDynamicAPI.fazerRequisicao(Number(idEmpresa), endpoint, 'GET');

            // Use .length para Buffer e verifique magic bytes básicos
            const isImage = imageBuffer && imageBuffer.length > 300 && (
                (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) || // JPEG
                (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) || // PNG
                (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) || // GIF
                (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49)    // WEBP (RIFF)
            );

            if (!isImage) {
                console.warn(`⚠️ [IMAGEM] Retorno não parece ser uma imagem válida ou é muito pequeno (${imageBuffer?.length} bytes) para produto ${codProd}. Tentando fallback...`);
                throw new Error('FallbackDbImage');
            }

            return new NextResponse(imageBuffer, {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=86400',
                },
            });
        } catch (apiError: any) {
            const status = apiError.response?.status;
            if (apiError.message === 'FallbackDbImage' || status === 404 || status === 400) {
                console.log(`🔍 [IMAGEM] Fallback iniciado para produto ${codProd} via loadRecords...`);
                // Fallback: Tentativa via CRUDServiceProvider.loadRecords
                try {
                    // Adicionando /gateway/v1 para Sandbox OAuth
                    const loadRecordsEndpoint = `/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;
                    const payload = {
                        serviceName: "CRUDServiceProvider.loadRecords",
                        requestBody: {
                            dataSet: {
                                rootEntity: "ImagensItem",
                                includePresentationFields: "N",
                                offsetPage: "0",
                                criteria: {
                                    expression: {
                                        $: `CODPROD = ${codProd}`
                                    }
                                },
                                entity: {
                                    fieldset: {
                                        list: "IMAGEM"
                                    }
                                }
                            }
                        }
                    };

                    const loadResponse = await sankhyaDynamicAPI.fazerRequisicao(Number(idEmpresa), loadRecordsEndpoint, 'POST', payload);
                    const entity = loadResponse?.responseBody?.entities?.entity?.[0];

                    if (entity?.IMAGEM?.$) {
                        const base64Str = entity.IMAGEM.$;
                        console.log(`✅ [IMAGEM] Imagem recuperada via LoadRecords (Base64) para produto ${codProd}`);
                        const buffer = Buffer.from(base64Str, 'base64');
                        
                        // Validar magic bytes do buffer Base64
                        const isValidBuffer = buffer && buffer.length > 300 && (
                            (buffer[0] === 0xFF && buffer[1] === 0xD8) || // JPEG
                            (buffer[0] === 0x89 && buffer[1] === 0x50) || // PNG
                            (buffer[0] === 0x47 && buffer[1] === 0x49) || // GIF
                            (buffer[0] === 0x52 && buffer[1] === 0x49)    // WEBP
                        );

                        if (!isValidBuffer) {
                            console.warn(`❌ [IMAGEM] Buffer Base64 para produto ${codProd} não parece ser uma imagem válida.`);
                        } else {
                            return new NextResponse(buffer, {
                                headers: {
                                    'Content-Type': 'image/jpeg',
                                    'Cache-Control': 'public, max-age=86400',
                                },
                            });
                        }
                    } else {
                        console.warn(`❌ [IMAGEM] LoadRecords não encontrou imagem para produto ${codProd}`);
                    }
                } catch (fallbackError) {
                    console.error('❌ [IMAGEM] Erro no fallback de imagem (loadRecords):', fallbackError);
                }

                // Return 404 immediately so UI can fallback to Avatar
                return new NextResponse('Imagem não encontrada na API', { status: 404 });
            }
            throw apiError;
        }
    } catch (error: any) {
        console.error('❌ [IMAGEM] Erro na API de imagem:', error);
        return new NextResponse('Erro ao buscar imagem na API', { status: error.response?.status || 500 });
    }
}
