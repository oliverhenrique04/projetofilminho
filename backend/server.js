const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '../www')));

const TMDB_API_KEY = 'fa8b322b4dffd455e219a710fc5910e9';
const PORTA = process.env.PORT || 3000;
const ARQUIVO_DB = process.env.FILMINHO_DB || path.join(__dirname, 'banco_filminho.json');

if (!fs.existsSync(ARQUIVO_DB)) {
    const dadosIniciais = {
        usuarios: [],
        avaliacoes: [],
        solicitacoes_amizade: [],
        amizades: [],
        notificacoes: [],
        dispositivos_push: []
    };
    fs.writeFileSync(ARQUIVO_DB, JSON.stringify(dadosIniciais, null, 2));
}

function lerBanco() {
    const dadosCrus = fs.readFileSync(ARQUIVO_DB, 'utf-8');
    return JSON.parse(dadosCrus);
}

function salvarBanco(dados) {
    fs.writeFileSync(ARQUIVO_DB, JSON.stringify(dados, null, 2));
}

// =================================================================
// SCRIPT DE MIGRAÇÃO (VERSÃO CORRIGIDA E GARANTIDA)
// =================================================================
function migrarAvaliacoesAntigas() {
    console.log('MIGRAÇÃO: Verificando consistência dos dados de avaliação...');
    const banco = lerBanco();
    let foiModificado = false;

    banco.avaliacoes.forEach((avaliacao, index) => {
        if (avaliacao.id_avaliacao === undefined || avaliacao.id_avaliacao === null) {
            // Cria um ID único e confiável usando o tempo e o índice do array
            avaliacao.id_avaliacao = Date.now() + index;
            foiModificado = true;
            console.log(`MIGRAÇÃO: ID ${avaliacao.id_avaliacao} atribuído para a avaliação do filme "${avaliacao.titulo_filme}"`);
        }
    });

    if (foiModificado) {
        console.log('MIGRAÇÃO: Concluída. Salvando o banco de dados atualizado.');
        salvarBanco(banco);
    } else {
        console.log('MIGRAÇÃO: Nenhuma ação necessária, os dados já estão consistentes.');
    }
}
// Roda o script de migração na inicialização do servidor
migrarAvaliacoesAntigas();

// ====== FUNÇÕES DE AUTENTICAÇÃO E MIGRAÇÃO DE SCHEMA ====
function normalizarNome(nome) {
    return (nome || '').trim().toLowerCase();
}

function gerarSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashSenha(senha, salt) {
    const derived = crypto.scryptSync(senha, salt, 64);
    return `scrypt$${salt}$${derived.toString('hex')}`;
}

function validarSenha(senha, hashArmazenado) {
    const parts = (hashArmazenado || '').split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const derived = crypto.scryptSync(senha, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(parts[2], 'hex'), Buffer.from(derived, 'hex'));
}

function gerarNovoId(itens, campoId) {
    return itens.reduce((max, item) => Math.max(max, item[campoId] || 0), 0) + 1;
}

function criarNotificacao(banco, notificacao) {
    const novaNotificacao = {
        id: gerarNovoId(banco.notificacoes, 'id'),
        usuario_id: notificacao.usuario_id,
        titulo: notificacao.titulo || '',
        mensagem: notificacao.mensagem || '',
        tipo: notificacao.tipo || 'geral',
        lida: false,
        criado_em: new Date().toISOString(),
    };

    banco.notificacoes.push(novaNotificacao);
    return novaNotificacao;
}

function listarNotificacoesUsuario(banco, usuarioId) {
    return banco.notificacoes
        .filter((notificacao) => notificacao.usuario_id === usuarioId)
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}

function contarNaoLidas(banco, usuarioId) {
    return banco.notificacoes.filter((notificacao) => notificacao.usuario_id === usuarioId && !notificacao.lida).length;
}

