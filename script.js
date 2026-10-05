let mapa;
let entregador;
let cliente;
let rota;
let minhaPosicao = null;
let destino = null;

// Distância mínima (em metros) para recalcular a rota ao se mover
const DISTANCIA_MINIMA_RECALCULO = 20; 
let ultimaPosicaoCalculada = null;

// Função para calcular distância Haversine em metros entre dois pontos
function calcularDistanciaMetros(p1, p2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (p2[0] - p1[0]) * rad;
  const dLon = (p2[1] - p1[1]) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1[0] * rad) * Math.cos(p2[0] * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ícones Customizados
function criarIconeTexto(texto, icone, ehEntregador = false) {
  const classe = ehEntregador ? 'custom-pin pin-driver' : 'custom-pin';
  return L.divIcon({
    className: '',
    html: `<div class="${classe}">
             <i class="${icone}"></i>
             <span>${texto}</span>
           </div>`,
    iconSize: null,
    iconAnchor: [20, 20] // Pivô centralizado
  });
}

// INICIALIZAR O MAPA
mapa = L.map("map", { zoomControl: false }).setView([-23.5505, -46.6333], 13);

L.control.zoom({ position: 'topright' }).addTo(mapa);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  maxZoom: 19
}).addTo(mapa);

// GEOLOCALIZAÇÃO DO ENTREGADOR
navigator.geolocation.watchPosition(
  (pos) => {
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;
    minhaPosicao = [lat, lng];

    // Telemetria
    document.getElementById("coords").innerHTML = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    let velocidade = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : 0;
    document.getElementById("vel").innerHTML = velocidade + " km/h";

    if (!entregador) {
      entregador = L.marker(minhaPosicao, {
        icon: criarIconeTexto("Carlos (A caminho)", "fa-solid fa-truck", true)
      }).addTo(mapa);

      mapa.setView(minhaPosicao, 15);
    } else {
      entregador.setLatLng(minhaPosicao);
    }

    // Só recalcula a rota se moveu mais que a distância mínima estipulada
    if (destino) {
      if (!ultimaPosicaoCalculada || calcularDistanciaMetros(minhaPosicao, ultimaPosicaoCalculada) > DISTANCIA_MINIMA_RECALCULO) {
        calcularRota(minhaPosicao, destino);
        ultimaPosicaoCalculada = minhaPosicao;
      }
    }
  },
  (err) => {
    console.warn("Erro no GPS: " + err.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
  }
);

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    buscarEndereco();
  }
}

// BUSCA DE ENDEREÇO
async function buscarEndereco() {
  let enderecoInput = document.getElementById("endereco");
  let endereco = enderecoInput.value.trim();

  if (!endereco) {
    alert("Digite um endereço para buscar.");
    return;
  }

  document.getElementById("destino").innerHTML = "Buscando...";

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`;
    let response = await fetch(url, { headers: { 'User-Agent': 'LogisticsApp/1.0' } });
    let data = await response.json();

    if (!data || data.length === 0) {
      alert("Endereço não encontrado!");
      document.getElementById("destino").innerHTML = "Não encontrado";
      return;
    }

    let local = data[0];
    destino = [parseFloat(local.lat), parseFloat(local.lon)];

    let nomeCurto = local.display_name.split(',')[0];
    document.getElementById("destino").innerHTML = nomeCurto;

    if (cliente) mapa.removeLayer(cliente);

    cliente = L.marker(destino, {
      icon: criarIconeTexto(`${nomeCurto}`, "fa-solid fa-location-dot", false)
    }).addTo(mapa);

    if (minhaPosicao) {
      calcularRota(minhaPosicao, destino);
      ultimaPosicaoCalculada = minhaPosicao;
    } else {
      mapa.setView(destino, 15);
    }
  } catch (err) {
    alert("Erro ao buscar endereço.");
    document.getElementById("destino").innerHTML = "Erro na busca";
  }
}

// CÁLCULO DE ROTA (OSRM)
async function calcularRota(origem, destino) {
  if (!origem || !destino) return;

  let url = `https://router.project-osrm.org/route/v1/driving/${origem[1]},${origem[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;

  try {
    let response = await fetch(url);
    let data = await response.json();

    if (!data.routes || !data.routes.length) {
      alert("Não foi possível traçar a rota.");
      return;
    }

    let rotaData = data.routes[0];
    let pontos = rotaData.geometry.coordinates.map(p => [p[1], p[0]]);

    if (rota) mapa.removeLayer(rota);

    rota = L.polyline(pontos, {
      color: "#7c3aed",
      weight: 6,
      opacity: 0.85
    }).addTo(mapa);

    mapa.fitBounds(rota.getBounds(), { padding: [40, 40] });

    // Atualiza interface
    let distancia = rotaData.distance;
    document.getElementById("dist").innerHTML = distancia < 1000 
      ? distancia.toFixed(0) + " m" 
      : (distancia / 1000).toFixed(2) + " km";

    let tempoMinutos = Math.round(rotaData.duration / 60);
    document.getElementById("etaTime").innerHTML = tempoMinutos + " minutos";
  } catch (err) {
    console.error("Erro no cálculo OSRM:", err);
  }
}

// BOTAO MINHA LOCALIZAÇÃO
document.getElementById("minhaLocalizacao").addEventListener("click", () => {
  if (minhaPosicao) {
    mapa.setView(minhaPosicao, 17, { animate: true });
  } else {
    alert("Aguardando sinal de GPS...");
  }
});

// REAJUSTAR O MAPA EM TROCAS DE TELA / MOBILE
window.addEventListener("resize", () => {
  if (mapa) {
    mapa.invalidateSize();
  }
});