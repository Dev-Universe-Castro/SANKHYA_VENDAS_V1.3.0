import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { oracleService } from '@/lib/oracle-db'
import { accessControlService } from '@/lib/access-control-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    const rotasFilter = accessControlService.getRotasWhereClause(userAccess)

    const { searchParams } = new URL(request.url)
    const codRota = searchParams.get('codRota')

    let sql: string
    let binds: Record<string, any> = { idEmpresa, ...rotasFilter.binds }

    if (codRota) {
      sql = `
        SELECT 
          r.CODROTA, r.ID_EMPRESA, r.DESCRICAO, r.CODVEND, r.TIPO_RECORRENCIA,
          r.DIAS_SEMANA, r.INTERVALO_DIAS, r.DATA_INICIO, r.DATA_FIM, r.ATIVO, r.DTCAD,
          v.APELIDO AS NOMEVENDEDOR
        FROM AD_ROTAS r
        LEFT JOIN AS_VENDEDORES v ON r.CODVEND = v.CODVEND AND v.ID_SISTEMA = r.ID_EMPRESA
        WHERE r.CODROTA = :codRota AND r.ID_EMPRESA = :idEmpresa ${rotasFilter.clause}
      `
      binds.codRota = parseInt(codRota)
    } else {
      sql = `
        SELECT 
          r.CODROTA, r.ID_EMPRESA, r.DESCRICAO, r.CODVEND, r.TIPO_RECORRENCIA,
          r.DIAS_SEMANA, r.INTERVALO_DIAS, r.DATA_INICIO, r.DATA_FIM, r.ATIVO, r.DTCAD,
          v.APELIDO AS NOMEVENDEDOR
        FROM AD_ROTAS r
        LEFT JOIN AS_VENDEDORES v ON r.CODVEND = v.CODVEND AND v.ID_SISTEMA = r.ID_EMPRESA
        WHERE r.ID_EMPRESA = :idEmpresa AND r.ATIVO = 'S' ${rotasFilter.clause}
        ORDER BY r.DESCRICAO
      `
    }

    const rotas = await oracleService.executeQuery<any>(sql, binds)

    for (const rota of rotas) {
      const parceirosSql = `
        SELECT 
          rp.CODROTAPARC, rp.CODROTA, rp.CODPARC, rp.ORDEM,
          NVL(pl.LATITUDE, rp.LATITUDE) AS LATITUDE, 
          NVL(pl.LONGITUDE, rp.LONGITUDE) AS LONGITUDE, 
          rp.TEMPO_ESTIMADO,
          p.NOMEPARC
        FROM AD_ROTA_PARCEIROS rp
        INNER JOIN AD_ROTAS rot ON rp.CODROTA = rot.CODROTA AND rot.ID_EMPRESA = :idEmpresa
        LEFT JOIN AS_PARCEIROS p ON rp.CODPARC = p.CODPARC AND p.ID_SISTEMA = :idEmpresa AND p.SANKHYA_ATUAL = 'S'
        LEFT JOIN AD_PARCEIROS_LOC pl ON rp.CODPARC = pl.CODPARC AND pl.ID_SISTEMA = :idEmpresa
        WHERE rp.CODROTA = :codRota AND rp.ID_EMPRESA = :idEmpresa
        ORDER BY rp.ORDEM
      `
      rota.parceiros = await oracleService.executeQuery<any>(parceirosSql, { idEmpresa, codRota: rota.CODROTA })
    }

    return NextResponse.json(codRota ? rotas[0] || null : rotas)
  } catch (error: any) {
    console.error('Erro ao buscar rotas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar rotas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    
    if (!accessControlService.canCreateOrEdit(userAccess)) {
      return NextResponse.json({ error: accessControlService.getAccessDeniedMessage(userAccess) }, { status: 403 })
    }

    const body = await request.json()
    const { descricao, codVend, tipoRecorrencia, diasSemana, intervaloDias, dataInicio, dataFim, parceiros, adicionarCalendario } = body

    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: 'Data de início e data de fim são obrigatórias' }, { status: 400 })
    }

    const codVendFinal = codVend || userAccess.codVendedor

    const insertSql = `
      INSERT INTO AD_ROTAS (CODROTA, ID_EMPRESA, DESCRICAO, CODVEND, TIPO_RECORRENCIA, DIAS_SEMANA, INTERVALO_DIAS, DATA_INICIO, DATA_FIM, ATIVO, DTCAD)
      VALUES ((SELECT NVL(MAX(CODROTA), 0) + 1 FROM AD_ROTAS), :idEmpresa, :descricao, :codVend, :tipoRecorrencia, :diasSemana, :intervaloDias, TO_DATE(:dataInicio, 'YYYY-MM-DD'), TO_DATE(:dataFim, 'YYYY-MM-DD'), 'S', SYSDATE)
    `

    await oracleService.executeQuery(insertSql, {
      idEmpresa,
      descricao,
      codVend: codVendFinal ? parseInt(codVendFinal.toString()) : null,
      tipoRecorrencia,
      diasSemana: Array.isArray(diasSemana) ? diasSemana.join(',') : (diasSemana || null),
      intervaloDias: intervaloDias || null,
      dataInicio,
      dataFim
    })

    const lastRotaSql = `
      SELECT CODROTA FROM AD_ROTAS 
      WHERE ID_EMPRESA = :idEmpresa AND DESCRICAO = :descricao
      ORDER BY DTCAD DESC, CODROTA DESC FETCH FIRST 1 ROWS ONLY
    `
    const lastRota = await oracleService.executeOne<any>(lastRotaSql, { idEmpresa, descricao })
    const codRota = lastRota?.CODROTA

    if (codRota && parceiros && parceiros.length > 0) {
      await oracleService.executeQuery(`DELETE FROM AD_ROTA_PARCEIROS WHERE CODROTA = :codRota AND ID_EMPRESA = :idEmpresa`, { codRota, idEmpresa })

      for (const parceiro of parceiros) {
        const insertParcSql = `
          INSERT INTO AD_ROTA_PARCEIROS (CODROTAPARC, CODROTA, CODPARC, ORDEM, LATITUDE, LONGITUDE, TEMPO_ESTIMADO, ID_EMPRESA)
          VALUES ((SELECT NVL(MAX(CODROTAPARC), 0) + 1 FROM AD_ROTA_PARCEIROS), :codRota, :codParc, :ordem, :latitude, :longitude, :tempoEstimado, :idEmpresa)
        `
        await oracleService.executeQuery(insertParcSql, {
          codRota,
          codParc: parceiro.codParc,
          ordem: parceiro.ordem,
          latitude: parceiro.latitude || null,
          longitude: parceiro.longitude || null,
          tempoEstimado: parceiro.tempoEstimado || 30,
          idEmpresa
        })
      }

      const dataInicioObj = new Date(dataInicio + 'T00:00:00')
      const dataFimObj = new Date(dataFim + 'T23:59:59')
      
      for (const parceiro of parceiros) {
        // Buscar nome do parceiro se não estiver no objeto
        let nomeParc = parceiro.NOMEPARC;
        if (!nomeParc) {
          const pData = await oracleService.executeOne<any>(`
            SELECT NOMEPARC FROM AS_PARCEIROS 
            WHERE CODPARC = :codParc AND ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'
          `, { codParc: parceiro.codParc, idEmpresa });
          nomeParc = pData?.NOMEPARC || 'Parceiro';
        }

        let dataAtual = new Date(dataInicioObj)
        while (dataAtual <= dataFimObj) {
          let deveCriar = false
          
          if (tipoRecorrencia === 'DIARIA') {
            deveCriar = true
          } else if (tipoRecorrencia === 'SEMANAL' && diasSemana) {
            const diaSemanaAtual = dataAtual.getDay()
            const diasSemanaArray = Array.isArray(diasSemana) 
              ? diasSemana.map(String) 
              : (typeof diasSemana === 'string' ? diasSemana.split(',') : [])
            
            if (diasSemanaArray.includes(diaSemanaAtual.toString())) {
              deveCriar = true
            }
          } else if (tipoRecorrencia === 'INTERVALO' && intervaloDias) {
            const diffTime = dataAtual.getTime() - dataInicioObj.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            const intervalo = parseInt(intervaloDias.toString())
            if (intervalo > 0 && diffDays % intervalo === 0) {
              deveCriar = true
            }
          }

            if (deveCriar) {
              // Usar data local para evitar problemas de fuso horário ISO
              const yyyy = dataAtual.getFullYear()
              const mm = String(dataAtual.getMonth() + 1).padStart(2, '0')
              const dd = String(dataAtual.getDate()).padStart(2, '0')
              const dataVisitaStr = `${yyyy}-${mm}-${dd}`
              
              const insertVisitaSql = `
                INSERT INTO AD_VISITAS (CODVISITA, ID_EMPRESA, CODROTA, CODPARC, CODVEND, DATA_VISITA, STATUS, DTCAD)
                VALUES ((SELECT NVL(MAX(CODVISITA), 0) + 1 FROM AD_VISITAS), :idEmpresa, :codRota, :codParc, :codVend, TO_DATE(:dataVisita, 'YYYY-MM-DD'), 'PENDENTE', SYSDATE)
              `
              await oracleService.executeQuery(insertVisitaSql, {
                idEmpresa,
                codRota,
                codParc: parceiro.codParc,
                codVend: codVendFinal,
                dataVisita: dataVisitaStr
              })

            if (adicionarCalendario) {
              const lastVisita = await oracleService.executeOne<any>(`
                SELECT CODVISITA FROM AD_VISITAS 
                WHERE CODROTA = :codRota AND CODPARC = :codParc AND DATA_VISITA = TO_DATE(:dataVisita, 'YYYY-MM-DD')
                ORDER BY CODVISITA DESC FETCH FIRST 1 ROWS ONLY
              `, { codRota, codParc: parceiro.codParc, dataVisita: dataVisitaStr });
              
              const codVisita = lastVisita?.CODVISITA;

              if (codVisita) {
                console.log(`📅 Criando tarefa para visita ${codVisita}, parceiro ${parceiro.codParc}`);
                // AD_ADLEADSATIVIDADES:
                // DATA_HORA, DATA_INICIO, DATA_FIM -> TIMESTAMP(6) (Usar SYSTIMESTAMP)
                // DATA_CRIACAO -> DATE (Usar SYSDATE)
                // STATUS -> Deve ser 'AGUARDANDO' para cumprir a constraint SYS_C008856
                const insertTarefaSql = `
                  INSERT INTO AD_ADLEADSATIVIDADES (
                    ID_EMPRESA, TIPO, DESCRICAO, DATA_HORA, 
                    DATA_INICIO, DATA_FIM, CODUSUARIO, 
                    COR, ORDEM, ATIVO, STATUS, DATA_CRIACAO, TITULO,
                    CODPARC, CODROTA, CODVISITA
                  ) VALUES (
                    :idEmpresa, 'VISITA', :descricaoTarefa, TO_TIMESTAMP(:dataVisita || ' 08:00:00', 'YYYY-MM-DD HH24:MI:SS'), 
                    TO_TIMESTAMP(:dataVisita || ' 08:00:00', 'YYYY-MM-DD HH24:MI:SS'), 
                    TO_TIMESTAMP(:dataVisita || ' 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), :userId, 
                    '#10b981', 0, 'S', 'AGUARDANDO', SYSDATE, :tituloTarefa,
                    :codParc, :codRota, :codVisita
                  )
                `;
                try {
                  await oracleService.executeQuery(insertTarefaSql, {
                    idEmpresa,
                    descricaoTarefa: `Visita agendada via rota: ${descricao}`,
                    dataVisita: dataVisitaStr,
                    userId,
                    tituloTarefa: `Visita: ${nomeParc}`,
                    codParc: parceiro.codParc,
                    codRota,
                    codVisita
                  });
                  console.log(`✅ Tarefa criada com sucesso para visita ${codVisita}`);
                } catch (taskError: any) {
                  console.error(`❌ Erro ao criar tarefa para visita ${codVisita}:`, taskError.message);
                }
              }
            }
          }
          dataAtual.setDate(dataAtual.getDate() + 1)
        }
      }
    }

    return NextResponse.json({ success: true, codRota })
  } catch (error: any) {
    console.error('Erro ao criar rota:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar rota' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    
    if (!accessControlService.canCreateOrEdit(userAccess)) {
      return NextResponse.json({ error: accessControlService.getAccessDeniedMessage(userAccess) }, { status: 403 })
    }

    const body = await request.json()
    const { codRota, descricao, codVend, tipoRecorrencia, diasSemana, intervaloDias, dataInicio, dataFim, ativo, parceiros } = body

    const updateSql = `
      UPDATE AD_ROTAS
      SET DESCRICAO = :descricao,
          CODVEND = :codVend,
          TIPO_RECORRENCIA = :tipoRecorrencia,
          DIAS_SEMANA = :diasSemana,
          INTERVALO_DIAS = :intervaloDias,
          DATA_INICIO = TO_DATE(:dataInicio, 'YYYY-MM-DD'),
          DATA_FIM = TO_DATE(:dataFim, 'YYYY-MM-DD'),
          ATIVO = :ativo,
          DTALTER = SYSDATE
      WHERE CODROTA = :codRota AND ID_EMPRESA = :idEmpresa
    `

    await oracleService.executeQuery(updateSql, {
      descricao,
      codVend,
      tipoRecorrencia,
      diasSemana: diasSemana || null,
      intervaloDias: intervaloDias || null,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
      ativo: ativo || 'S',
      codRota,
      idEmpresa
    })

    if (parceiros !== undefined) {
      await oracleService.executeQuery(`DELETE FROM AD_ROTA_PARCEIROS WHERE CODROTA = :codRota AND ID_EMPRESA = :idEmpresa`, { codRota, idEmpresa })

      for (const parceiro of parceiros) {
        const insertParcSql = `
          INSERT INTO AD_ROTA_PARCEIROS (CODROTAPARC, CODROTA, CODPARC, ORDEM, LATITUDE, LONGITUDE, TEMPO_ESTIMADO, ID_EMPRESA)
          VALUES ((SELECT NVL(MAX(CODROTAPARC), 0) + 1 FROM AD_ROTA_PARCEIROS), :codRota, :codParc, :ordem, :latitude, :longitude, :tempoEstimado, :idEmpresa)
        `
        await oracleService.executeQuery(insertParcSql, {
          codRota,
          codParc: parceiro.codParc,
          ordem: parceiro.ordem,
          latitude: parceiro.latitude || null,
          longitude: parceiro.longitude || null,
          tempoEstimado: parceiro.tempoEstimado || null,
          idEmpresa
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar rota:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar rota' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    
    if (!userAccess.isAdmin) {
      return NextResponse.json({ error: 'Apenas administradores podem excluir rotas' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const codRota = searchParams.get('codRota')

    if (!codRota) {
      return NextResponse.json({ error: 'codRota é obrigatório' }, { status: 400 })
    }

    // Removida a trava de verificação de visitas em andamento/concluídas 
    // para permitir a desativação da rota mantendo o histórico.

    const deleteTarefasSql = `
      UPDATE AD_ADLEADSATIVIDADES 
      SET STATUS = 'EXCLUIDA'
      WHERE CODROTA = :codRota 
      AND ID_EMPRESA = :idEmpresa 
      AND STATUS = 'AGUARDANDO'
    `
    await oracleService.executeQuery(deleteTarefasSql, { codRota: parseInt(codRota), idEmpresa })

    const deleteVisitasSql = `
      UPDATE AD_VISITAS 
      SET STATUS = 'EXCLUIDA'
      WHERE CODROTA = :codRota AND ID_EMPRESA = :idEmpresa AND STATUS = 'PENDENTE'
    `
    await oracleService.executeQuery(deleteVisitasSql, { codRota: parseInt(codRota), idEmpresa })

    const deactivateSql = `
      UPDATE AD_ROTAS
      SET ATIVO = 'N', DTALTER = SYSDATE
      WHERE CODROTA = :codRota AND ID_EMPRESA = :idEmpresa
    `

    await oracleService.executeQuery(deactivateSql, { codRota: parseInt(codRota), idEmpresa })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao excluir rota:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir rota' },
      { status: 500 }
    )
  }
}