function upsertDispositivoPush(banco, payload) {
    const agora = new Date().toISOString();
    const existente = banco.dispositivos_push.find((dispositivo) => dispositivo.token === payload.token);

    if (existente) {
        existente.usuario_id = payload.usuario_id;
        existente.plataforma = payload.plataforma || existente.plataforma || 'web';
        existente.ativo = true;
        existente.atualizado_em = agora;
        if (!existente.criado_em) existente.criado_em = agora;
        return existente;
    }

    const novoDispositivo = {
        id: gerarNovoId(banco.dispositivos_push, 'id'),
        usuario_id: payload.usuario_id,
        token: payload.token,
        plataforma: payload.plataforma || 'web',
        ativo: true,
        criado_em: agora,
        atualizado_em: agora,
    };

    banco.dispositivos_push.push(novoDispositivo);
    return novoDispositivo;
}

function desativarDispositivoPush(banco, token) {
    const dispositivo = banco.dispositivos_push.find((item) => item.token === token);
    if (!dispositivo) return false;

    dispositivo.ativo = false;
    dispositivo.atualizado_em = new Date().toISOString();
    return true;
}

function garantirEstruturaBanco() {
    const banco = lerBanco();
    let mudou = false;

    if (!Array.isArray(banco.usuarios)) { banco.usuarios = []; mudou = true; }
    if (!Array.isArray(banco.avaliacoes)) { banco.avaliacoes = []; mudou = true; }
    if (!Array.isArray(banco.solicitacoes_amizade)) { banco.solicitacoes_amizade = []; mudou = true; }
    if (!Array.isArray(banco.amizades)) { banco.amizades = []; mudou = true; }
    if (!Array.isArray(banco.notificacoes)) { banco.notificacoes = []; mudou = true; }
    if (!Array.isArray(banco.dispositivos_push)) { banco.dispositivos_push = []; mudou = true; }

    banco.usuarios.forEach((u) => {
        if (!u.nome_normalizado && u.nome) { u.nome_normalizado = normalizarNome(u.nome); mudou = true; }
        if (u.deletado_em === undefined) { u.deletado_em = null; mudou = true; }
        if (!u.tipo) { u.tipo = 'user'; mudou = true; }
        if (!u.senha_hash) { u.senha_hash = ''; mudou = true; }
        if (!u.senha_salt) { u.senha_salt = ''; mudou = true; }
        if (u.consentimento_lgpd === undefined) { u.consentimento_lgpd = false; mudou = true; }
        if (u.consentimento_em === undefined) { u.consentimento_em = null; mudou = true; }
        if (u.criado_em === undefined) { u.criado_em = new Date().toISOString(); mudou = true; }
        if (u.cep === undefined) { u.cep = ''; mudou = true; }
        if (u.cidade === undefined) { u.cidade = ''; mudou = true; }
        if (u.uf === undefined) { u.uf = ''; mudou = true; }
    });

    banco.avaliacoes.forEach((a) => {
        if (!a.criado_em) { a.criado_em = new Date().toISOString(); mudou = true; }
    });

    banco.notificacoes.forEach((notificacao) => {
        if (notificacao.lida === undefined) { notificacao.lida = false; mudou = true; }
        if (!notificacao.criado_em) { notificacao.criado_em = new Date().toISOString(); mudou = true; }
    });

    banco.dispositivos_push.forEach((dispositivo) => {
        if (dispositivo.ativo === undefined) { dispositivo.ativo = true; mudou = true; }
        if (!dispositivo.plataforma) { dispositivo.plataforma = 'web'; mudou = true; }
        if (!dispositivo.criado_em) { dispositivo.criado_em = new Date().toISOString(); mudou = true; }
        if (!dispositivo.atualizado_em) { dispositivo.atualizado_em = dispositivo.criado_em; mudou = true; }
    });

    // Seed demo user
    if (!banco.usuarios.find(u => u.id === 1)) {
        const salt = gerarSalt();
        banco.usuarios.push({
            id: 1,
            nome: 'Admin Demo',
            nome_normalizado: normalizarNome('Admin Demo'),
            email: 'admin@email',
            senha_hash: hashSenha('123456', salt),
            senha_salt: salt,
            cep: '',
            cidade: '',
            uf: '',
            consentimento_lgpd: true,
            consentimento_em: new Date().toISOString(),
            criado_em: new Date().toISOString(),
            deletado_em: null,
            tipo: 'demo',
        });
        mudou = true;
        console.log('MIGRAÇÃO: Usuário demo (id 1) criado.');
    }

    if (mudou) salvarBanco(banco);
    return banco;
}

