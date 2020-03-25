const app = require('./app');
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV != 'test')
    app.listen(PORT, function () {
        console.log(`Server is running on port ${PORT}.`);
    });


// // PRODUÇÃO - SERVIDOR NODE HTTPS COM OS CERTIFICADO
// // const https = require('https');
// // const tls = require('tls');
// // const fs = require('fs');

// // https.createServer({
// //     key: fs.readFileSync('./ssl/localhost.key'),
// //     cert: fs.readFileSync('./ssl/localhost.cert'),
// //     minVersion: 'TLSv1',
// // }, app).listen(url.port, function () {
// //     console.log(`Backend is running on port ${url.port}.`);
// // });