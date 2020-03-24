const CotacaoService = require('../modulos/cotacao/cotacao.service');

module.exports.atualizaOrcados = function () {
    try {
        CotacaoService.atualizaOrcados();
    } catch (erro) {
        console.log(new Date(), 'TASK: Erro ao atualizar cotações já orçadas: ', erro);
    }
}

