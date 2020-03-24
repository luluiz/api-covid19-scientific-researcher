const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
const Usuario = Mongoose.model('Usuario');
const Fornecedor = require('../../shared/schemas/fornecedor.model');
const Oficina = require('../../shared/schemas/oficina.model');
const JWT = require('jsonwebtoken');
const Utils = require('../../shared/utils.service');
const EmailService = require('../../shared/email.service');
const EJS = require('ejs');
const FS = require('fs');

var exports = module.exports = {};

module.exports.verify = async function (req, res, next) {

}

function consoleLog(req) {
    console.log('URL', req.method, req.url);
    console.log('params', req.params);
    console.log('body', req.body);
}

module.exports.login = function (req, res) {
    if (!req.body.email) Utils.res(res, false, 'Informe o e-mail.');
    else if (!req.body.senha) Utils.res(res, false, 'Informe uma senha.');
    else Usuario.findOne({ email: req.body.email })
        .select('_id is_fornecedor is_oficina nome senha email nivel tema.menu_reduzido tema.tema_escuro')
        .populate({ path: 'id_fornecedor', select: '_id email nome_fantasia status_cadastro email_cadastro_ativado financeiro.status' })
        .populate({ path: 'id_oficina', select: '_id email nome_fantasia status_cadastro email_cadastro_ativado financeiro.status' })
        .exec(async (erro, usuario) => {
            if (erro)
                Utils.res(res, false, 'Erro na tentativa de login.', erro);
            else if (!usuario)
                Utils.res(res, false, 'E-mail não cadastrado.', null);
            else if (usuario.is_fornecedor && !usuario.id_fornecedor)
                Utils.res(res, false, 'Fornecedor referente ao usuário não encotrada.', null);
            else if (usuario.is_oficina && !usuario.id_oficina)
                Utils.res(res, false, 'Oficina referente ao usuário não encotrada.', null);
            else if ((usuario.is_fornecedor && !usuario.id_fornecedor.email_cadastro_ativado && usuario.id_fornecedor.status_cadastro == 'ATIVO') ||
                (usuario.is_oficina && !usuario.id_oficina.email_cadastro_ativado && usuario.id_oficina.status_cadastro == 'ATIVO'))
                Utils.res(res, true, 'Conta ainda não ativada.', null,
                    { usuario: usuario, ativado: false, email_destino: usuario.is_fornecedor ? usuario.id_fornecedor.email : usuario.id_oficina.email });
            else if (await usuario.compararSenhas(req.body.senha)) {
                let token = await exports.generateToken(usuario, null, null, false)
                Utils.res(res, true, 'Login efetuado com sucesso', null, { token: token, usuario: usuario, ativado: true });
            } else
                Utils.res(res, false, 'Não foi possível autenticar o usuário, senha inválida.');
        })
}

module.exports.generateToken = async function (usuario, email, id_usuario, is_mobile, expiresIn) {
    // caso não possua o usuário, pega o email ou _id do usuário para buscar.
    if (!usuario) {
        let query = {};
        if (email) query.email = email;
        if (id_usuario) query._id = id_usuario;
        usuario = await Usuario.findOne(query)
            .select('_id is_fornecedor is_oficina nome senha email nivel tema.menu_reduzido tema.tema_escuro')
            .populate({ path: 'id_fornecedor', select: '_id nome_fantasia status_cadastro financeiro.status' })
            .populate({ path: 'id_oficina', select: '_id nome_fantasia status_cadastro financeiro.status' });
    }

    if (usuario) {
        let tokenParams = exports.setToken(usuario, usuario.id_fornecedor, usuario.id_oficina);
        let options = {};
        options.expiresIn = '12h';

        if (expiresIn) options.expiresIn = expiresIn;

        return JWT.sign(tokenParams, process.env.APP_SECRET, options);
    } else return null;
}

/**
 * Retorna os dados necessários para criar o token.
 * @param {object} usuario dados do usuário logado
 * @param {object} fornecedor dados do fornecedor do usuário logado
 * @param {object} oficina dados da oficina do usuário logado
 */
exports.setToken = function (usuario, fornecedor, oficina) {
    usuario = usuario.toObject();
    delete usuario.id_fornecedor;
    delete usuario.id_oficina;
    delete usuario.senha;

    let params = { usuario: usuario };

    if (fornecedor) params.fornecedor = fornecedor;
    else if (oficina) params.oficina = oficina;

    return params;
}

