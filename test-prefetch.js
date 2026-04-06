const http = require('http');

const cookie = 'user=' + encodeURIComponent(JSON.stringify({
    id: 102,
    username: "fabiopimentateste@gmail.com",
    ID_EMPRESA: 41
}));

const req = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/prefetch',
    method: 'POST',
    headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
    }
}, res => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            console.log('Prefetch successful.');
            console.log('Politicas:', parsed.politicasComerciais?.count);
            if (parsed.politicasComerciais?.data) {
                console.log('Sample Data:', JSON.stringify(parsed.politicasComerciais.data[0], null, 2));
            }
            if (parsed.error) {
                console.error('Prefetch error:', parsed.error);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.error('Raw Body (first 1000 chars):', body.substring(0, 1000));
        }
    });
});

req.on('error', e => console.error(e));
req.end();
