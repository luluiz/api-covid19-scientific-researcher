const Multer = require('multer');
const Moment = require('moment-timezone');
Moment.locale('pt-br');
const Mongoose = require('mongoose');
const _ = require('lodash');
const ObjectId = Mongoose.Types.ObjectId;
const Cotacao = Mongoose.model('Cotacao');
const Fornecedor = require('../../shared/schemas/fornecedor.model');
const Pedido = require('../../shared/schemas/pedido.model');
const ConfigService = require('../config/config.service');
const Utils = require('../../shared/utils.service');
const Sinesp = require('sinesp-api');
const UploadService = require('../../shared/upload-file.service');

module.exports.getN = function (req, res) {
    Cotacao.countDocuments(function (erro, valor) {
        if (erro) res.json({ success: false, message: 'Erro ao contar cotações.' });
        else res.json({ success: true, n: valor });
    });
};

module.exports.criar = function (req, res) {
    UploadService.uploadFiles(req, res, async function (erro) {
        // console.log('params', req.params);
        // console.log('body', req.body);
        // console.log('files - ', req.files.length + ' - ', req.files);
        if (erro instanceof Multer.MulterError) console.error(erro);
        else if (erro) console.error(erro);
        else {
            let cotacao = JSON.parse(req.body.cotacao);
            let files = req.files;
            let file_aux = JSON.parse(req.body.file_aux);

            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    let arquivo = await montarAnexo(file, cotacao.id_oficina);

                    if (arquivo && file_aux[i].desc == 'cotacao') cotacao.fotos[file_aux[i].index] = arquivo;
                    else if (arquivo && file_aux[i].desc == 'item') cotacao.itens[file_aux[i].index].imagem = arquivo;
                }
            }
            cotacao._id = ObjectId();
            cotacao = new Cotacao(cotacao);
            cotacao.data_cadastro = new Date();
            cotacao.itens.forEach(it => {
                it._id = ObjectId();
                it.id_cotacao = cotacao._id;
            });

            if (cotacao.status == 'A_ORCAR') {
                let tempo_cotacao = await ConfigService.getTempoCotacao();
                cotacao.tempo = Moment().add(tempo_cotacao, 'hour');
                cotacao.data_iniciado = new Date();
            }

            // console.log('COTACAO: ', cotacao);
            cotacao.save(erro => {
                if (erro) Utils.res(res, false, 'Não foi possível criar a cotação', erro);
                else Utils.res(res, true, 'Cotação criada com sucesso', null, { cotacao: cotacao });
            });
        }
    });
}

async function montarAnexo(file, id) {
    let anexo;
    if (file.originalname == 'blob') await Utils.removeFile(file);
    else {
        let origem = file.destination;

        let moveFile = await Utils.moveFile(file, id, origem);
        if (moveFile == 'error') await Utils.removeFile(file);
        else anexo = Utils.setFile(file, id);
    }
    return anexo;
}