garantirEstruturaBanco();
// ====== FIM FUNÇÕES DE AUTENTICAÇÃO E MIGRAÇÃO ====

app.get('/api/filmes/tendencias', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`);
        res.json(resposta.data.results);
    } catch (erro) { res.status(500).json({ erro: 'Erro ao buscar tendências' }); }
});

app.get('/api/filmes/categoria/:id', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&with_genres=${req.params.id}&page=1`);
        res.json(resposta.data.results);
    } catch (erro) { res.status(500).json({ erro: 'Erro ao buscar categoria' }); }
});

app.get('/api/filmes/sortear', async (req, res) => {
    try {
        const paginaAleatoria = Math.floor(Math.random() * 20) + 1;
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=${paginaAleatoria}`);
        const filmes = resposta.data.results;
        const filmeSorteado = filmes[Math.floor(Math.random() * filmes.length)];
        res.json(filmeSorteado);
    } catch (erro) { res.status(500).json({ erro: 'Erro ao sortear filme' }); }
});

app.get('/api/filme/:id', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=credits,watch/providers`);
        res.json(resposta.data);
    } catch (erro) { res.status(500).json({ erro: 'Erro ao buscar detalhes do filme' }); }
});

app.get('/api/filmes/buscar', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${req.query.q}&language=pt-BR`);
        res.json(resposta.data.results);
    } catch (erro) { res.status(500).json({ erro: 'Erro na busca' }); }
});

app.post('/api/avaliar', (req, res) => {
    try {
        const { id_usuario, id_filme, titulo_filme, nota, poster_path, reassistido, foto, localizacao } = req.body;
        if (!id_usuario || !id_filme || !nota) {
            return res.status(400).json({ erro: 'Dados essenciais para avaliação estão faltando.' });
        }

        const banco = lerBanco();
        const novaAvaliacao = {
            id_avaliacao: Date.now(),
            id_usuario,
            id_filme,
            titulo_filme,
            nota,
            poster_path,
            reassistido: !!reassistido,
            foto: foto || null,
            localizacao: localizacao || null
        };

        banco.avaliacoes.push(novaAvaliacao);
        salvarBanco(banco);
        res.status(201).json({ mensagem: 'Avaliação salva com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        res.status(500).json({ erro: 'Ocorreu um erro no servidor ao salvar a avaliação.' });
    }
});

app.delete('/api/avaliar/:id_avaliacao', (req, res) => {
    try {
        const idAvaliacao = parseInt(req.params.id_avaliacao);
        const banco = lerBanco();
        const tamanhoOriginal = banco.avaliacoes.length;
        
        banco.avaliacoes = banco.avaliacoes.filter(a => a.id_avaliacao !== idAvaliacao);
        
        if (banco.avaliacoes.length < tamanhoOriginal) {
            salvarBanco(banco);
            res.status(200).json({ mensagem: 'Avaliação removida com sucesso.' });
        } else {
            res.status(404).json({ erro: 'Avaliação não encontrada.' });
        }
    } catch (error) {
        console.error('Erro ao remover avaliação:', error);
        res.status(500).json({ erro: 'Erro no servidor ao remover avaliação.' });
    }
});

app.get('/api/perfil/:id_usuario', (req, res) => {
    const id = parseInt(req.params.id_usuario);
    const banco = lerBanco();
    const usuario = banco.usuarios.find(u => u.id === id);
    const filmesAvaliados = banco.avaliacoes.filter(a => a.id_usuario === id);

    if (!usuario) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json({ perfil: usuario, avaliacoes: filmesAvaliados });
});

app.put('/api/perfil/:id_usuario', (req, res) => {
    const id = parseInt(req.params.id_usuario);
    const { nome, cidade, uf } = req.body;
    const banco = lerBanco();
    const usuario = banco.usuarios.find(u => u.id === id);

    if (usuario) {
        if (nome && nome !== usuario.nome) {
            const nomeNorm = normalizarNome(nome);
            if (banco.usuarios.some(u => u.id !== id && u.nome_normalizado === nomeNorm)) {
                return res.status(409).json({ erro: 'Nome já cadastrado.' });
            }
            usuario.nome = nome;
            usuario.nome_normalizado = nomeNorm;
        }
        if (cidade !== undefined) usuario.cidade = cidade;
        if (uf !== undefined) usuario.uf = uf;
        salvarBanco(banco);
        res.json(usuario);
    } else {
        res.status(404).json({ erro: 'Usuário não encontrado' });
    }
});

// ====== ROTAS DE AUTENTICAÇÃO ====
app.post('/api/auth/registro', async (req, res) => {
    try {
        const { nome, email, senha, cep, consentimento_lgpd } = req.body;
        if (!nome || !email || !senha || !cep) return res.status(400).json({ erro: 'Dados obrigatórios ausentes.' });
        if (!consentimento_lgpd) return res.status(400).json({ erro: 'Consentimento LGPD obrigatório.' });
        if (senha.length < 6) return res.status(400).json({ erro: 'Senha mínima de 6 caracteres.' });

        const banco = lerBanco();
        const nomeNorm = normalizarNome(nome);

        if (banco.usuarios.some(u => u.email === email)) return res.status(409).json({ erro: 'Email já cadastrado.' });
        if (banco.usuarios.some(u => u.nome_normalizado === nomeNorm)) return res.status(409).json({ erro: 'Nome já cadastrado.' });

        const cepLimpo = String(cep).replace(/\D/g, '');
        if (cepLimpo.length !== 8) return res.status(400).json({ erro: 'CEP inválido.' });

        let cidade = '';
        let uf = '';

        try {
            const viaCep = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, { timeout: 5000 });
            if (!viaCep.data.erro) {
                cidade = viaCep.data.localidade || '';
                uf = viaCep.data.uf || '';
            }
        } catch (cepErr) {
            console.warn('ViaCEP indisponível, cadastro seguirá sem dados de cidade/UF automáticos.');
        }

        const novoId = banco.usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
        const salt = gerarSalt();
        const novoUsuario = {
            id: novoId,
            nome,
            nome_normalizado: nomeNorm,
            email,
            senha_hash: hashSenha(senha, salt),
            senha_salt: salt,
            cep: cepLimpo,
            cidade,
            uf,
            consentimento_lgpd: true,
            consentimento_em: new Date().toISOString(),
            criado_em: new Date().toISOString(),
            deletado_em: null,
            tipo: 'user',
        };

        banco.usuarios.push(novoUsuario);
        salvarBanco(banco);
        res.status(201).json({ id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email, cidade: novoUsuario.cidade, uf: novoUsuario.uf });
    } catch (err) {
        console.error('Erro no registro:', err);
        res.status(500).json({ erro: 'Erro ao registrar usuário.' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios.' });
    const banco = lerBanco();
    const usuario = banco.usuarios.find(u => u.email === email && !u.deletado_em);
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas.' });
    if (!validarSenha(senha, usuario.senha_hash)) return res.status(401).json({ erro: 'Credenciais inválidas.' });
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, cidade: usuario.cidade, uf: usuario.uf });
});

// ====== FIM ROTAS DE AUTENTICAÇÃO ====

// ====== ROTAS DE USUÁRIOS ====
app.get('/api/usuarios/buscar', (req, res) => {
    const termo = normalizarNome(req.query.nome || '');
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    if (!termo || termo.length < 2) return res.json([]);
    const banco = lerBanco();
    const sugestoes = banco.usuarios
        .filter(u => !u.deletado_em && u.id !== usuarioId && u.nome_normalizado.includes(termo))
        .slice(0, 10)
        .map(u => ({ id: u.id, nome: u.nome }));
    res.json(sugestoes);
});

app.delete('/api/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const banco = lerBanco();

    banco.usuarios = banco.usuarios.filter(u => u.id !== id);
    banco.avaliacoes = banco.avaliacoes.filter(a => a.id_usuario !== id);
    banco.solicitacoes_amizade = banco.solicitacoes_amizade.filter(s => s.de_id !== id && s.para_id !== id);
    banco.amizades = banco.amizades.filter(a => a.usuario_id !== id && a.amigo_id !== id);

    salvarBanco(banco);
    res.json({ ok: true });
});

// ====== FIM ROTAS DE USUÁRIOS ====

// ====== ROTAS DE AMIGOS ====
app.post('/api/amigos/solicitar', (req, res) => {
    const { de_id, para_id } = req.body;
    if (!de_id || !para_id) return res.status(400).json({ erro: 'Dados obrigatórios.' });
    if (de_id === para_id) return res.status(400).json({ erro: 'Não pode solicitar a si mesmo.' });
    const banco = lerBanco();

    const jaAmigos = banco.amizades.some(a => a.usuario_id === de_id && a.amigo_id === para_id);
    if (jaAmigos) return res.status(409).json({ erro: 'Já são amigos.' });

    const pendente = banco.solicitacoes_amizade.find(s =>
        (s.de_id === de_id && s.para_id === para_id && s.status === 'pendente') ||
        (s.de_id === para_id && s.para_id === de_id && s.status === 'pendente')
    );
    if (pendente) return res.status(409).json({ erro: 'Solicitação já pendente.' });

    const novaId = banco.solicitacoes_amizade.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    const solicitacao = { id: novaId, de_id, para_id, status: 'pendente', criado_em: new Date().toISOString() };
    banco.solicitacoes_amizade.push(solicitacao);
    salvarBanco(banco);
    res.status(201).json(solicitacao);
});

app.post('/api/amigos/aceitar', (req, res) => {
    const { solicitacao_id, usuario_id } = req.body;
    const banco = lerBanco();
    const solicitacao = banco.solicitacoes_amizade.find(s => s.id === solicitacao_id);
    if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitação inválida.' });
    if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Não autorizado.' });

    solicitacao.status = 'aceita';
    const desde = new Date().toISOString();
    banco.amizades.push({ usuario_id: solicitacao.de_id, amigo_id: solicitacao.para_id, desde_em: desde });
    banco.amizades.push({ usuario_id: solicitacao.para_id, amigo_id: solicitacao.de_id, desde_em: desde });

    salvarBanco(banco);
    res.json({ ok: true });
});

app.post('/api/amigos/recusar', (req, res) => {
    const { solicitacao_id, usuario_id } = req.body;
    const banco = lerBanco();
    const solicitacao = banco.solicitacoes_amizade.find(s => s.id === solicitacao_id);
    if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitação inválida.' });
    if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Não autorizado.' });

    solicitacao.status = 'recusada';
    salvarBanco(banco);
    res.json({ ok: true });
});

app.get('/api/amigos', (req, res) => {
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    const banco = lerBanco();
    const ids = banco.amizades.filter(a => a.usuario_id === usuarioId).map(a => a.amigo_id);
    const amigos = banco.usuarios.filter(u => ids.includes(u.id)).map(u => ({ id: u.id, nome: u.nome }));
    res.json(amigos);
});

app.get('/api/amigos/pendentes', (req, res) => {
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    const banco = lerBanco();
    const recebidas = banco.solicitacoes_amizade.filter(s => s.para_id === usuarioId && s.status === 'pendente');
    const enviadas = banco.solicitacoes_amizade.filter(s => s.de_id === usuarioId && s.status === 'pendente');
    res.json({ recebidas, enviadas });
});

app.get('/api/amigos/:amigo_id/avaliacoes', (req, res) => {
    const amigoId = parseInt(req.params.amigo_id, 10);
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    const banco = lerBanco();

    const ehAmigo = banco.amizades.some(a => a.usuario_id === usuarioId && a.amigo_id === amigoId);
    if (!ehAmigo) return res.status(403).json({ erro: 'Não autorizado.' });

    const avals = banco.avaliacoes.filter(a => a.id_usuario === amigoId).map(a => ({
        id_avaliacao: a.id_avaliacao,
        id_filme: a.id_filme,
        titulo_filme: a.titulo_filme,
        nota: a.nota,
        poster_path: a.poster_path,
        foto: a.foto,
        localizacao: a.localizacao,
    }));

    res.json(avals);
});

// ====== FIM ROTAS DE AMIGOS ====

// ====== ROTAS DE NOTIFICAÇÕES E PUSH ====
app.get('/api/notificacoes', (req, res) => {
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    const banco = lerBanco();
    res.json(listarNotificacoesUsuario(banco, usuarioId));
});

app.get('/api/notificacoes/nao-lidas/total', (req, res) => {
    const usuarioId = parseInt(req.query.usuario_id || '0', 10);
    const banco = lerBanco();
    res.json({ total: contarNaoLidas(banco, usuarioId) });
});

app.post('/api/notificacoes/marcar-lida', (req, res) => {
    const notificacaoId = parseInt(req.body.notificacao_id || '0', 10);
    const banco = lerBanco();
    const notificacao = banco.notificacoes.find((item) => item.id === notificacaoId);

    if (!notificacao) {
        return res.status(404).json({ erro: 'Notificação não encontrada.' });
    }

    notificacao.lida = true;
    salvarBanco(banco);
    res.json({ ok: true });
});

app.post('/api/notificacoes/marcar-todas-lidas', (req, res) => {
    const usuarioId = parseInt(req.body.usuario_id || '0', 10);
    const banco = lerBanco();

    banco.notificacoes.forEach((notificacao) => {
        if (notificacao.usuario_id === usuarioId) {
            notificacao.lida = true;
        }
    });

    salvarBanco(banco);
    res.json({ ok: true });
});

app.post('/api/push/register', (req, res) => {
    const { usuario_id, token, plataforma } = req.body;
    if (!usuario_id || !token) {
        return res.status(400).json({ erro: 'Dados obrigatórios.' });
    }

    const banco = lerBanco();
    const dispositivo = upsertDispositivoPush(banco, { usuario_id, token, plataforma });
    salvarBanco(banco);
    res.json({ ok: true, dispositivo });
});

app.post('/api/push/unregister', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ erro: 'Token obrigatório.' });
    }

    const banco = lerBanco();
    const desativado = desativarDispositivoPush(banco, token);

    if (!desativado) {
        return res.status(404).json({ erro: 'Dispositivo não encontrado.' });
    }

    salvarBanco(banco);
    res.json({ ok: true });
});
// ====== FIM ROTAS DE NOTIFICAÇÕES E PUSH ====

// ====== PROXIES DE APIs PÚBLICAS ====
app.get('/api/cep/:cep', async (req, res) => {
    try {
        const cepLimpo = String(req.params.cep || '').replace(/\D/g, '');
        const resposta = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, { timeout: 5000 });
        if (resposta.data.erro) {
            return res.json({ erro: 'CEP não encontrado.' });
        }
        res.json(resposta.data);
    } catch (e) {
        console.error('Erro ao consultar ViaCEP:', e.message);
        res.json({ erro: 'Serviço de CEP temporariamente indisponível. Digite manualmente.' });
    }
});

// Lista local de UFs (catálogo IBGE via dados.gov.br)
// Fonte: https://dados.gov.br/dados/conjuntos-dados/lista-de-municipios
const UFS_BRASIL = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
];

app.get('/api/ibge/ufs', (req, res) => {
    res.json(UFS_BRASIL);
});

// ====== FIM PROXIES DE APIs PÚBLICAS ====

app.listen(PORTA, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🍿 FILMINHO ONLINE!');
    console.log(`✅ Backend rodando perfeitamente na porta ${PORTA}`);
    console.log(`🔗 Segure CTRL e clique no link para abrir:`);
    console.log(`👉 http://localhost:${PORTA}`);
    console.log('=========================================');
});
