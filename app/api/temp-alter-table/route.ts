import { NextResponse } from 'next/server';
import { oracleService } from '../../../lib/oracle-db';

export async function GET() {
    try {
        await oracleService.executeQuery('ALTER TABLE AD_POLITICASCOMERCIAIS ADD RESULT_CODTAB NUMBER');
        return NextResponse.json({ success: true, message: 'Column added successfully' });
    } catch (error: any) {
        if (error.message && error.message.includes('ORA-01430')) {
            return NextResponse.json({ success: true, message: 'Column already exists' });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
