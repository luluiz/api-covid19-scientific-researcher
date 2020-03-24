const FS = require('fs');
const EJS = require('ejs');
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
const Usuario = Mongoose.model('Usuario');
const Moment = require('moment-timezone');
const Utils = require('../../shared/utils.service');
const AutenticacaoService = require('./autenticacao.service');
const EmailService = require('../../shared/email.service');
var exports = module.exports = {};

module.exports.criar = async function (req, res) {
    console.log('params', req.params);
    console.log('body', req.body);
    let usuario = req.body;

    if (!usuario.email) Utils.res(res, false, 'O campo E-mail é obrigatório');
    else if (!usuario.nivel) Utils.res(res, false, 'O campo Nível é obrigatório');
    else if (!usuario.nome) Utils.res(res, false, 'O campo Nome é obrigatório');
    else if ((usuario.is_fornecedor && usuario.id_oficina) || (usuario.is_oficina && usuario.id_fornecedor))
        Utils.res(res, false, 'Inconsistencia nos dados.');
    else if (usuario.is_fornecedor && usuario.id_fornecedor === null) Utils.res(res, false, 'Informe o ID do fornecedor.');
    else if (usuario.is_oficina && !usuario.id_oficina) Utils.res(res, false, 'Informe o ID da oficina.');
    else if (usuario.nivel == 'ADMIN' && !usuario.senha) Utils.res(res, false, 'O campo Senha é obrigatório');
    else if (verificaSenhas(usuario.senha, usuario.senhaConfirmacao))
        Utils.res(res, false, 'A senha e sua confirmação não conferem.');
    else {
        if (usuario.is_fornecedor) usuario.id_fornecedor = usuario.id_fornecedor.trim();
        else if (usuario.is_oficina) usuario.id_oficina = usuario.id_oficina.trim();

        let _usuario = await Usuario.findOne({ email: usuario.email }, 'email');

        if (_usuario)
            Utils.res(res, false, 'E-mail já cadastrado.');
        else {
            let _senha = usuario.senha;
            usuario = new Usuario(usuario);
            usuario.save(erro => {
                if (erro) res.json({ success: false, message: 'Não foi possível criar o usuário', erro: erro });
                else {
                    let empresa;
                    if (usuario.is_fornecedor) empresa = req.body.decoded.fornecedor;
                    else if (usuario.is_oficina) empresa = req.body.decoded.oficina;
                    enviarEmailCadastro(empresa, usuario, _senha);

                    res.json({ success: true, message: 'Usuário criado com sucesso', usuario: usuario });
                }
            });
        }
    }
}

async function enviarEmailCadastro(empresa, usuario, senha) {
    let template = await FS.readFileSync('./shared/templates-email/registro_usuario.ejs', 'utf-8');
    let templateCompilado = await EJS.compile(template, { async: true });
    let html = await templateCompilado({
        path_files: Utils.getAppURL() + '/assets',
        link_login: Utils.getAppURL() + '/#/auth/login',
        nome_fantasia: empresa ? empresa.nome_fantasia : 'Admin Hubbi',
        nome: usuario.nome,
        email: usuario.email,
        senha: senha,
    });
    EmailService.enviar(usuario.email, 'Bem vindo ao Hubbi.', html);
}

module.exports.criarUsuarioInicial = async function (fornecedor, oficina, _usuario) {
    let usuario = {};
    if (fornecedor) {
        // console.log('Fornecedor:', fornecedor);
        usuario.id_fornecedor = fornecedor._id;
        usuario.nome = 'Administrador ' + fornecedor.nome_fantasia ? fornecedor.nome_fantasia : '';
        usuario.email = fornecedor.email;
        usuario.nivel = 'F_ADMIN';
        usuario.is_fornecedor = true;
    } else if (oficina) {
        // console.log('Oficina:', oficina);
        usuario.id_oficina = oficina._id;
        usuario.nome = 'Administrador ' + oficina.nome_fantasia ? oficina.nome_fantasia : '';
        usuario.email = oficina.email;
        usuario.nivel = 'O_ADMIN';
        usuario.is_oficina = true;
    }

    usuario.senha = _usuario.senha;
    usuario = new Usuario(usuario);
    return await usuario.save();
}

/**
 * Valida se as senhas são iguais.
 * @param {String} senha Senha informada pelo usuário
 * @param {String} senhaConfirmacao Confirmação da senha informada pelo usuário
 */
function verificaSenhas(senha, senhaConfirmacao) {
    return (senha && senhaConfirmacao && senha != senhaConfirmacao);
}

/**
 * @deprecated
 * Retorna uma senha randomica.
 * @param {Number} letters Qtd de letras que a senha poderá conter
 * @param {Number} numbers Qtd de números que a senha poderá conter
 * @param {Number} either Qtd de letras e números que a senha poderá conter
 */