module.exports.get = async function (req, res) {
    // console.log('query', req.query);
    // console.log('body', req.body);
    let query_cotacao = {}, query_pedidos = {};

    // COTAÇÃO
    if (req.query._id) query_cotacao._id = req.query._id;
    if (req.query.id_cotacao && !req.query.id_pedido)
        query_cotacao.id_cotacao = req.query.id_cotacao;
    else if (req.query.id_cotacao && req.query.id_pedido)
        query_cotacao.id_cotacao = null;
    else if (!req.query.id_cotacao && req.query.id_pedido)
        query_cotacao.id_cotacao = null;

    if (req.body.decoded.oficina && req.body.decoded.oficina._id) query_cotacao.id_oficina = ObjectId(req.body.decoded.oficina._id);
    if (req.query.status_cotacao) query_cotacao.status = { $in: req.query.status_cotacao };
    if (req.query.marca) query_cotacao.marca = req.query.marca;
    if (req.query.modelo) query_cotacao.modelo = req.query.modelo;
    if (req.query.ano_fab) query_cotacao.ano_fab = { $regex: req.query.ano_fab, $options: 'i' };
    if (req.query.ano_mod) query_cotacao.ano_mod = { $regex: req.query.ano_mod, $options: 'i' };
    if (req.query.placa) query_cotacao.placa = { $regex: req.query.placa, $options: 'i' };
    if (req.query.periodo_cadastro_de && req.query.periodo_cadastro_ate) query_cotacao.data_cadastro = {
        $gte: Moment(new Date(req.query.periodo_cadastro_de)).startOf('day').toDate(), $lte: Moment(new Date(req.query.periodo_cadastro_ate)).endOf('day').toDate()
    }

    // PEDIDO
    if (req.query.status_pedido) query_pedidos.status = { $in: req.query.status_pedido };
    // if (req.query.id_pedido) query_pedidos.id_pedido = req.query.id_pedido;
    // else 
    if (req.query.id_pedido && req.query.id_cotacao) {
        query_pedidos.id_pedido = req.query.id_pedido;
        query_pedidos.id_cotacao_seq = req.query.id_cotacao;
    } else if (req.query.id_pedido && !req.query.id_cotacao)
        query_pedidos.id_pedido = req.query.id_pedido;
    else if (!req.query.id_pedido && req.query.id_cotacao)
        query_pedidos.id_cotacao_seq = req.query.id_cotacao;

    if (req.body.decoded.fornecedor && req.body.decoded.fornecedor._id) query_pedidos.id_fornecedor = ObjectId(req.body.decoded.fornecedor._id);
    if (req.query.marca) query_pedidos.marca = req.query.marca;
    if (req.query.modelo) query_pedidos.modelo = req.query.modelo;
    if (req.query.ano_fab) query_pedidos.ano_fab = { $regex: req.query.ano_fab, $options: 'i' };
    if (req.query.ano_mod) query_pedidos.ano_mod = { $regex: req.query.ano_mod, $options: 'i' };
    if (req.query.placa) query_pedidos.placa = { $regex: req.query.placa, $options: 'i' };
    if (req.query.periodo_cadastro_de && req.query.periodo_cadastro_ate) query_pedidos.data_cadastro = {
        $gte: Moment(new Date(req.query.periodo_cadastro_de)).startOf('day').toDate(), $lte: Moment(new Date(req.query.periodo_cadastro_ate)).endOf('day').toDate()
    }


    let select_cotacao = '', select_pedido = '';
    if (req.query.select_cotacao) select_cotacao = req.query.select_cotacao;
    if (req.query.select_pedido) select_pedido = req.query.select_pedido;

    let populate_oficina;
    if (req.query.populate_oficina) populate_oficina = { path: 'id_oficina', select: req.query.populate_oficina };
    let populate_fornecedor;
    if (req.query.populate_fornecedor) populate_fornecedor = { path: 'id_fornecedor', select: req.query.populate_fornecedor };
    let populate_cotacao;
    if (req.query.populate_cotacao) populate_cotacao = { path: 'id_cotacao', select: req.query.populate_cotacao };
    let populate_pedido;
    if (req.query.populate_pedido) populate_pedido = {
        path: 'pedidos', select: req.query.populate_pedido,
        populate: {
            path: 'id_fornecedor', select: req.query.populate_fornecedor
        }
    };
    // if (true) populate_pedido = { path: 'pedidos' };
    // console.log('select_cotacao', select_cotacao)
    // console.log('select_pedido', select_pedido)
    // console.log('query_cotacao', query_cotacao)
    // console.log('query_pedidos', query_pedidos)

    let cotacoes = [], pedidos = [], response = [], erro = [];
    if (includesStatusCotacao(req.query.status_cotacao)) {
        cotacoes = await Cotacao.find(query_cotacao)
            .select(select_cotacao)
            .populate({ path: 'id_usuario', select: '_id nome email' })
            .populate(populate_oficina)
            .populate(populate_pedido)
            .exec();
        if (cotacoes && req.query.id_fornecedor) cotacoes = await filterByFornecedor(cotacoes, req.query.id_fornecedor, req.query.status_cotacao, select_cotacao, query_cotacao);
        response = _.concat(response, cotacoes)
    }

    if (includesStatusPedido(req.query.status_pedido)) {
        pedidos = await Pedido.find(query_pedidos)
            .select(select_pedido)
            .populate({ path: 'id_usuario', select: '_id nome email' })
            .populate(populate_oficina)
            .populate(populate_fornecedor)
            .populate(populate_cotacao)
            .exec();

        response = _.concat(response, pedidos)
    }

    Utils.res(res, true, 'Consulta realizada com sucesso.', null, { cotacoes: response });
}


