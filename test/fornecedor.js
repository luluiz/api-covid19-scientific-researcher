require('../server/loader_api');
var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../server/app');
var faker = require('faker');
faker.locale = 'pt_BR';
var faker_br = require('faker-br');
var Fornecedor = require('../shared/schemas/fornecedor.model');
var Usuario = require('../shared/schemas/usuario.model');
var expect = chai.expect;
chai.use(chaiHttp);

describe('Fornecedor', () => {
    // Remove todos os itens da collenction.
    before(async () => {
        await Fornecedor.deleteMany({}, (erro) => {
            if (erro) console.error('Erro ao remover fornecedor', erro);
            else console.log('Fornecedor removido com sucesso');
        });
    });

    before(async () => {
        await Usuario.deleteMany({}, (erro) => {
            if (erro) console.error('Erro ao remover usuário', erro);
            else console.log('Usuário removido com sucesso');
        });
    });

    describe('Criando novo Fornecedor', () => {
        it('POST Cadastro de fornecedor', () => {
            const faker_senha = faker.internet.password(8, true, new RegExp('/^(?=.*\d)(?=.*[a-z])(?=.*[a-zA-Z]).{8,30}$/'), '0');
            let item = {
                modalidade: "Fornecedor",
                cnpj: "01.554.976/0002-50",
                email: faker.internet.email(),
                senha: faker_senha,
                confirmarSenha: faker_senha,
                checkTermos: true,
                cadastro_receita: true
            };

            chai.request(app)
                .post('/api/fornecedor')
                .send(item)
                .then(res => {
                    // console.log('RESPONSE', res.body);
                    expect(res).to.have.status(200);
                    expect(res.body.success).to.equal(true);
                    expect(res.body).to.have.property('token');
                    expect(res.body).to.have.property('fornecedor');
                    expect(res.body).to.have.property('usuario');
                })
                .catch(erro => {
                    console.error('Erro: ', erro.message);
                });
        });
    });
    // it('Novo Fornecedor', (done) => done());
});

