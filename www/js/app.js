var app = new Framework7({ el: '#app', theme: 'auto' });

var MEU_ID_USUARIO = 1;
var API_URL = '/api';
var filmeAbertoAgora = null; 

// === INICIALIZAÇÃO DO LOCAL STORAGE ===
// Se for a primeira vez abrindo o app, salva um nome padrão.
if (!localStorage.getItem('nome_usuario_filminho')) {
  localStorage.setItem('nome_usuario_filminho', 'Oliver Henrique');
}

carregarPerfil();
carregarFilmesHome('tendencias', 'lista-tendencias');

async function carregarPerfil() {
  try {
    var res = await fetch(API_URL + '/perfil/' + MEU_ID_USUARIO);
    var dados = await res.json();

    // === LENDO DO LOCAL STORAGE ===
    // Agora o nome e a foto puxam direto da memória do navegador!
    var meuNomeSalvo = localStorage.getItem('nome_usuario_filminho');
    document.getElementById('nome-usuario').innerText = meuNomeSalvo;
    document.getElementById('avatar-img').src = 'https://ui-avatars.com/api/?name=' + encodeURI(meuNomeSalvo) + '&background=00e054&color=000&size=90';

    var htmlDiario = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? '<span style="color:#00e054; margin-right:6px;">[REASSISTIDO]</span>' : '';
      return '<li class="item-content" onclick="abrirDetalhes(' + av.id_filme + ')">' +
          '<div class="item-media"><img src="' + (av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : '') + '" style="width: 50px; border-radius: 4px;"></div>' +
          '<div class="item-inner">' +
            '<div class="item-title" style="color: #ffffff; font-weight: 500;">' + seloReassistido + av.titulo_filme + '</div>' +
            '<div class="item-after" style="color: #00e054; font-weight: bold;">' + av.nota + ' ⭐</div>' +
          '</div>' +
        '</li>';
    }).join('');
    document.getElementById('lista-avaliacoes').innerHTML = htmlDiario || '<li><div class="item-inner">Diário vazio.</div></li>';

    var htmlRecentes = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? '<span style="color:#00e054; margin-right:4px;">(R)</span>' : '';
      return '<div class="poster-card" onclick="abrirDetalhes(' + av.id_filme + ')">' +
          '<img src="' + (av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : '') + '">' +
          '<div class="poster-title">' + seloReassistido + av.titulo_filme + '</div>' +
        '</div>';
    }).join('');
    document.getElementById('lista-recentes').innerHTML = htmlRecentes || '<p>Nada na sua lista ainda.</p>';
  } catch (e) {
    console.log("Erro ao carregar perfil.");
  }
}

// ... [O resto das funções continuam iguais] ...

async function carregarFilmesHome(endpoint, idElemento) {
  try {
    var res = await fetch(API_URL + '/filmes/' + endpoint);
    var filmes = await res.json();
    var html = filmes.map(function(f) {
      return '<div class="poster-card" onclick="abrirDetalhes(' + f.id + ')">' +
        '<img src="https://image.tmdb.org/t/p/w200' + f.poster_path + '" onerror="this.src=\'https://via.placeholder.com/100x150?text=Sem+Capa\'">' +
        '<div class="poster-title">' + f.title + '</div>' +
      '</div>';
    }).join('');
    document.getElementById(idElemento).innerHTML = html;
  } catch (e) {
    document.getElementById(idElemento).innerHTML = '<p style="color:#ff3b30;">Erro ao carregar.</p>';
  }
}

function mostrarInicio(elementoHTML) {
  var chips = document.querySelectorAll('.chip-categoria');
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove('active');
  }
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'block';
  document.getElementById('sessao-categoria').style.display = 'none';
}

function mostrarInicioMenu() {
  document.getElementById('input-busca').value = '';
  pesquisarDigitando(); 
  var chipIni = document.getElementById('chip-inicio');
  if(chipIni) mostrarInicio(chipIni);
}

function mudarCategoria(id, nome, elementoHTML) {
  var chips = document.querySelectorAll('.chip-categoria');
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove('active');
  }
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'none';
  document.getElementById('sessao-categoria').style.display = 'block';
  document.getElementById('titulo-categoria').innerText = "Catálogo: " + nome;
  document.getElementById('lista-categoria').innerHTML = '<p>Carregando...</p>';
  carregarFilmesHome('categoria/' + id, 'lista-categoria');
}