module.exports.filterByFornecedor = filterByFornecedor;
async function filterByFornecedor(cotacoes, id_fornecedor, query_status, select_cotacao, query_cotacao) {
    let fornecedor = await Fornecedor.findById(id_fornecedor).select('_id segmentos');
    let map_segmentos = _.keyBy(fornecedor.segmentos, '_id');

    let _cotacoes = [];
    let has_a_orcar = query_status.includes('A_ORCAR');
    let has_orcado = query_status.includes('ORCADO');
    let loadCotEnviadas = false;

    cotacoes.forEach(cotacao => {
        let fornecedorEnviou = false;
        if (has_a_orcar || has_orcado) {
            // Se consultar "ORCADO", sinaliza para carregar cotações enviadas.
            if (has_orcado) loadCotEnviadas = true;
            cotacao.orcamentos.forEach(orcamento => {
                if (orcamento.is_enviado && orcamento.id_fornecedor == id_fornecedor)
                    fornecedorEnviou = true;
            });

            if (!fornecedorEnviou)
                _cotacoes = processaCotacao(cotacao, _cotacoes, map_segmentos);
        } else
            _cotacoes = processaCotacao(cotacao, _cotacoes, map_segmentos);
    });

    if (loadCotEnviadas) _cotacoes = await carregarCotEnviadas(id_fornecedor, select_cotacao, _cotacoes, query_cotacao);

    return _cotacoes;
}

function includesStatusCotacao(status_cotacao) {
    return status_cotacao && (status_cotacao.includes('NAO_ENVIADA') ||
        status_cotacao.includes('A_ORCAR') ||
        status_cotacao.includes('ORCADO') ||
        status_cotacao.includes('PENDENTE_PEDIDO') ||
        status_cotacao.includes('COT_FINALIZADA') ||
        status_cotacao.includes('COT_CANCELADA')
    );
}

function includesStatusPedido(status_pedido) {
    return status_pedido && (status_pedido.includes('A_CONFIRMAR') ||
        status_pedido.includes('A_ENTREGAR') ||
        status_pedido.includes('DEVOLUCAO') ||
        status_pedido.includes('CANCELADO') ||
        status_pedido.includes('FINALIZADO'));
}

module.exports.getById = function (req, res) {
    // console.log('query', req.query);
    // console.log('body', req.body);
    let query = { _id: req.params.id_cotacao };
    if (req.body.decoded.usuario.is_oficina) query.id_oficina = ObjectId(req.body.decoded.oficina._id)
    else if (req.body.decoded.usuario.is_fornecedor) query['orcamentos.id_fornecedor'] = ObjectId(req.body.decoded.fornecedor._id)

    let select = '';
    if (req.query.select) select = req.query.select;

    let populate_oficina = {}, populate_orcamentos_fornecedor = {};
    if (req.query.populate_oficina) populate_oficina = { path: 'id_oficina', select: req.query.populate_oficina };
    if (req.query.populate_orcamentos_fornecedor) populate_orcamentos_fornecedor = { path: 'orcamentos.id_fornecedor', select: req.query.populate_orcamentos_fornecedor };

    Cotacao.findOne(query)
        .select(select)
        .populate(populate_oficina)
        .populate(populate_orcamentos_fornecedor)
        .exec(function (erro, cotacao) {
            if (erro) Utils.res(res, false, 'Erro ao buscar cotações.', erro);
            else if (!cotacao) Utils.res(res, false, 'Cotação não encontrada.', null, { cotacao: cotacao });
            else Utils.res(res, true, 'Consulta realizada com sucesso.', null, { cotacao: cotacao })
        });
}