module.exports.esqueceuSenha = function (req, res) {
    // console.log('params', req.params);
    // console.log('body', req.body);
    let email = req.body.email;
    Usuario.find({ email: email })
        .select('_id id_fornecedor id_oficina is_fornecedor is_oficina')
        .populate({ path: 'id_fornecedor' })
        .populate({ path: 'id_oficina' })
        .exec(async (erro, usuarios) => {
            if (erro) Utils.res(res, false, 'Erro ao buscar usuário.')
            else if (!usuarios || (usuarios && usuarios.length == 0)) Utils.res(res, true, 'O e-mail ' + email + ' não possui cadastro.', null, { type: 'SEM_CADASTRO' });
            else {
                let dadosUsuario = [];
                usuarios.forEach(usuario => {
                    // const conta = usuario.is_fornecedor ? usuario.id_fornecedor._id : usuario.id_oficina._id;
                    const nome_fantasia = usuario.is_fornecedor ? usuario.id_fornecedor.nome_fantasia : usuario.id_oficina.nome_fantasia;
                    let token = JWT.sign({
                        email: email,
                        id_usuario: usuario._id,
                        is_fornecedor: usuario.is_fornecedor,
                        is_oficina: usuario.is_oficina,
                        nome_fantasia: nome_fantasia,
                    }, process.env.APP_SECRET, { expiresIn: '24h' });

                    dadosUsuario.push({ nome_fantasia: nome_fantasia, token: token });
                });
                enviarEmailEsqueciSenha(dadosUsuario, email)
                    .then(response => {
                        // console.log('response sendEmail', response);
                        res.json({ success: true, message: "Você receberá as instruções para o cadastro de uma nova senha em seu e-mail." })
                    }).catch(erro => {
                        console.error('Erro ao enviar email', erro);
                        res.json({ success: false, message: "Não foi possível enviar o e-mail de recuperação de senha.", erro });
                    });
            }
        });
}

async function enviarEmailEsqueciSenha(dados, destinatario) {
    let template = await FS.readFileSync('./shared/templates-email/esqueci_senha.ejs', 'utf-8');
    let templateCompilado = await EJS.compile(template, { async: true });
    let html = await templateCompilado({
        path_files: Utils.getAppURL() + '/assets',
        link_recuperar_senha: Utils.getAppURL() + '/#/auth/alterar_senha/',
        dados: dados,
        email: destinatario
    });
    return await EmailService.enviar(destinatario, 'Esqueceu a senha?', html);
}

module.exports.recuperarSenha = function (req, res) {
    Usuario.findOne({ _id: req.params.id_usuario }, (erro, usuario) => {
        if (erro) Utils.res(res, false, 'Erro ao buscar usuário');
        else if (!usuario) Utils.res(res, false, 'Usuário não cadastrado');
        else {
            usuario.senha = req.body.senha;
            usuario.save(erro => {
                if (erro) Utils.res(res, false, 'Erro ao salvar nova senha.');
                else Utils.res(res, true, 'Senha alterada com sucesso.');
            });
        }
    });
}

module.exports.alterarSenha = function (req, res) {
    // console.log('req.body', req.body);
    if (req.body.nova_senha !== req.body.nova_senha_confirmacao)
        Utils.res(res, false, 'A confirmação de senha não confere.');
    else
        Usuario.findById({ _id: req.params.id_usuario }, async (erro, usuario) => {
            if (erro) Utils.res(res, false, 'Erro ao buscar usuário', erro);
            else if (!usuario) Utils.res(res, false, 'Usuário não cadastrado');
            else if (await usuario.compararSenhas(req.body.senha)) {
                usuario.senha = req.body.nova_senha;
                usuario.save(erro => {
                    if (erro) Utils.res(res, false, 'Erro ao salvar nova senha.');
                    else Utils.res(res, true, 'Senha alterada com sucesso.');
                });
            } else Utils.res(res, false, 'Senha inválida. Não foi possível autenticar o usuário.');
        });
}

