var app = new Framework7({ el: '#app', theme: 'auto' });

var MEU_ID_USUARIO = 1;
var API_URL = '/api';
var filmeAbertoAgora = null;

// Objeto para armazenar o estado da avaliação atual
let avaliacaoAtual = {
    nota: 0,
    reassistido: false,
    foto: null,
    localizacao: null
};

if (!localStorage.getItem('nome_usuario_filminho')) {
  localStorage.setItem('nome_usuario_filminho', 'Oliver Henrique');
}

carregarPerfil();
carregarFilmesHome('tendencias', 'lista-tendencias');

async function carregarPerfil() {
  try {
    var res = await fetch(API_URL + '/perfil/' + MEU_ID_USUARIO);
    var dados = await res.json();

    var meuNomeSalvo = localStorage.getItem('nome_usuario_filminho');
    document.getElementById('nome-usuario').innerText = meuNomeSalvo;
    document.getElementById('avatar-img').src = `https://ui-avatars.com/api/?name=${encodeURI(meuNomeSalvo)}&background=00e054&color=000&size=90`;

    var htmlDiario = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? `<span style="color:#00e054; margin-right:6px;">[REASSISTIDO]</span>` : '';
      var iconesExtras = '';
      if (av.foto) {
        iconesExtras += `<i class="icon material-icons" style="font-size:16px; color:#00e054; margin-left:8px;" onclick="visualizarFoto(event, '${av.foto}')">photo_camera</i>`;
      }
      if (av.localizacao && av.localizacao.lat) {
        iconesExtras += `<i class="icon material-icons" style="font-size:16px; color:#00e054; margin-left:4px;" onclick="mostrarNoMapa(event, '${av.localizacao.lat}', '${av.localizacao.lon}')">location_on</i>`;
      }

      const notaFormatada = typeof av.nota === 'number' ? av.nota.toFixed(1) : 'N/A';

      return `<li class="item-content" onclick="abrirDetalhes(${av.id_filme})">` +
          `<div class="item-media"><img src="${av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : ''}" style="width: 50px; border-radius: 4px;"></div>` +
          `<div class="item-inner">` +
            `<div class="item-title" style="color: #ffffff; font-weight: 500;">${seloReassistido}${av.titulo_filme}</div>` +
            `<div class="item-after" style="color: #00e054; font-weight: bold; display:flex; align-items:center; gap:8px;">${notaFormatada} ⭐${iconesExtras}` +
               `<i class="icon material-icons" style="color:#ff5555; cursor:pointer;" onclick="removerAvaliacao(event, ${av.id_avaliacao})">delete_forever</i>` +
            `</div>` +
          `</div>` +
        `</li>`;
    }).join('');
    document.getElementById('lista-avaliacoes').innerHTML = htmlDiario || '<li><div class="item-inner">Diário vazio.</div></li>';

    var htmlRecentes = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? `<span style="color:#00e054; margin-right:4px;">(R)</span>` : '';
      return `<div class="poster-card" onclick="abrirDetalhes(${av.id_filme})">` +
          `<img src="${av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : ''}">` +
          `<div class="poster-title">${seloReassistido}${av.titulo_filme}</div>` +
        `</div>`;
    }).join('');
    document.getElementById('lista-recentes').innerHTML = htmlRecentes || '<p>Nada na sua lista ainda.</p>';
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}