module.exports.editar = function (req, res) {
    UploadService.uploadFiles(req, res, async function (erro) {
        // console.log('params', req.params);
        // console.log('body', req.body);
        // console.log('files', req.files);
        if (erro instanceof Multer.MulterError) console.error(erro);
        else if (erro) console.error(erro);
        else {
            let cotacao = JSON.parse(req.body.cotacao);
            let files = req.files;
            let file_aux = JSON.parse(req.body.file_aux);

            let id_oficina = (cotacao.id_oficina && cotacao.id_oficina._id) ? cotacao.id_oficina._id : cotacao.id_oficina;
            if (files.length > 1) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    let arquivo = await montarAnexo(file, id_oficina);
                    if (arquivo && file_aux[i].desc == 'cotacao') cotacao.fotos[file_aux[i].index] = arquivo;
                    else if (arquivo && file_aux[i].desc == 'item') cotacao.itens[file_aux[i].index].imagem = arquivo;
                }
            }

            cotacao.data_ultima_alteracao = new Date();
            cotacao.itens.forEach(it => !it.id_cotacao ? it.id_cotacao = cotacao._id : null);
            if (cotacao.iniciar)
                cotacao.data_iniciado = new Date();

            // console.log('ALTERACOES', cotacao);
            Cotacao.findOneAndUpdate({ _id: req.params.id_cotacao }, cotacao, { new: true }, function (erro, _cotacao) {
                if (erro) Utils.res(res, false, 'Não foi possível editar o registro.', erro);
                else Utils.res(res, true, 'Registro alterado com sucesso.', null, { cotacao: _cotacao });
            });
        }
    });
}

module.exports.editarImagemItem = function (req, res) {
    UploadService.UploadService.uploadFile(req, res, async function (erro) {
        // console.log('params', req.params);
        // console.log('body', req.body);
        // console.log('files', req.files);
        if (erro instanceof Multer.MulterError) console.error(erro);
        else if (erro) console.error(erro);
        else {
            let file = req.file;
            Cotacao.findById(req.params.id_cotacao, async (erro, cotacao) => {
                if (erro) Utils.res(res, false, 'Ocorreu um erro ao buscar a cotação.', erro);
                else if (!cotacao) Utils.res(res, false, 'Cotação não encontrada.', erro);
                else {
                    let imagem = await montarAnexo(file, req.params.id_oficina);

                    // Editando imagem do item
                    cotacao.itens.forEach(item => (item._id == req.params.id_item) ? item.imagem = imagem : null);
                    // Editando imagem do item no orçamento
                    cotacao.orcamentos.forEach(orcamento => {
                        orcamento.itens.forEach(item => (item._id_item == req.params.id_item) ? item.imagem = imagem : null);
                    });

                    cotacao.data_ultima_alteracao = new Date();
                    cotacao.save(erro => {
                        if (erro) Utils.res(res, false, 'Não foi possível editar o registro.', erro);
                        else Utils.res(res, true, 'Registro alterado com sucesso.', null, { cotacao: cotacao, imagem: imagem });
                    });
                }
            });
        }
    });
}

module.exports.editarImagemCotacao = function (req, res) {
    UploadService.UploadService.uploadFiles(req, res, async function (erro) {
        // console.log('params', req.params);
        // console.log('files', req.files);
        if (erro instanceof Multer.MulterError) console.error(erro);
        else if (erro) console.error(erro);
        else {
            let files = req.files;
            Cotacao.findById(req.params.id_cotacao, async (erro, cotacao) => {
                if (erro) Utils.res(res, false, 'Ocorreu um erro ao buscar a cotação.', erro);
                else if (!cotacao) Utils.res(res, false, 'Cotação não encontrada.', erro);
                else {
                    for (let i = 0; i < files.length; i++) {
                        const imagem = await montarAnexo(files[i], req.params.id_oficina);
                        if (imagem) cotacao.fotos.push(imagem);
                    }

                    cotacao.data_ultima_alteracao = new Date();
                    cotacao.save(erro => {
                        if (erro) Utils.res(res, false, 'Não foi possível editar o registro.', erro);
                        else Utils.res(res, true, 'Registro alterado com sucesso.', null, { cotacao: cotacao });
                    });
                }
            });
        }
    });
}

