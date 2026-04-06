const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/gemini/analise?t=123', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'user={"id":102,"name":"Fabio Pimenta Teste","ID_EMPRESA":41,"id_empresa":41,"role":"Administrador","isAdmin":true}'
            },
            body: JSON.stringify({
                prompt: "Analise minhas vendas...",
                dataInicio: "2026-01-01",
                dataFim: "2026-01-15"
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Result:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}
test();
