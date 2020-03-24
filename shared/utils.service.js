const _ = require('lodash');
const Moment = require('moment-timezone');
const FsExtra = require('fs-extra');

var exports = module.exports = {};

/**
 * Retorna a URL do aplicativo (frontend).
 */
module.exports.getAppURL = function () {
    return process.env.APP_URL;
}

/**
 * Response de resquisições HTTP.
 */
module.exports.res = function (res, success, message, erro, args) {
    if (success) exports.log(message);
    else exports.log(message, erro);

    let json = { success: success, message: message };
    if (erro) json.erro = erro;
    if (args) _.merge(json, args);
    if (success) return res.status(200).json(json);
    else return res.json(json);
};

/**
 * Log datado.
 */
module.exports.log = function (msgs, erro) {
    let agora = Moment().format('DD/MM/YYYY HH:mm:ss');
    console.log(agora + ' - ', msgs);
    if (erro) console.error(erro)
};

/**
 * Converte string para boolean
 */
module.exports.str2bool = function (valor) {
    if (valor === 'true') return true;
    else if (valor === 'false') return false;
    else return false;
}

/**
 * Converte data string para Date
 */
module.exports.String2DateHour = function (data) {
    // 05/09/2017 02:47:12
    try {
        const aux = data.split("/");
        const dia = aux[0];
        const mes = aux[1];
        const ano = aux[2].split(" ")[0];

        const horario = data.split(" ")[1].split(":");

        const hora = horario[0];
        const min = horario[1];
        const seg = horario[2];

        return new Date(ano, mes - 1, dia, hora, min, seg);
    } catch (erro) {
        console.error('data', data);
        console.error('String2DateHour ERRO:', erro);
    }
};

/**
 * Retorna se o CPF é válido
 */
module.exports.validarCPF = function (cpf) { //CPF vem com pontos e traço
    if (cpf == "" || cpf == null)
        return false;
    else
        cpf = cpf.replace(/[^\d]+/g, ''); // remove caracteres especiais

    var Soma;
    var Resto;
    Soma = 0;
    if (cpf == "00000000000" || cpf == "11111111111" || cpf == "22222222222" ||
        cpf == "33333333333" || cpf == "44444444444" || cpf == "55555555555" ||
        cpf == "66666666666" || cpf == "77777777777" || cpf == "88888888888" ||
        cpf == "99999999999") return false;

    for (var i = 1; i <= 9; i++) Soma = Soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(cpf.substring(9, 10))) return false;

    Soma = 0;
    for (i = 1; i <= 10; i++) Soma = Soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(cpf.substring(10, 11))) return false;
    return true;
};

/**
 * Retorna se o CNPJ é válido
 */
module.exports.validarCNPJ = function (cnpj) { //CPF vem com pontos e traço
    try {
        cnpj = cnpj.replace('.', '');
        cnpj = cnpj.replace('.', '');
        cnpj = cnpj.replace('.', '');
        cnpj = cnpj.replace('-', '');
        cnpj = cnpj.replace('/', '');
        cnpj = cnpj;

        if (cnpj == "00000000000000" || cnpj == "11111111111111" || cnpj == "22222222222222" ||
            cnpj == "33333333333333" || cnpj == "44444444444444" || cnpj == "55555555555555" ||
            cnpj == "66666666666666" || cnpj == "77777777777777" || cnpj == "88888888888888" ||
            cnpj == "99999999999999") return false;

        var numeros, digitos, soma, i, resultado, pos, tamanho, digitos_iguais;
        digitos_iguais = 1;
        if (cnpj.length < 14 && cnpj.length > 14)
            return false;
        for (i = 9; i < cnpj.length - 1; i++)
            if (cnpj.charAt(i) != cnpj.charAt(i + 1)) {
                digitos_iguais = 0;
                break;
            }
        if (!digitos_iguais) {
            tamanho = cnpj.length - 2
            numeros = cnpj.substring(0, tamanho);
            digitos = cnpj.substring(tamanho);
            soma = 0;
            pos = tamanho - 7;
            for (i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2)
                    pos = 9;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado != digitos.charAt(0))
                return false;
            tamanho = tamanho + 1;
            numeros = cnpj.substring(0, tamanho);
            soma = 0;
            pos = tamanho - 7;
            for (i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2)
                    pos = 9;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado != digitos.charAt(1))
                return false;
            return true;
        } else
            return false;
    } catch (erro) {
        console.error('Erro ao validar CNPJ pelo Utils:', erro);
        return false;
    }
};