module.exports.deletar = function (req, res) {
    Cotacao.deleteOne({ _id: req.params.id_cotacao }, (erro) => {
        if (erro) Utils.res(res, false, 'Não foi possível deletar o registro.', erro);
        else Utils.res(res, true, 'Registro deletado com sucesso.', null);
    })
}

module.exports.cancelar = function (req, res) {
    Cotacao.findOneAndUpdate({ _id: req.params.id_cotacao }, { status: 'COT_CANCELADA' }, (erro) => {
        if (erro) Utils.res(res, false, 'Não foi possível cancelar o registro.', erro);
        else Utils.res(res, true, 'Registro cancelado com sucesso.', null);
    })
}

module.exports.ignorar_pendente = function (req, res) {
    Cotacao.findOneAndUpdate({ _id: req.params.id_cotacao }, { status: 'COT_FINALIZADA' }, (erro) => {
        if (erro) Utils.res(res, false, 'Não foi possível ignorar o registro.', erro);
        else Utils.res(res, true, 'Cotação finalizada com sucesso.', null);
    })
}

module.exports.getCotacoesFornecedor = async function (req, res) {
    // console.log('params', req.params)
    // console.log('query', req.query)
    let fornecedor = await Fornecedor.findById(req.body.decoded.fornecedor._id).select('_id segmentos');
    let map_segmentos = _.keyBy(fornecedor.segmentos, '_id');
    // console.log('Fornecedor', fornecedor);

    let query = {};
    if (req.query.status) query.status = { $in: req.query.status };
    if (req.query.periodo_cadastro_de && req.query.periodo_cadastro_ate) query.data_cadastro = {
        $gte: Moment(new Date(req.query.periodo_cadastro_de)).startOf('day').toDate(), $lte: Moment(new Date(req.query.periodo_cadastro_ate)).endOf('day').toDate()
    }

    let select = '';
    if (req.query.select) select = req.query.select;

    Cotacao.find(query)
        .select(select)
        .lean()
        .exec(async function (erro, cotacoes) {
            if (erro) Utils.res(res, false, 'Erro ao buscar cotações.', erro);
            else if (!cotacoes) Utils.res(res, true, 'Não foram encontradas cotações.', null, { cotacoes: cotacoes });
            else {
                let _cotacoes = [];
                let has_a_orcar = req.query.status.includes('A_ORCAR');
                let has_orcado = req.query.status.includes('ORCADO');

                let loadCotEnviadas = false;
                cotacoes.forEach(cotacao => {
                    let fornecedorEnviou = false;

                    if (has_a_orcar || has_orcado) {
                        // Se consultar "ORCADO", sinaliza para carregar cotações enviadas.
                        if (has_orcado) loadCotEnviadas = true;

                        cotacao.orcamentos.forEach(orcamento => {
                            if (orcamento.is_enviado && orcamento.id_fornecedor == req.params.id_fornecedor)
                                fornecedorEnviou = true;
                        });

                        if (!fornecedorEnviou)
                            _cotacoes = processaCotacao(cotacao, _cotacoes, map_segmentos);
                    } else
                        _cotacoes = processaCotacao(cotacao, _cotacoes, map_segmentos);
                });

                if (loadCotEnviadas) _cotacoes = await carregarCotEnviadas(req.params.id_fornecedor, select, _cotacoes);

                Utils.res(res, true, 'Consulta realizada com sucesso.', null, { cotacoes: _cotacoes });
            }
        });
}

/**
 * Carrega as cotaçoes que já foram enviadas e o tempo para orçar continua válido. 
 * Essas cotações enviadas serão alteradas para status "ORCADO" apenas visualmente para o fornecedor, mas no banco continua como "A_ORCAR".
 * @param {string} id_fornecedor _id do fornecedor
 * @param {string} select select da consulta
 * @param {array} _cotacoes lista de cotações
 * @param {object} query_cotacao query da consulta
 */