function gerarSenha(letters, numbers, either) {
    // "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", // letters
    // "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" // either
    let chars = [
        "abcdefghijklmnopqrstuvwxyz", // letters
        "0123456789", // numbers
        "abcdefghijklmnopqrstuvwxyz0123456789" // either
    ];

    return [letters, numbers, either].map(function (len, i) {
        return Array(len).fill(chars[i]).map((x) => x[Math.floor(Math.random() * x.length)]).join('');
    }).concat().join('').split('').sort(() => 0.5 - Math.random()).join('')
}

module.exports.editar = async function (req, res) {
    // console.log('params', req.params);
    // console.log('body', req.body);
    let _u = await Usuario.findOne({ email: req.body.email }, 'email');

    if (_u)
        Utils.res(res, false, 'Usuário já existe.');
    else {
        let _usuario = req.body;
        _usuario.data_ultima_alteracao = new Date();

        Usuario.findOneAndUpdate({ _id: req.params.id_usuario }, _usuario, { new: true }, async function (erro, usuario) {
            if (erro) Utils.res(res, false, 'Não foi possível editar o registro.', erro);
            else if (!usuario) Utils.res(res, true, 'Não foi encontrado nenhum registro para alterar.');
            else {
                let token = await AutenticacaoService.generateToken(null, null, usuario._id, false);
                Utils.res(res, true, 'Registro alterado com sucesso.', null, { usuario: usuario, token: token });
            }
        });
    }
}

module.exports.deletar = async function (req, res) {
    // console.log('params', req.params)
    // console.log('query', req.query)
    let decoded = req.body.decoded;
    let usuarios;

    if (decoded.usuario.nivel == 'ADMIN' && Utils.str2bool(req.query.is_oficina))
        usuarios = await Usuario.countDocuments({ id_oficina: req.query.id_oficina, nivel: 'O_ADMIN' });
    else if (decoded.usuario.nivel == 'ADMIN' && Utils.str2bool(req.query.is_fornecedor))
        usuarios = await Usuario.countDocuments({ id_fornecedor: req.query.id_fornecedor, nivel: 'F_ADMIN' });

    if (usuarios <= 1)
        Utils.res(res, false, 'Não foi possível deletar. O usuário é o único administrador da conta.');
    else
        Usuario.deleteOne({ _id: req.params.id_usuario }, (erro) => {
            if (erro) Utils.res(res, false, 'Não foi possível deletar o registro.', erro);
            else Utils.res(res, true, 'Registro deletado com sucesso.', null);
        })
}

module.exports.find = function (req, res) {
    // console.log('query', req.query);
    // console.log('body', req.body);
    let query = setQuery(req);
    let select = setSelect(req);

    Usuario.find(query, select, function (erro, usuarios) {
        if (erro) Utils.res(res, false, 'Erro ao buscar usuários.', erro);
        else if (!usuarios) Utils.res(res, true, 'Não foram encontrados usuários.', null, { usuarios: usuarios });
        else Utils.res(res, true, 'Consulta realizada com sucesso.', null, { usuarios: usuarios })
    });
}

module.exports.findById = function (req, res) {
    // console.log('query', req.query);
    // console.log('body', req.body);
    let select = setSelect(req);

    Usuario.findById({ _id: req.params.id_usuario }, select, function (erro, usuario) {
        if (erro) Utils.res(res, false, 'Erro ao buscar usuários.', erro);
        else if (!usuario) Utils.res(res, true, 'Não foram encontrados usuários.', null, { usuario: usuario });
        else Utils.res(res, true, 'Consulta realizada com sucesso.', null, { usuario: usuario })
    });
}

module.exports.getN = function (req, res) {
    Usuario.countDocuments(function (erro, valor) {
        if (erro) res.json({ success: false, message: 'Erro ao contar usuários.' });
        else res.json({ success: true, n: valor });
    });
};

function setQuery(req) {
    let query = {};
    // console.log('req.query', req.query);

    if (req.body.decoded.usuario.is_oficina) query.id_oficina = req.body.decoded.oficina._id;
    else if (req.body.decoded.usuario.is_fornecedor) query.id_fornecedor = req.body.decoded.fornecedor._id;
    if (req.query.is_oficina) query.is_oficina = Utils.str2bool(req.query.is_oficina);
    if (req.query.is_fornecedor) query.is_fornecedor = Utils.str2bool(req.query.is_fornecedor);
    if (req.query.nivel) query.nivel = { $in: JSON.parse(req.query.nivel) };

    return query;
}

function setSelect(req) {
    let select = '';
    if (req.query.select) select = req.query.select;

    return select;
}