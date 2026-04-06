import { sankhyaDynamicAPI } from './lib/sankhya-dynamic-api';

async function run() {
    const idEmpresa = 1; // ID de teste

    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 365);

    const formatDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    console.log(`Buscando de ${dataInicioStr} a ${dataFimStr}`);

    const payloadCabecalho = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
            dataSet: {
                rootEntity: 'CabecalhoNota',
                includePresentationFields: 'N',
                offsetPage: null,
                disableRowsLimit: false,
                entity: {
                    fieldset: {
                        list: 'NUNOTA,DTNEG,CODPARC,VLRNOTA,TIPMOV,Parceiro_NOMEPARC'
                    }
                },
                criteria: {
                    expression: {
                        $: `TIPMOV = 'V' AND STATUSNOTA = 'L' AND DTNEG >= '${dataInicioStr}' AND DTNEG <= '${dataFimStr}'`
                    }
                }
            }
        }
    };

    try {
        const responseCab = await sankhyaDynamicAPI.fazerRequisicao(
            idEmpresa,
            '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
            'POST',
            payloadCabecalho
        );

        console.log(JSON.stringify(responseCab, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