async function carregarCotEnviadas(id_fornecedor, select, _cotacoes, query_cotacao) {
    let _query = { status: 'A_ORCAR', 'orcamentos.id_fornecedor': id_fornecedor, 'orcamentos.is_enviado': true };
    if (query_cotacao) _query = _.merge(_query, query_cotacao);
    let cotEnviados = await Cotacao.find(_query).select(select).lean();

    cotEnviados.forEach(cotacao => {
        let is_cotacao_enviada = false;
        if (cotacao.orcamentos && cotacao.orcamentos.length > 0)
            cotacao.orcamentos.forEach(o => (o.id_fornecedor == id_fornecedor && o.is_enviado) ? is_cotacao_enviada = true : null);

        if (is_cotacao_enviada) {
            cotacao.status = 'ORCADO';
            _cotacoes.push(cotacao);
        }
    });
    return _cotacoes;
}

function processaCotacao(cotacao, _cotacoes, map_segmentos) {
    let _cotacao = _.cloneDeep(cotacao);
    _cotacao.itens = [];

    // Filtro de Segmentos: seleciona os itens da cotação com segmentos que o fornecedor trabalha
    if (cotacao.itens)
        cotacao.itens.forEach(item => {
            if (map_segmentos[item.segmento])
                _cotacao.itens.push(item);
        });

    // Cotações: Add a cotação se tiver itens após a filtragem por segmento
    if (_cotacao.itens && _cotacao.itens.length > 0)
        _cotacoes.push(_cotacao);

    return _cotacoes;
}


/**
 * Atualiza os status dos itens de A_ORCAR para ORCADO.
 */
module.exports.atualizaOrcados = async function (req, res, next) {
    await Cotacao.updateMany(
        {
            status: 'A_ORCAR',
            tempo: { $lt: Moment().toDate() }
        },
        { status: 'ORCADO', data_orcado: new Date() },
        (erro, raw) => (erro) ? console.error('ERRO ao atualizaOrcados():', erro) : null);
    next();
}

module.exports.getTotalCotacoes = async function (req, res) {
    let cotacoes = await Cotacao.find({ id_oficina: req.body.decoded.oficina._id, status: { $in: ['A_ORCAR', 'ORCADO', 'A_CONFIRMAR', 'PENDENTE_PEDIDO', 'COT_FINALIZADA'] } })
        .select('status').exec();

    let pedidos = await Pedido.find({ id_oficina: req.body.decoded.oficina._id })
        .select('status').exec();

    let dados = {
        total_cotacoes: cotacoes.length,
        total_pedidos: pedidos.length,
        cotacoes_andamento: cotacoes.filter(it => it.status == 'A_ORCAR' || it.status == 'ORCADO').length,
        cotacoes_finalizadas: cotacoes.filter(it => it.status == 'PENDENTE_PEDIDO' || it.status == 'COT_FINALIZADA').length,
        cotacoes_canceladas: cotacoes.filter(it => it.status == 'COT_CANCELADA').length,
        pedidos_andamento: pedidos.filter(it => it.status == 'A_CONFIRMAR' || it.status == 'A_ENTREGAR').length,
        pedidos_finalizados: pedidos.filter(it => it.status == 'FINALIZADO' || it.status == 'DEVOLUCAO').length,
        pedidos_cancelados: pedidos.filter(it => it.status == 'CANCELADO').length
    };

    Utils.res(res, true, 'Consulta realizada com sucesso.', null, dados);
}