/**
 * Remove o arquivo do servidor.
 * @param {Object} arquivo 
 */
module.exports.removeFile = async function (arquivo) {
    if (arquivo && arquivo.destination && arquivo.filename) {
        try {
            let destination = arquivo.destination + '/' + arquivo.filename;
            await FsExtra.remove(destination)
        } catch (erro) {
            console.error('Erro ao deletar arquivo', erro);
        }
    }
};

/**
* Move arquivo para a pasta da conta.
* @param {Object} file Arquivo
* @param {String} id ID da conta.
*/
module.exports.moveFile = async function (file, id, origem, destino) {
    try {
        if (origem) origem = origem + '/' + file.filename;
        else origem = file.destination + '/' + file.filename;

        if (destino) destino = destino + '/' + file.filename;
        else destino = file.destination + '/dir_' + id + '/' + file.filename;

        await FsExtra.move(origem, destino);
    } catch (erro) {
        console.error('Erro ao mover arquivo', erro);
        return 'error';
    }
};

module.exports.setFile = function (file, id) {
    return {
        originalname: file.originalname,
        filename: file.filename,
        destination: file.destination + '/' + 'dir_' + id,
        size: file.size,
        path: file.destination + '/dir_' + id + '/' + file.filename
    }
}

module.exports.sort = function (array, param, descendent) {
    if (!array) return [];
    if (array && (!param || param.trim() == "")) return array;

    if (descendent) return Array.from(array).sort((a, b) => orderByComparator(b[param], a[param]));
    else return Array.from(array).sort((a, b) => orderByComparator(a[param], b[param]));
}

function orderByComparator(a, b) {
    //Isn't a number so lowercase the string to properly compare
    if ((isNaN(parseFloat(a)) || !isFinite(a)) || (isNaN(parseFloat(b)) || !isFinite(b))) {
        a = removerAcentos(a.toLowerCase());
        b = removerAcentos(b.toLowerCase());
        if (a < b) return -1;
        if (a > b) return 1;
    } else {    //Parse strings as numbers to compare properly
        if (parseFloat(a) < parseFloat(b)) return -1;
        if (parseFloat(a) > parseFloat(b)) return 1;
    }

    return 0; //equal each other
}

function removerAcentos(strComAcento) {
    var string = strComAcento;
    var mapaAcentosHex = { a: /[\xE0-\xE6]/g, e: /[\xE8-\xEB]/g, i: /[\xEC-\xEF]/g, o: /[\xF2-\xF6]/g, u: /[\xF9-\xFC]/g, c: /\xE7/g, n: /\xF1/g };
    for (var letra in mapaAcentosHex)
        string = string.replace(mapaAcentosHex[letra], letra);
    return string;
}

/**
 * Remove caracteres de "." e "-" do CNPJ.
 * @param {string} cnpj CNPJ
 */
module.exports.cnpjNoMask = function (cnpj) {
    return cnpj ? cnpj.replace('.', '').replace('.', '').replace('.', '').replace('/', '').replace('-', '') : null;
}

/**
 * @description Método verifica se o valor exp, retirado do token, está expirado.
 * @param exp (number) Tempo para expiração.
 * @returns boolean
 */
module.exports.isExpired = function (exp) {
    var timeStamp = Math.floor(Date.now() / 1000);
    var timeCheck = exp - timeStamp;

    return (timeCheck < 0) ? true : false;
}

module.exports.isNotNull = function (obj) {
    return !(obj == null || obj == undefined)
}

module.exports.montarAnexo = async function (file, id_conta, old_file) {
    let anexo;

    if (!file) return old_file ? old_file : null;
    else if (file.originalname == 'blob') exports.removeFile(file);
    else {
        let origem = file.destination;
        let moveFile = await exports.moveFile(file, id_conta, origem);
        if (moveFile == 'error') await exports.removeFile(file);
        else {
            // Se já tiver arquivo salvo. Evitando arquivos de lixo no servidor.
            if (old_file) await exports.removeFile(old_file);
            anexo = exports.setFile(file, id_conta);
        }
    }
    return anexo;
}