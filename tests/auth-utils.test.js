const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarNome, validarEmail, validarSenha, limparCep } = require('../www/js/auth-utils');

test('auth utils', () => {
  assert.equal(normalizarNome(' Joao '), 'joao');
  assert.ok(validarEmail('a@b.com'));
  assert.ok(validarSenha('123456'));
  assert.equal(limparCep('01.001-000'), '01001000');
});