async function pesquisarDigitando() {
  var termo = document.getElementById('input-busca').value;
  var areaHome = document.getElementById('area-home');
  var areaResultados = document.getElementById('area-resultados');

  if (!termo || termo.length < 2) {
    areaHome.style.display = 'block';
    areaResultados.style.display = 'none';
    return;
  }

  areaHome.style.display = 'none';
  areaResultados.style.display = 'block';

  try {
    var res = await fetch(API_URL + '/filmes/buscar?q=' + termo);
    var filmes = await res.json();
    var html = filmes.map(function(f) {
      return '<div class="card card-outline" style="background: #1a1c23; border: none; cursor: pointer; margin: 10px 0;" onclick="abrirDetalhes(' + f.id + ')">' +
        '<div class="card-content card-content-padding" style="display: flex; gap: 15px;">' +
          '<img src="https://image.tmdb.org/t/p/w200' + f.poster_path + '" style="width: 60px; border-radius: 6px; object-fit: cover;" onerror="this.style.display=\'none\'">' +
          '<div>' +
            '<h3 style="margin: 0 0 5px 0; font-size: 16px; color:#ffffff;">' + f.title + '</h3>' +
            '<p style="margin: 0; font-size: 14px;">' + (f.release_date ? f.release_date.substring(0, 4) : '') + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById('lista-resultados').innerHTML = html || '<p>Nenhum filme encontrado.</p>';
  } catch (e) {
    document.getElementById('lista-resultados').innerHTML = '<p>Erro na busca.</p>';
  }
}

async function sortearFilme() {
  app.dialog.preloader('Girando a roleta...');
  try {
    var res = await fetch(API_URL + '/filmes/sortear');
    var filme = await res.json();
    app.dialog.close();
    if(filme && filme.id) abrirDetalhes(filme.id); 
    else throw new Error();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert('Erro ao sortear filme.');
  }
}

async function abrirDetalhes(id) {
  app.popup.open('#popup-detalhes'); 
  document.getElementById('conteudo-detalhes').innerHTML = '<div class="block" style="text-align: center; margin-top:100px;">Carregando...</div>';
  
  try {
    var res = await fetch(API_URL + '/filme/' + id);
    var f = await res.json();
    filmeAbertoAgora = f; 

    var atores = '';
    if(f.credits && f.credits.cast) {
      atores = f.credits.cast.slice(0, 10).map(function(ator) {
        return '<div class="ator-card">' +
          '<img src="https://image.tmdb.org/t/p/w200' + ator.profile_path + '" onerror="this.src=\'https://via.placeholder.com/60?text=?\'">' +
          '<div style="color: #ffffff;">' + ator.name + '</div>' +
          '<div style="font-size: 10px;">' + ator.character + '</div>' +
        '</div>';
      }).join('');
    }

    document.getElementById('conteudo-detalhes').innerHTML = 
      '<div class="detalhes-header" style="background-image: url(\'https://image.tmdb.org/t/p/w500' + f.backdrop_path + '\');"></div>' +
      '<div class="block" style="margin-top: -60px; position: relative; z-index: 10;">' +
        '<h2 style="color: #ffffff; margin: 0; font-size: 26px; line-height: 1.1;">' + f.title + '</h2>' +
        '<p style="margin: 5px 0; color: #00e054; font-weight:bold;">' + (f.release_date ? f.release_date.substring(0,4) : '') + ' • ' + f.runtime + ' min</p>' +
        '<button class="button button-fill button-large button-round" style="background-color: #00e054; color: #000; font-weight: 800; margin: 20px 0; height: 48px;" onclick="darNotaPeloDetalhe()">' +
          '<i class="icon material-icons" style="margin-right: 5px;">star</i> AVALIAR FILME' +
        '</button>' +
        '<h3 style="color: #ffffff; margin-bottom: 5px;">Sinopse</h3>' +
        '<p style="line-height: 1.6; font-size: 14px;">' + (f.overview || 'Sinopse não disponível.') + '</p>' +
        '<h3 style="color: #ffffff; margin-top: 25px;">Elenco Principal</h3>' +
        '<div class="scroller-horizontal" style="margin-top: 10px;">' + atores + '</div>' +
      '</div>';
  } catch (e) {
    document.getElementById('conteudo-detalhes').innerHTML = '<div class="block">Erro ao carregar filme.</div>';
  }
}

function darNotaPeloDetalhe() {
  if(!filmeAbertoAgora) return;
  app.dialog.prompt('Sua nota (1 a 5):', 'Avaliando: ' + filmeAbertoAgora.title, async function (notaDigitada) {
    var nota = parseInt(notaDigitada);
    if (nota < 1 || nota > 5 || isNaN(nota)) return app.dialog.alert('Nota inválida.');

    try {
      await fetch(API_URL + '/avaliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id_usuario: MEU_ID_USUARIO, id_filme: filmeAbertoAgora.id, 
          titulo_filme: filmeAbertoAgora.title, nota: nota, poster_path: filmeAbertoAgora.poster_path 
        })
      });
      app.dialog.alert('Filme atualizado no diário!');
      carregarPerfil(); 
    } catch (e) {}
  });
}

// === SALVANDO O NOME NO LOCAL STORAGE ===
function editarPerfil() {
  app.dialog.prompt('Como você quer ser chamado?', 'Editar Perfil', function (nome) {
    if (!nome) return;
    
    // Salva direto no disco do navegador!
    localStorage.setItem('nome_usuario_filminho', nome);
    
    // Opcional: Avisar o backend (se você ainda quiser ter a rota lá)
    fetch(API_URL + '/perfil/' + MEU_ID_USUARIO, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ nome: nome }) 
    }).catch(e => console.log('Backend offline, mas salvo localmente!'));
    
    // Atualiza a tela
    carregarPerfil();
  });
}