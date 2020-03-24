const express = require('express');
const router = express.Router();
const Cotacao = require('../../shared/schemas/cotacao.model');
const CotacaoService = require('./cotacao.service');
const Autenticacao = require('../usuario/autenticacao.service');

module.exports = function (app) {
    app.use('/api', router);

    router.post('/cotacao/:id_oficina', Autenticacao.verify, CotacaoService.criar);
    router.put('/cotacao/:id_empresa/:id_cotacao', Autenticacao.verify, CotacaoService.editar);
    router.put('/cotacao/imagem/:id_oficina/:id_cotacao', Autenticacao.verify, CotacaoService.editarImagemCotacao);
    router.put('/cotacao/imagem/:id_oficina/:id_cotacao/:id_item', Autenticacao.verify, CotacaoService.editarImagemItem);
    // router.delete('/cotacao/:id_cotacao', Autenticacao.verify, CotacaoService.deletar);
    router.get('/cotacao', Autenticacao.verify, CotacaoService.atualizaOrcados, CotacaoService.get);
    router.get('/cotacao/fornecedor/:id_fornecedor', Autenticacao.verify, CotacaoService.atualizaOrcados, CotacaoService.getCotacoesFornecedor);
    router.get('/cotacao/:id_cotacao', Autenticacao.verify, CotacaoService.atualizaOrcados, CotacaoService.getById);
    router.get('/n_cotacoes', Autenticacao.verify, CotacaoService.getN);
    router.delete('/cotacao/:id_oficina/:id_cotacao', Autenticacao.verify, CotacaoService.deletar);
    router.put('/cotacao/cancelar/:id_oficina/:id_cotacao', Autenticacao.verify, CotacaoService.cancelar);
    router.put('/cotacao/ignorar_pendente/:id_oficina/:id_cotacao', Autenticacao.verify, CotacaoService.ignorar_pendente);

    // GRAFICOS / RELATORIOS / DASHBOARDS
    router.get('/cotacao/total_cotacoes/:id_oficina', Autenticacao.verify, CotacaoService.getTotalCotacoes);
    router.get('/cotacao/economia/:id_oficina/:filtro', Autenticacao.verify, CotacaoService.getEconomia);
    router.get('/pedido/total_vendido/:id_fornecedor/:filtro', Autenticacao.verify, CotacaoService.getTotalVendido);


    router.get('/sinesp_api/:placa', Autenticacao.verify, CotacaoService.testePlaca);

    return router;
};