module.exports.getEconomia = function (req, res) {
    // console.log('params', req.params);
    let periodo = 6;
    if (req.params.filtro == 'SEMESTRAL') periodo = 6;
    else if (req.params.filtro == 'TRIMESTRAL') periodo = 3;
    else if (req.params.filtro == 'ANUAL') periodo = 12;

    let data_inicio = Moment().subtract(periodo, 'month').startOf('month').toDate();
    let data_fim = Moment().endOf('month').toDate();
    // console.log('data_inicio', data_inicio);
    // console.log('data_fim', data_fim);

    Cotacao
        .find({
            $and: [
                { id_oficina: ObjectId(req.body.decoded.oficina._id) },
                { data_cadastro: { $gte: data_inicio } },     // MUDAR PARA data_orcado
                { data_cadastro: { $lte: data_fim } },         // MUDAR PARA data_orcado
                { $or: [{ status: 'PENDENTE_PEDIDO' }, { status: 'COT_FINALIZADA' }] }
            ]
        })
        .populate({ path: 'pedidos', select: '_id itens orcamentos pedidos' })
        .exec((erro, cotacoes) => {
            if (erro) {
                console.error('ERRO', erro)
                Utils.res(res, false, 'Erro ao buscar pedidos.', erro);
            } else {
                // console.log('qtd cotações', cotacoes.length);
                let linha_tempo = iniciarLinhaTempo(data_inicio, data_fim);

                cotacoes.forEach(cotacao => {
                    let itens_map = {};
                    cotacao.itens.forEach(item => itens_map[item._id] = item);
                    let itens_group = _.groupBy(cotacao.itens, '_id');

                    cotacao.orcamentos.forEach(orcamento => {
                        orcamento.itens.forEach(item_o => {
                            // Se foi gerado um pedido do item
                            if (itens_map[item_o._id_item].is_pedido) {
                                itens_group[item_o._id_item].push(item_o);

                                item_o.itens_orcados.forEach(item_orcado => {
                                    // MAX
                                    if (!itens_map[item_o._id_item].max)
                                        itens_map[item_o._id_item].max = item_orcado.valor_total;
                                    else if (item_orcado.valor_total > itens_map[item_o._id_item].max)
                                        itens_map[item_o._id_item].max = item_orcado.valor_total;
                                    // MIN
                                    if (!itens_map[item_o._id_item].min)
                                        itens_map[item_o._id_item].min = item_orcado.valor_total;
                                    else if (item_orcado.valor_total < itens_map[item_o._id_item].min)
                                        itens_map[item_o._id_item].min = item_orcado.valor_total;
                                });
                            }
                        });
                    });
                    // console.log('itens_map', itens_map);

                    // somatório dos mínimos e máximos dos itens.
                    let min = 0, max = 0;
                    min = _.reduce(itens_map, (somatorio, it) => it.min ? somatorio + it.min : 0, 0);
                    max = _.reduce(itens_map, (somatorio, it) => it.max ? somatorio + it.max : 0, 0);
                    // console.log('min', min);
                    // console.log('max', max);

                    // atribui a cotacao na linha do tempo ao respectivo mes da cotação.
                    let mes = Moment(cotacao.data_cadastro).get('month') + 1;   // data_cadastro
                    let ano = Moment(cotacao.data_cadastro).get('year');    // data_cadastro
                    linha_tempo = setMapAttr(linha_tempo, mes + '/' + ano, 'min', min, true);
                    linha_tempo = setMapAttr(linha_tempo, mes + '/' + ano, 'max', max, true);
                    linha_tempo = setMapAttr(linha_tempo, mes + '/' + ano, 'economia', max - min, true);
                });

                let dataChart = setDataChart(linha_tempo);

                Utils.res(res, true, 'Consulta realizada com sucesso.', null, dataChart);
            }
        });
}

function setDataChart(linha_tempo) {
    let chartLabel = [];
    let serie_min = { data: [], label: 'Mín.' };
    let serie_max = { data: [], label: 'Máx.' };
    let serie_eco = { data: [], label: 'Economia' };
    linha_tempo.forEach((value, key) => {
        serie_min.data.push(value.min);
        serie_max.data.push(value.max);
        serie_eco.data.push(value.economia);
        chartLabel.push(value.label);
    })

    return {
        economia_mes: getEconomiaMes(serie_eco),
        economia_semestre: getEconomiaSemestre(serie_eco),
        chartLabel: chartLabel,
        chartDataSet: [serie_min, serie_max, serie_eco],
    };
}

function iniciarLinhaTempo(data_inicio, data_fim) {
    let linha_tempo = new Map();
    let qtd_meses = Moment(data_fim).diff(data_inicio, 'months');

    for (let i = 1; i <= qtd_meses; i++) {
        let data_moment = Moment(data_inicio).add(i, 'months');
        let mes = data_moment.get('month') + 1;
        let ano = data_moment.get('year');

        linha_tempo.set(mes + '/' + ano, { label: data_moment.format('MMM/YYYY'), min: 0, max: 0, economia: 0 });
    }
    return linha_tempo;
}

