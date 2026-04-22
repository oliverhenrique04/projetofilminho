const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // <-- NOVO: Módulo nativo para ler e gravar arquivos no disco

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../www')));

// SUA CHAVE AQUI:
const TMDB_API_KEY = 'fa8b322b4dffd455e219a710fc5910e9'; 

// === CONFIGURAÇÃO DO BANCO DE DADOS EM ARQUIVO ===
const ARQUIVO_DB = path.join(__dirname, 'banco_filminho.json');

// Se o arquivo não existir (primeira vez), ele cria um vazio
if (!fs.existsSync(ARQUIVO_DB)) {
    const dadosIniciais = {
        usuarios: [{ id: 1, nome: 'Oliver Henrique' }],
        avaliacoes: []
    };
    fs.writeFileSync(ARQUIVO_DB, JSON.stringify(dadosIniciais, null, 2));
}

// Função para ler os dados salvos no disco
function lerBanco() {
    const dadosGcrus = fs.readFileSync(ARQUIVO_DB, 'utf-8');
    return JSON.parse(dadosGcrus);
}

// Função para salvar os dados no disco
function salvarBanco(dados) {
    fs.writeFileSync(ARQUIVO_DB, JSON.stringify(dados, null, 2));
}
// =================================================


app.get('/api/filmes/tendencias', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`);
        res.json(resposta.data.results);
    } catch (erro) { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/api/filmes/categoria/:id', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&with_genres=${req.params.id}&page=1`);
        res.json(resposta.data.results);
    } catch (erro) { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/api/filmes/sortear', async (req, res) => {
    try {
        const paginaAleatoria = Math.floor(Math.random() * 20) + 1; 
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=${paginaAleatoria}`);
        const filmes = resposta.data.results;
        const filmeSorteado = filmes[Math.floor(Math.random() * filmes.length)];
        res.json(filmeSorteado);
    } catch (erro) { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/api/filme/:id', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=credits`);
        res.json(resposta.data);
    } catch (erro) { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/api/filmes/buscar', async (req, res) => {
    try {
        const resposta = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${req.query.q}&language=pt-BR`);
        res.json(resposta.data.results); 
    } catch (erro) { res.status(500).json({ erro: 'Erro' }); }
});

// NOVA LÓGICA DE AVALIAÇÃO: Agora salva direto no HD!
app.post('/api/avaliar', (req, res) => {
    const { id_usuario, id_filme, titulo_filme, nota, poster_path } = req.body;
    
    // 1. Abre a caixa forte
    const banco = lerBanco();
    
    // 2. Verifica se já viu
    const jaVisto = banco.avaliacoes.some(a => a.id_filme === id_filme && a.id_usuario === id_usuario);
    
    // 3. Adiciona o filme novo
    banco.avaliacoes.push({ 
        id_usuario, id_filme, titulo_filme, nota, poster_path,
        reassistido: jaVisto 
    });
    
    // 4. Tranca a caixa forte (salva no disco)
    salvarBanco(banco);
    
    res.status(201).json({ mensagem: 'Salvo com sucesso no disco!' });
});

// NOVA LÓGICA DE PERFIL: Puxa direto do HD!
app.get('/api/perfil/:id_usuario', (req, res) => {
    const id = parseInt(req.params.id_usuario);
    const banco = lerBanco();
    
    const usuario = banco.usuarios.find(u => u.id === id);
    const filmesAvaliados = banco.avaliacoes.filter(a => a.id_usuario === id);
    
    res.json({ perfil: usuario, avaliacoes: filmesAvaliados });
});

const PORTA = process.env.PORT || 3000;

// O '0.0.0.0' permite acessos externos (como vimos no Glitch/IDX)
app.listen(PORTA, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🍿 FILMINHO ONLINE!');
    console.log(`✅ Backend rodando perfeitamente na porta ${PORTA}`);
    console.log(`🔗 Segure CTRL e clique no link para abrir:`);
    console.log(`👉 http://localhost:${PORTA}`);
    console.log('=========================================');
});
