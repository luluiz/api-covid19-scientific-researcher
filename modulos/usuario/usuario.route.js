const express = require('express');
const router = express.Router();
const Usuario = require('../../shared/schemas/usuario.model');
const Autenticacao = require('./autenticacao.service');
const usuarioService = require('./usuario.service');

module.exports = function (app) {
    app.use('/api', router);

    router.post('/usuario/:id_empresa', Autenticacao.verify, usuarioService.criar);
    router.put('/usuario/:id_empresa/:id_usuario', Autenticacao.verify, usuarioService.editar);
    router.delete('/usuario/:id_empresa/:id_usuario', Autenticacao.verify, usuarioService.deletar);
    router.get('/usuario', Autenticacao.verify, usuarioService.find);
    router.get('/usuario/:id_usuario', Autenticacao.verify, usuarioService.findById);
    router.get('/n_usuarios', Autenticacao.verify, usuarioService.getN);
    router.post('/login', Autenticacao.login);
    router.post('/usuario/esqueceu_senha', Autenticacao.esqueceuSenha);
    router.post('/usuario/recuperar_senha/:id_usuario', Autenticacao.recuperarSenha);
    router.post('/usuario/alterar_senha/:id_usuario', Autenticacao.alterarSenha);
    router.post('/usuario/validar_token', Autenticacao.validarTokenAlterSenha);
    router.post('/ativacao/ativar', Autenticacao.validarTokenAtivacao);
    router.post('/ativacao/reenviar', Autenticacao.reenviarEmailAtivacao);

    // router.put('/usuario/:email', Autenticacao.alterarSenha);
    // router.get('/usuario/:email', Autenticacao.findUsuarioByEmail);
    // router.post('/esqueceu_senha', Autenticacao.esqueceu_senha);
    return router;
};