async function removerAvaliacao(event, id_avaliacao) {
    event.stopPropagation();
    app.dialog.confirm('Tem certeza que deseja remover este filme do seu diário?', 'Remover Avaliação', async () => {
      app.dialog.preloader('Removendo...');
      try {
          const response = await fetch(`${API_URL}/avaliar/${id_avaliacao}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Falha ao remover.');
          app.dialog.close();
          carregarPerfil();
      } catch (e) {
          app.dialog.close();
          app.dialog.alert('Não foi possível remover a avaliação.');
      }
    });
}

async function carregarFilmesHome(endpoint, idElemento) {
  try {
    var res = await fetch(API_URL + '/filmes/' + endpoint);
    var filmes = await res.json();
    var html = filmes.map(f =>
      `<div class="poster-card" onclick="abrirDetalhes(${f.id})">` +
        `<img src="https://image.tmdb.org/t/p/w200${f.poster_path}" onerror="this.src='https://via.placeholder.com/100x150?text=Sem+Capa'">` +
        `<div class="poster-title">${f.title}</div>` +
      `</div>`
    ).join('');
    document.getElementById(idElemento).innerHTML = html;
  } catch (e) {
    document.getElementById(idElemento).innerHTML = '<p style="color:#ff3b30;">Erro ao carregar.</p>';
  }
}

function mostrarInicio(elementoHTML) {
  document.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'block';
  document.getElementById('sessao-categoria').style.display = 'none';
}

function mostrarInicioMenu() {
  document.getElementById('input-busca').value = '';
  pesquisarDigitando(); 
  const chipIni = document.getElementById('chip-inicio');
  if(chipIni) mostrarInicio(chipIni);
}

function mudarCategoria(id, nome, elementoHTML) {
  document.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'none';
  document.getElementById('sessao-categoria').style.display = 'block';
  document.getElementById('titulo-categoria').innerText = "Catálogo: " + nome;
  document.getElementById('lista-categoria').innerHTML = '<p>Carregando...</p>';
  carregarFilmesHome('categoria/' + id, 'lista-categoria');
}

async function pesquisarDigitando() {
  var termo = document.getElementById('input-busca').value;
  if (!termo || termo.length < 2) {
    document.getElementById('area-home').style.display = 'block';
    document.getElementById('area-resultados').style.display = 'none';
    return;
  }
  document.getElementById('area-home').style.display = 'none';
  document.getElementById('area-resultados').style.display = 'block';
  try {
    var res = await fetch(API_URL + '/filmes/buscar?q=' + termo);
    var filmes = await res.json();
    var html = filmes.map(f =>
      `<div class="card card-outline" style="background: #1a1c23; border: none; cursor: pointer; margin: 10px 0;" onclick="abrirDetalhes(${f.id})">` +
        `<div class="card-content card-content-padding" style="display: flex; gap: 15px;">` +
          `<img src="https://image.tmdb.org/t/p/w200${f.poster_path}" style="width: 60px; border-radius: 6px; object-fit: cover;" onerror="this.style.display=\'none\'">` +
          `<div><h3 style="margin: 0 0 5px 0; font-size: 16px; color:#ffffff;">${f.title}</h3><p style="margin: 0; font-size: 14px;">${f.release_date ? f.release_date.substring(0, 4) : ''}</p></div>` +
        `</div>` +
      `</div>`
    ).join('');
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

    var provedoresHtml = '';
    if (f['watch/providers'] && f['watch/providers'].results.BR && f['watch/providers'].results.BR.flatrate) {
        provedoresHtml = '<h3 style="color: #ffffff; margin-top: 25px;">Onde Assistir (Streaming)</h3>' +
            '<div class="scroller-horizontal" style="margin-top: 10px;">' +
            f['watch/providers'].results.BR.flatrate.map(p => 
                `<div class="provider-card"><img src="https://image.tmdb.org/t/p/w200${p.logo_path}" title="${p.provider_name}"></div>`
            ).join('') + '</div>';
    }

    var atores = f.credits && f.credits.cast ? f.credits.cast.slice(0, 10).map(ator =>
      `<div class="ator-card">` +
        `<img src="https://image.tmdb.org/t/p/w200${ator.profile_path}" onerror="this.src='https://via.placeholder.com/60?text=?'">` +
        `<div style="color: #ffffff;">${ator.name}</div>` +
        `<div style="font-size: 10px;">${ator.character}</div>` +
      `</div>`
    ).join('') : '';

    document.getElementById('conteudo-detalhes').innerHTML = 
      `<div class="detalhes-header" style="background-image: url('https://image.tmdb.org/t/p/w500${f.backdrop_path}');"></div>` +
      `<div class="block" style="margin-top: -60px; position: relative; z-index: 10;">` +
        `<h2 style="color: #ffffff; margin: 0; font-size: 26px; line-height: 1.1;">${f.title}</h2>` +
        `<p style="margin: 5px 0; color: #00e054; font-weight:bold;">${f.release_date ? f.release_date.substring(0,4) : ''} • ${f.runtime} min</p>` +
        `<button class="button button-fill button-large button-round" style="background-color: #00e054; color: #000; font-weight: 800; margin: 20px 0; height: 48px;" onclick="abrirPopupAvaliacao()">` +
          `<i class="icon material-icons" style="margin-right: 5px;">star</i> AVALIAR FILME` +
        `</button>` +
        `<h3 style="color: #ffffff; margin-bottom: 5px;">Sinopse</h3>` +
        `<p style="line-height: 1.6; font-size: 14px;">${f.overview || 'Sinopse não disponível.'}</p>` +
        provedoresHtml +
        `<h3 style="color: #ffffff; margin-top: 25px;">Elenco Principal</h3>` +
        `<div class="scroller-horizontal" style="margin-top: 10px;">${atores}</div>` +
      `</div>`;
  } catch (e) {
    document.getElementById('conteudo-detalhes').innerHTML = '<div class="block">Erro ao carregar filme.</div>';
  }
}

// --- NOVA LÓGICA DE AVALIAÇÃO UNIFICADA ---
function abrirPopupAvaliacao() {
    // Resetar estado da avaliação
    avaliacaoAtual = { nota: 0, reassistido: false, foto: null, localizacao: null };

    const popup = document.getElementById('rating-popup');
    atualizarTextoEstrelas(0);
    atualizarVisualEstrelas(0);
    document.getElementById('rating-rewatch-toggle').checked = false;
    const addPhotoButton = document.getElementById('add-photo-button');
    addPhotoButton.innerHTML = '<i class="icon material-icons">photo_camera</i> Adicionar Foto';
    addPhotoButton.classList.remove('button-fill');
    addPhotoButton.classList.add('button-outline');

    // Configurar listeners das estrelas (com remoção de antigos)
    const starsContainer = document.getElementById('stars-container');
    const newStarsContainer = starsContainer.cloneNode(true);
    starsContainer.parentNode.replaceChild(newStarsContainer, starsContainer);
    newStarsContainer.addEventListener('click', handleStarClick);

    // Listener para o botão de foto
    document.getElementById('add-photo-button').onclick = async () => {
        const foto = await tirarFotoComNavegador();
        if (foto) {
            avaliacaoAtual.foto = foto;
            const button = document.getElementById('add-photo-button');
            button.innerHTML = '<i class="icon material-icons">check_circle</i> Foto Adicionada';
            button.classList.remove('button-outline');
            button.classList.add('button-fill');
        }
    };
    
    // Listener para o botão de salvar
    document.getElementById('save-rating-button').onclick = () => {
        avaliacaoAtual.reassistido = document.getElementById('rating-rewatch-toggle').checked;
        
        if (avaliacaoAtual.nota === 0) {
            app.toast.create({ text: 'Por favor, selecione uma nota de 0.5 a 5.', closeTimeout: 2500, position: 'center' }).open();
            return;
        }
        
        salvarAvaliacaoFinal();
    };

    popup.classList.add('visible');
}

function handleStarClick(event) {
    const targetStar = event.target.closest('.star');
    if (!targetStar) return;
    const rect = targetStar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const starValue = parseInt(targetStar.dataset.value, 10);
    avaliacaoAtual.nota = (clickX < rect.width / 2) ? starValue - 0.5 : starValue;
    atualizarVisualEstrelas(avaliacaoAtual.nota);
    atualizarTextoEstrelas(avaliacaoAtual.nota);
}

function fecharPopupAvaliacao() {
    document.getElementById('rating-popup').classList.remove('visible');
}

function atualizarVisualEstrelas(rating) {
    document.querySelectorAll('#stars-container .star').forEach(star => {
        const starValue = parseFloat(star.dataset.value);
        star.className = 'star';
        star.innerHTML = '☆';
        if (rating >= starValue) {
            star.className = 'star filled';
            star.innerHTML = '★';
        } else if (rating >= starValue - 0.5) {
            star.className = 'star half-filled';
            star.innerHTML = '★';
        }
    });
}

function atualizarTextoEstrelas(rating) {
    const ratingValueEl = document.getElementById('rating-value');
    if (rating > 0) {
        ratingValueEl.innerHTML = `Sua nota: <b>${rating.toFixed(1)}</b>`;
    } else {
        ratingValueEl.innerHTML = 'Toque nas estrelas para avaliar';
    }
}

async function salvarAvaliacaoFinal() {
  if (!filmeAbertoAgora || avaliacaoAtual.nota === 0) return;

  app.dialog.preloader('Salvando no seu diário...');

  // Pega a localização ANTES de salvar (se houver foto)
  if (avaliacaoAtual.foto && navigator.geolocation) {
      try {
          const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
          });
          avaliacaoAtual.localizacao = { lat: position.coords.latitude, lon: position.coords.longitude };
      } catch (e) {
          console.warn('Não foi possível obter a localização.');
      }
  }

  try {
    const res = await fetch(API_URL + '/avaliar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          id_usuario: MEU_ID_USUARIO,
          id_filme: filmeAbertoAgora.id,
          titulo_filme: filmeAbertoAgora.title,
          nota: avaliacaoAtual.nota,
          poster_path: filmeAbertoAgora.poster_path,
          reassistido: avaliacaoAtual.reassistido,
          foto: avaliacaoAtual.foto,
          localizacao: avaliacaoAtual.localizacao
      })
    });
    if (!res.ok) throw new Error('Resposta do servidor não foi OK');
    app.dialog.close();
    fecharPopupAvaliacao();
    app.popup.close('#popup-detalhes');
    app.toast.create({ text: 'Filme salvo no seu diário!', closeTimeout: 2000, position: 'center' }).open();
    carregarPerfil();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert('Ocorreu um erro ao salvar sua avaliação.');
  }
}

// --- LÓGICA DA CÂMERA (AGORA ISOLADA E DIRETA) ---
async function tirarFotoComNavegador() {
  if (!window.isSecureContext) {
     app.dialog.alert('O acesso à câmera é permitido apenas em conexões seguras (HTTPS).');
     return null;
  }

  const container = document.getElementById('camera-preview-container');
  const video = document.getElementById('camera-video');
  const captureButton = document.getElementById('capture-button');
  const cancelButton = document.getElementById('cancel-camera-button');
  let stream = null;

  return new Promise(async (resolve) => {
    function cleanup(resolvedValue = null) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      container.style.display = 'none';
      resolve(resolvedValue);
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play();
      container.style.display = 'block';

      captureButton.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        cleanup(fotoBase64);
      };

      cancelButton.onclick = () => cleanup(null);

    } catch (err) {
      let msg = 'Ocorreu um erro desconhecido ao tentar acessar a câmera.';
      if (err.name === 'NotAllowedError') {
          msg = 'A permissão para a câmera foi negada. Você precisa autorizar nas configurações do navegador.';
      }
      app.dialog.alert(msg, 'Erro de Câmera');
      cleanup(null);
    }
  });
}

function visualizarFoto(event, fotoBase64) {
    event.stopPropagation();
    app.popup.create({
        content: `<div class="popup photo-popup"><div class="view"><div class="page"><div class="navbar"><div class="navbar-inner"><div class="title">Foto</div><div class="right"><a href="#" class="link popup-close">Fechar</a></div></div></div><div class="page-content" style="display:flex; align-items:center; justify-content:center; background:#000;"><img src="${fotoBase64}" style="max-width:100%; max-height:100%;"></div></div></div></div>`
    }).open();
}

function mostrarNoMapa(event, lat, lon) {
    event.stopPropagation();
    window.open(`https://maps.google.com/?q=${lat},${lon}`, '_system');
}

function editarPerfil() {
  app.dialog.prompt('Como você quer ser chamado?', 'Editar Perfil', function (nome) {
    if (!nome) return;
    localStorage.setItem('nome_usuario_filminho', nome);
    fetch(`${API_URL}/perfil/${MEU_ID_USUARIO}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome }) });
    carregarPerfil();
  });
}
