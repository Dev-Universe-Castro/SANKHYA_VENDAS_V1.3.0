import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = cookies()
        const userCookie = cookieStore.get('user')

        if (!userCookie) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const userData = JSON.parse(userCookie.value)
        const idSankhyaEmpresa = userData.ID_EMPRESA

        const { campanha, itens } = await request.json()

        if (!campanha || !itens) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        // 1. Obter ou gerar ID da Campanha
        let idCampanha = campanha.ID_CAMPANHA

        // Se o ID for muito grande (> 1 trilhão), consideramos como ID temporário local
        const isNew = !idCampanha || Number(idCampanha) > 1000000000000

        if (isNew) {
            // Gerar novo ID no Oracle (usando MAX + 1 como fallback se não houver sequence)
            const resId = await oracleService.executeQuery<{ ID: number }>(
                'SELECT NVL(MAX(ID_CAMPANHA), 0) + 1 as ID FROM AD_CAMPANHA'
            )
            idCampanha = resId[0].ID
        }

        // 2. Salvar/Atualizar Cabeçalho da Campanha
        const sqlCampanha = isNew
            ? `INSERT INTO AD_CAMPANHA (ID_CAMPANHA, ID_EMPRESA, NOME, TIPO, ATIVO, DTINICIO, DTFIM, DESCONTO_GERAL, OBSERVACAO) 
         VALUES (:idCampanha, :idEmpresa, :nome, :tipo, :ativo, :dtInicio, :dtFim, :descGeral, :obs)`
            : `UPDATE AD_CAMPANHA SET 
            NOME = :nome, 
            TIPO = :tipo, 
            ATIVO = :ativo, 
            DTINICIO = :dtInicio, 
            DTFIM = :dtFim, 
            DESCONTO_GERAL = :descGeral, 
            OBSERVACAO = :obs 
         WHERE ID_CAMPANHA = :idCampanha AND ID_EMPRESA = :idEmpresa`

        const paramsCampanha = {
            idCampanha,
            idEmpresa: idSankhyaEmpresa,
            nome: campanha.NOME,
            tipo: campanha.TIPO,
            ativo: campanha.ATIVO || 'S',
            dtInicio: campanha.DTINICIO ? new Date(campanha.DTINICIO) : new Date(),
            dtFim: campanha.DTFIM ? new Date(campanha.DTFIM) : null,
            descGeral: Number(campanha.DESCONTO_GERAL) || 0,
            obs: campanha.OBSERVACAO || ''
        }

        await oracleService.executeQuery(sqlCampanha, paramsCampanha)

        // 3. Salvar/Atualizar Itens
        // Para simplificar, vamos remover os itens antigos e inserir os novos (ou atualizar se preferir)
        // Se for edição, limpa os itens antes de reinserir
        if (!isNew) {
            await oracleService.executeQuery(
                'DELETE FROM AD_CAMPANHAITEM WHERE ID_CAMPANHA = :idCampanha',
                { idCampanha }
            )
        }

        // Buscar o próximo ID de item
        const resIdItem = await oracleService.executeQuery<{ ID: number }>(
            'SELECT NVL(MAX(ID_ITEM), 0) as ID FROM AD_CAMPANHAITEM'
        )
        let nextIdItem = resIdItem[0].ID + 1

        for (const item of itens) {
            const sqlItem = `INSERT INTO AD_CAMPANHAITEM (ID_ITEM, ID_CAMPANHA, CODPROD, QTDMIN, DESCONTO) 
                      VALUES (:idItem, :idCampanha, :codProd, :qtdMin, :desconto)`

            await oracleService.executeQuery(sqlItem, {
                idItem: nextIdItem++,
                idCampanha,
                codProd: Number(item.CODPROD),
                qtdMin: Number(item.QTDMIN) || 1,
                desconto: Number(item.DESCONTO) || 0
            })
        }

        return NextResponse.json({
            success: true,
            idCampanha,
            message: isNew ? 'Campanha criada com sucesso no Oracle' : 'Campanha atualizada com sucesso no Oracle'
        })

    } catch (error: any) {
        console.error('❌ Erro ao salvar campanha no Oracle:', error)
        return NextResponse.json({ error: error.message || 'Erro interno ao salvar' }, { status: 500 })
    }
}