/** Validar token de alteração de senha */
module.exports.validarTokenAlterSenha = function (req, res) {
    JWT.verify(req.body.token, process.env.APP_SECRET, function (erro, decoded) {
        if (erro) Utils.res(res, false, 'Link inválido.');
        else {
            if (Utils.isExpired(decoded.exp))
                Utils.res(res, false, 'Link de alteração de senha expirou.');
            else
                Usuario.findOne({ _id: decoded.id_usuario, email: decoded.email }, (erro, usuario) => {
                    if (erro) Utils.res(res, false, "Erro ao buscar usuário.");
                    else if (!usuario) Utils.res(res, false, "Usuário não encontrado.");
                    else Utils.res(res, true, 'Token validado com sucesso', null, { usuario: usuario });
                })
        }
    });
}

/** Validar token de ativação de conta após o cadastro */
module.exports.validarTokenAtivacao = function (req, res) {
    JWT.verify(req.body.token, process.env.APP_SECRET, async function (erro, decoded) {
        if (erro) Utils.res(res, false, 'Link inválido.');
        else if (!ObjectId.isValid(decoded._id)) Utils.res(res, false, 'Link inválido. Conta não reconhecida.');
        else {
            let FornecedorOficina;
            if (decoded.is_fornecedor) FornecedorOficina = Fornecedor;
            else if (decoded.is_oficina) FornecedorOficina = Oficina;

            if (FornecedorOficina) {
                let _fornecedorOficina = await FornecedorOficina.findById(decoded._id).select('_id email_cadastro_ativado').exec();
                console.log('_fornecedorOficina', _fornecedorOficina)

                if (_fornecedorOficina && _fornecedorOficina.email_cadastro_ativado)
                    Utils.res(res, true, 'Seu cadastro já foi ativado.');
                else if (_fornecedorOficina && !_fornecedorOficina.email_cadastro_ativado)
                    FornecedorOficina
                        .findByIdAndUpdate(decoded._id, { email_cadastro_ativado: true })
                        .then(value => Utils.res(res, true, 'Cadastro ativado com sucesso.', null, { doc: value }))
                        .catch(erro => Utils.res(res, false, 'Ocorreu um erro ao ativar o cadastro.', erro))
                else
                    Utils.res(res, false, 'Conta não cadastrada.');
            }
        }
    });
}

/**
 * Token gerado no momento do cadastro da oficina/fornecedor e enviando junto ao link de ativação da conta por e-mail.
 */
module.exports.generateTokenAtivacao = function (is_fornecedor, is_oficina, _id) {
    if (_id && (is_fornecedor || is_oficina)) {
        let tokenParams = {
            is_fornecedor: is_fornecedor,
            is_oficina: is_oficina,
            _id: _id
        };
        return JWT.sign(tokenParams, process.env.APP_SECRET)
    } else return null;
}

module.exports.reenviarEmailAtivacao = async function (req, res) {
    let fornecedor_oficina = req.body.is_fornecedor ? req.body.id_fornecedor : req.body.id_oficina;
    let token = exports.generateTokenAtivacao(req.body.is_fornecedor, req.body.is_oficina, fornecedor_oficina._id);

    enviarEmailCadastro(fornecedor_oficina, token)
        .then(response => {
            if (response.accepted && response.accepted.length > 0)
                Utils.res(res, true, 'E-mail de ativação reenviado com sucesso para ' + response.accepted[0]);
            else if (response.rejected && response.rejected.length > 0)
                Utils.res(res, false, 'Não foi possível enviar o e-mail de ativação para ' + response.rejected[0] + '. O e-mail foi rejeitado.');
            else
                Utils.res(res, false, 'Não foi possível enviar o e-mail de ativação.');
        })
        .catch(erro => {
            console.log('Erro ao reenviar e=mail de ativação:', erro);
            Utils.res(res, false, 'Erro ao reenviar e=mail de ativação:', erro);
        });
}

async function enviarEmailCadastro(dados, token) {
    let template = await FS.readFileSync('./shared/templates-email/registro.ejs', 'utf-8');
    let templateCompilado = await EJS.compile(template, { async: true });
    let html = await templateCompilado({
        path_files: Utils.getAppURL() + '/assets',
        link_login: Utils.getAppURL() + '/#/auth/login',
        link_ativacao: Utils.getAppURL() + '/#/auth/ativacao/' + token,
        nome_fantasia: dados.nome_fantasia,
        email: dados.email,
    });
    return await EmailService.enviar(dados.email, 'Bem vindo ao Hubbi.', html);
}
