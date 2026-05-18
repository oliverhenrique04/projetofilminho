function normalizarNome(nome) {
    return (nome || '').trim().toLowerCase();
}

function validarEmail(email) {
    return /.+@.+\..+/.test(email || '');
}

function validarSenha(senha) {
    return (senha || '').length >= 6;
}

function limparCep(cep) {
    return String(cep || '').replace(/\D/g, '');
}

module.exports = { normalizarNome, validarEmail, validarSenha, limparCep };
