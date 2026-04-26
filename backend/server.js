const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '../www')));

const TMDB_API_KEY = 'fa8b322b4dffd455e219a710fc5910e9';
const ARQUIVO_DB = path.join(__dirname, 'banco_filminho.json');

if (!fs.existsSync(ARQUIVO_DB)) {
    const dadosIniciais = {
        usuarios: [{ id: 1, nome: 'Oliver Henrique' }],
        avaliacoes: []
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
// =================================================================

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
    const { nome } = req.body;
    const banco = lerBanco();
    const usuario = banco.usuarios.find(u => u.id === id);

    if (usuario) {
        usuario.nome = nome;
        salvarBanco(banco);
        res.json(usuario);
    } else {
        res.status(404).json({ erro: 'Usuário não encontrado' });
    }
});

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🍿 FILMINHO ONLINE!');
    console.log(`✅ Backend rodando perfeitamente na porta ${PORTA}`);
    console.log(`🔗 Segure CTRL e clique no link para abrir:`);
    console.log(`👉 http://localhost:${PORTA}`);
    console.log('=========================================');
});
