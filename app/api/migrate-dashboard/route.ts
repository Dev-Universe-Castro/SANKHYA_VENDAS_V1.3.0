import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET() {
    try {
        const result = await oracleService.executeQuery("ALTER TABLE AD_ACESSOS_USUARIO ADD TELA_DASHBOARD VARCHAR2(1) DEFAULT 'S'");
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        if (error.message && error.message.includes('ORA-01430')) {
            return NextResponse.json({ success: true, message: 'Column already exists' });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
