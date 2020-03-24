const router = require('express').Router();
const jwt = require('jsonwebtoken');

let rotasNoToken = [
    { metodo: 'POST', url: '/api/usuario' },
    { metodo: 'POST', url: '/api/fornecedor' },
    { metodo: 'POST', url: '/api/oficina' },
    { metodo: 'POST', url: '/api/registrar' },
    { metodo: 'POST', url: '/api/login' },
    { metodo: 'POST', url: '/api/usuario/esqueceu_senha' },
    { metodo: 'POST', url: '/api/usuario/recuperar_senha/:id_usuario' },
    { metodo: 'POST', url: '/api/usuario/validar_token' },
    { metodo: 'POST', url: '/api/ativacao/ativar' },
    { metodo: 'POST', url: '/api/ativacao/reenviar' },
];

module.exports = function (app) {
    app.use('/api', router);

    // Middleware para rotas que verificam o token. 
    // Coloca todas as rotas após essa rota que exigem que o usuário já esteja logado.

    // router.use(function (req, res, next) {
    //     const token = req.body.token || req.body.query || req.headers['x-access-token'];
    //     if (isRotaPermitida(req.url, req.method))
    //         next();
    //     else if (token)
    //         jwt.verify(token, process.env.APP_SECRET, function (erro, decoded) {
    //             if (erro)
    //                 res.status(401).send('Acesso não autorizado: token inválido.');
    //             else if (isExpired(decoded.exp))
    //                 res.status(403).send('Acesso não autorizado: token expirado.');
    //             else {
    //                 req.body.decoded = decoded;
    //                 next();
    //             }
    //         });
    //     else
    //         res.json({ success: false, message: 'Nenhum token fornecido.' }).status(401);
    // });

    router.post('/me', function (req, res) {
        res.send(req.decoded);
    });


    return router;
};

function isRotaPermitida(rota, metodo) {
    let isPermitida = false;
    for (let i = 0; i < rotasNoToken.length; i++)
        if (isUrlValida(rota, rotasNoToken[i].url) && rotasNoToken[i].metodo == metodo.toUpperCase())
            isPermitida = true;

    return isPermitida;
};

function isUrlValida(url, url_no_token) {
    let params = [];
    if (url_no_token.includes(':')) {
        let splitterAux = url_no_token.split('/');
        url_no_token = '';
        splitterAux.forEach((item, index) => {
            if (item.includes(':')) params.push({ valor: item, pos: index });
            else if (!item.includes(':') && index > 0) url_no_token += '/' + item
        });
    }

    // Array de rotas/parâmetros
    let splitter = url.split('/');

    // Se houver parametros é removido os parametros da url informada;
    if (params.length > 0) splitter = removeParams(params, splitter);

    // Monta a rota a partir do array de rotas/parametros.
    let rota = montarRota(splitter);

    return rota == url_no_token;
}

function isExpired(exp) {
    var timeStamp = Math.floor(Date.now() / 1000);
    var timeCheck = exp - timeStamp;

    return (timeCheck < 0) ? true : false;
}

function removeParams(params, splitter) {
    for (let i = params.length - 1; i >= 0; i--) {
        const param = params[i];
        splitter.splice(param.pos - 1, 1);
    }

    return splitter;
}

function montarRota(splitter) {
    let rota = '/api';
    splitter.forEach((item, index) => (index > 0) ? rota += '/' + item : null);
    return rota;
}