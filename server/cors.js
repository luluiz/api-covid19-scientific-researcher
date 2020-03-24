//exportando o middleware para permitir acessar outra aplicação em outra porta
module.exports = function (req, res, next) {
    //permitindo acessar de qualquer origem (endereços)
    res.header('Access-Control-Allow-Origin', '*');
    //permitindo metodos HTTP
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    //permitindo cabeçalhos suportados pela API
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token');
    //chamada do next para proseguir para o proximo middleware do request
    res.header("Access-Control-Allow-Credentials", true);
    next();
};