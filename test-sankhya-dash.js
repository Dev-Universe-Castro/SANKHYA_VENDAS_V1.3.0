const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'config.env.local') });
const fetch = require('node-fetch');

async function testarSankhya() {
    const url = `http://${process.env.SANKHYA_HOST}:${process.env.SANKHYA_PORT}/mge/api/v1/login`;
    console.log('Logando em:', url);

    const loginRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'appkey': process.env.SANKHYA_APPKEY },
        body: JSON.stringify({ NOMUSU: process.env.SANKHYA_USER, INTERNO: process.env.SANKHYA_PASSWORD })
    });

    const session = await loginRes.json();
    const jsessionid = session.responseBody.jsessionid;
    console.log('Session ID:', jsessionid);

    const recordUrl = `http://${process.env.SANKHYA_HOST}:${process.env.SANKHYA_PORT}/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;

    const cabecalhoReq = await fetch(recordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `JSESSIONID=${jsessionid}` },
        body: JSON.stringify({
            serviceName: 'CRUDServiceProvider.loadRecords',
            requestBody: {
                dataSet: {
                    rootEntity: 'CabecalhoNota',
                    includePresentationFields: 'N',
                    offsetPage: null,
                    disableRowsLimit: false,
                    entity: { fieldset: { list: 'NUNOTA,DTNEG,CODPARC,VLRNOTA,TIPMOV,Parceiro_NOMEPARC' } },
                    criteria: { expression: { $: `TIPMOV = 'V' AND STATUSNOTA = 'L'` } }
                }
            }
        })
    });

    const dados = await cabecalhoReq.json();
    console.log('Total Cabecalho:', dados.responseBody.entities?.total);
    if (dados.responseBody.entities?.entity) {
        console.log('Primeiro registro:', Array.isArray(dados.responseBody.entities.entity) ? dados.responseBody.entities.entity[0] : dados.responseBody.entities.entity);
    } else {
        console.log('Erro ou sem dados:', dados);
    }
}

testarSankhya();
