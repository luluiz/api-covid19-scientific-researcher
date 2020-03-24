// Mongoose Validator
const validate = require('mongoose-validator');

const nome = [
    validate({
        validator: 'matches',
        arguments: /^[A-Z]([a-zA-Z]|\.| |-|')+$/, // Apenas letras maiusculas e minusculas
        message: 'Campo "Nome" inválido. O campo deve possuir os caracteres: A-Z, a-z'
    })
];

/**
 * Deve conter entre 8 a 30 caracteres
 * Deve conter no mínimo 1 letra e 1 número
 * Caracteres especiais é OPCIONAL: !@#$%¨*({[]})_+=-<>,.;:/\?^´`
 */
const senha = [
    validate({
        validator: 'matches',
        passIfEmpty: true,
        arguments: /^(?=.*\d)(?=.*[a-z])(?=.*[a-zA-Z]).{8,30}$/,
        message: 'Campo "Senha" inválido. - Deve conter entre 8 a 30 caracteres - Deve conter no mínimo 1 letra maiúscula, 1 letra minúscula e 1 número - Caracteres especiais é OPCIONAL: !@#$%¨*({[]})_+=-<>,.;:/\?^´`'
    })
];

const email = [
    validate({
        validator: 'matches',
        arguments: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
        message: 'Campo "Email" inválido.'
    }),
    validate({
        validator: 'isLength',
        arguments: [3, 50],
        message: 'Campo "Email" inválido. O campo deve ter entre {ARGS[0]} e {ARGS[1]} caracteres.'
    })
];

module.exports = {
    nome,
    senha,
    email,
};