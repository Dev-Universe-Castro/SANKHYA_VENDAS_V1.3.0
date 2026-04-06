
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { oracleService } from '@/lib/oracle-db';
import { accessControlService } from '@/lib/access-control-service';

/**
 * Rota para gerenciar visitas (Check-in / Status)
 * URL: /api/rotas/visitas
 */
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const user = JSON.parse(userCookie.value);
        const idEmpresa = user.ID_EMPRESA || user.idEmpresa;
        const userId = user.CODUSUARIO || user.id;

        const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa);

        let sql = `
      SELECT 
        v.CODVISITA,
        v.ID_EMPRESA,
        v.CODROTA,
        v.CODPARC,
        v.CODVEND,
        v.DATA_VISITA,
        v.HORA_CHECKIN,
        v.HORA_CHECKOUT,
        v.STATUS,
        v.OBSERVACAO,
        v.PEDIDO_GERADO,
        v.NUNOTA,
        v.VLRTOTAL,
        p.NOMEPARC
      FROM AD_VISITAS v
      LEFT JOIN AS_PARCEIROS p ON v.CODPARC = p.CODPARC AND p.ID_SISTEMA = v.ID_EMPRESA
      WHERE v.ID_EMPRESA = :idEmpresa
    `;

        const binds: any = { idEmpresa };

        if (status) {
            sql += ` AND v.STATUS = :status`;
            binds.status = status;
        }

        // Filtro de acordo com o papel (se não for admin, vê apenas as suas)
        if (!userAccess.isAdmin && userAccess.codVendedor) {
            sql += ` AND v.CODVEND = :codVend`;
            binds.codVend = userAccess.codVendedor;
        }

        sql += ` ORDER BY v.DATA_VISITA DESC, v.CODVISITA DESC`;

        const visitas = await oracleService.executeQuery<any>(sql, binds);

        return NextResponse.json(visitas);
    } catch (error: any) {
        console.error('Error in /api/rotas/visitas GET:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const { action, codVisita, codParc, codRota, latitude, longitude, observacao, pedidoGerado, nunota, vlrTotal } = body;
        const user = JSON.parse(userCookie.value);
        const idEmpresa = user.ID_EMPRESA || user.idEmpresa;
        const userId = user.CODUSUARIO || user.id;

        const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa);
        const codVend = userAccess.codVendedor;

        if (action === 'checkin') {
            let finalCodVisita = codVisita;

            if (!finalCodVisita) {
                // Obter próximo ID
                const nextIdSql = `SELECT NVL(MAX(CODVISITA), 0) + 1 as NEXTID FROM AD_VISITAS`;
                const nextIdRes = await oracleService.executeOne<any>(nextIdSql);
                finalCodVisita = nextIdRes.NEXTID;

                // Inserir nova visita
                await oracleService.executeQuery(`
          INSERT INTO AD_VISITAS (CODVISITA, ID_EMPRESA, CODROTA, CODPARC, CODVEND, DATA_VISITA, STATUS, DTCAD, HORA_CHECKIN, LAT_CHECKIN, LNG_CHECKIN)
          VALUES (:finalCodVisita, :idEmpresa, :codRota, :codParc, :codVend, TRUNC(SYSDATE), 'CHECKIN', SYSDATE, SYSTIMESTAMP, :lat, :lng)
        `, {
                    finalCodVisita,
                    idEmpresa,
                    codRota: codRota || null,
                    codParc,
                    codVend: codVend || null,
                    lat: latitude || null,
                    lng: longitude || null
                });
            } else {
                // Atualizar visita existente para CHECKIN
                await oracleService.executeQuery(`
          UPDATE AD_VISITAS 
          SET STATUS = 'CHECKIN', 
              HORA_CHECKIN = SYSTIMESTAMP, 
              LAT_CHECKIN = :lat,
              LNG_CHECKIN = :lng
          WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa
        `, {
                    codVisita,
                    idEmpresa,
                    lat: latitude || null,
                    lng: longitude || null
                });
            }

            return NextResponse.json({ success: true, codVisita: finalCodVisita });

        } else if (action === 'checkout') {
            if (!codVisita) {
                return NextResponse.json({ error: 'codVisita é obrigatório para checkout' }, { status: 400 });
            }

            await oracleService.executeQuery(`
        UPDATE AD_VISITAS
        SET STATUS = 'CONCLUIDA',
            HORA_CHECKOUT = SYSTIMESTAMP,
            OBSERVACAO = :observacao,
            PEDIDO_GERADO = :pedidoGerado,
            NUNOTA = :nunota,
            VLRTOTAL = :vlrTotal,
            LAT_CHECKOUT = :lat,
            LNG_CHECKOUT = :lng
        WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa
      `, {
                codVisita,
                idEmpresa,
                observacao: observacao || null,
                pedidoGerado: pedidoGerado ? 'S' : 'N',
                nunota: nunota ? parseInt(nunota) : null,
                vlrTotal: vlrTotal ? parseFloat(vlrTotal) : null,
                lat: latitude || null,
                lng: longitude || null
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error: any) {
        console.error('Error in /api/rotas/visitas POST:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