function getEconomiaMes(serie_eco) {
    return serie_eco.data[serie_eco.data.length - 1];
}

function getEconomiaSemestre(serie_eco) {
    return _.reduce(serie_eco.data, (somatorio, it) => somatorio + it, 0);
}

function setMapAttr(map, key, attr, value, sum) {
    // console.log('key', key)
    let aux = map.get(key);
    if (typeof value === 'number') {
        if (!isNaN(value))
            if (sum) aux[attr] += value;
            else aux[attr] = value;
    } else
        aux[attr] = value;

    return map.set(key, aux);
}

module.exports.getTotalVendido = function (req, res) {
    // console.log('params', req.params);
    let periodo = 6;
    if (req.params.filtro == 'MENSAL') periodo = 1;
    if (req.params.filtro == 'SEMESTRAL') periodo = 6;
    else if (req.params.filtro == 'TRIMESTRAL') periodo = 3;
    else if (req.params.filtro == 'ANUAL') periodo = 12;

    let data_inicio = Moment().subtract(periodo, 'month').startOf('month').toDate();
    let data_fim = Moment().endOf('month').toDate();
    // console.log('data_inicio', data_inicio);
    // console.log('data_fim', data_fim);

    Pedido
        .find({
            $and: [
                { id_fornecedor: ObjectId(req.body.decoded.fornecedor._id) },
                { data_cadastro: { $gte: data_inicio } },     // MUDAR PARA data_orcado
                { data_cadastro: { $lte: data_fim } },         // MUDAR PARA data_orcado
                { $or: [{ status: 'A_ENTREGAR' }, { status: 'FINALIZADO' }] }
            ]
        })
        .populate({ path: 'pedidos', select: '_id itens orcamentos pedidos' })
        .exec((erro, pedidos) => {
            if (erro) {
                console.error('ERRO', erro)
                Utils.res(res, false, 'Erro ao buscar pedidos.', erro);
            } else {
                let linha_tempo = iniciarLinhaTempoTV(data_inicio, data_fim);

                pedidos.forEach(pedido => {
                    // atribui o pedido na linha do tempo ao respectivo mes da cotação.
                    let mes = Moment(pedido.data_cadastro).get('month') + 1;   // data_cadastro
                    let ano = Moment(pedido.data_cadastro).get('year');    // data_cadastro
                    linha_tempo = setMapAttr(linha_tempo, mes + '/' + ano, 'total', pedido.valor, true);
                })

                let dataChart = setDataChartTV(linha_tempo);
                Utils.res(res, true, 'Consulta realizada com sucesso.', null, dataChart);
            }
        })
}

function iniciarLinhaTempoTV(data_inicio, data_fim) {
    let linha_tempo = new Map();
    let qtd_meses = Moment(data_fim).diff(data_inicio, 'months');

    for (let i = 1; i <= qtd_meses; i++) {
        let data_moment = Moment(data_inicio).add(i, 'months');
        let mes = data_moment.get('month') + 1;
        let ano = data_moment.get('year');

        linha_tempo.set(mes + '/' + ano, { label: data_moment.format('MMM/YYYY'), total: 0 });
    }
    return linha_tempo;
}

function setDataChartTV(linha_tempo) {
    let chartLabel = [];
    let serie_total = { data: [], label: 'Total Vendido' };
    let total_vendido = 0;
    linha_tempo.forEach((value, key) => {
        total_vendido += value.total;
        serie_total.data.push(value.total);
        chartLabel.push(value.label);
    })

    return {
        total_vendido: total_vendido,
        mes_atual: serie_total.data[serie_total.data.length - 1],
        mes_passado: serie_total.data[serie_total.data.length - 2],
        chartLabel: chartLabel,
        chartDataSet: [serie_total],
    };
}

module.exports.testePlaca = async function (req, res) {
    console.log('params', req.params);
    let dados = await Sinesp.search(req.params.placa);
    console.log('dados', dados);
    res.json({ dados: dados });
}