import { sankhyaDynamicAPI } from './lib/sankhya-dynamic-api';

async function run() {
    try {
        const empresaId = 41; // Typical ID
        const payloadPedidos = {
            serviceName: "CRUDServiceProvider.loadRecords",
            requestBody: {
                dataSet: {
                    rootEntity: "CabecalhoNota",
                    includePresentationFields: "S",
                    disableRowsLimit: false,
                    entity: { fieldset: { list: "NUNOTA, CODPARC, CODVEND, VLRNOTA, DTNEG, TIPMOV" } },
                    criteria: { expression: { $: "TIPMOV = 'V' AND ROWNUM <= 2" } }
                }
            }
        };

        const endpointUrl = "/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
        console.log("Fetching...");
        const resPedidos = await sankhyaDynamicAPI.fazerRequisicao(empresaId, endpointUrl, "POST", payloadPedidos);

        console.log("Raw Response Metadata:", JSON.stringify(resPedidos.responseBody?.entities?.metadata, null, 2));

        const rawEntities = Array.isArray(resPedidos.responseBody?.entities?.entity)
            ? resPedidos.responseBody.entities.entity
            : [resPedidos.responseBody?.entities?.entity];

        console.log("Raw entity 0:", JSON.stringify(rawEntities[0], null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}

run();
