let mapa;
let vanMarker;
let markers = [];
let rotaLayer;
let minhaPosicao = null;
let debounceTimer;

// Ícone Customizado para o Mapa
function criarIconeTexto(texto, icone, ehVan = false) {
  const classe = ehVan ? 'custom-pin pin-driver' : 'custom-pin';
  return L.divIcon({
    className: '',
    html: `<div class="${classe}">
             <i class="${icone}"></i>
             <span>${texto}</span>
           </div>`,
    iconAnchor: [30, 15]
  });
}

// INICIALIZAR O MAPA LEAFLET
mapa = L.map("map", { zoomControl: false }).setView([-23.5505, -46.6333], 13);

L.control.zoom({ position: 'topright' }).addTo(mapa);

// Substitua esta linha no topo do seu script.js:
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors"
}).addTo(mapa);

// GEOLOCALIZAÇÃO DA VAN (REAL-TIME)
navigator.geolocation.watchPosition(
  (pos) => {
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;
    minhaPosicao = [lat, lng];

    // Telemetria
    document.getElementById("coords").innerHTML = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    let velocidade = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : 0;
    document.getElementById("vel").innerHTML = velocidade + " km/h";

    if (!vanMarker) {
      vanMarker = L.marker(minhaPosicao, {
        icon: criarIconeTexto("Sua Van Escolar", "fa-solid fa-van-shuttle", true)
      }).addTo(mapa);
      mapa.setView(minhaPosicao, 15);

      // Preenche o Ponto de Partida automaticamente na primeira captura
      usarGpsNaPartida();
    } else {
      vanMarker.setLatLng(minhaPosicao);
    }
  },
  (err) => {
    console.warn("Erro no GPS da Van: " + err.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
  }
);

// CONVERTER COORDENADAS DO GPS EM ENDEREÇO (Geocodificação Reversa)
async function usarGpsNaPartida() {
  if (!minhaPosicao) {
    alert("Aguardando sinal de GPS do celular...");
    return;
  }

  const inputPartida = document.getElementById("pontoPartida");
  inputPartida.value = "Obtendo endereço atual...";

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${minhaPosicao[0]}&lon=${minhaPosicao[1]}&email=vanescolar@exemplo.com`;
    const res = await fetch(url, { headers: { 'User-Agent': 'VanEscolarApp/1.0' } });
    const data = await res.json();

    if (data && data.display_name) {
      inputPartida.value = data.display_name;
    } else {
      inputPartida.value = `${minhaPosicao[0].toFixed(5)}, ${minhaPosicao[1].toFixed(5)}`;
    }
  } catch (err) {
    inputPartida.value = `${minhaPosicao[0].toFixed(5)}, ${minhaPosicao[1].toFixed(5)}`;
  }
}

// CONFIGURAR AUTOCOMPLETE NOS CAMPOS DE TEXTO
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".input-endereco");

  inputs.forEach(input => {
    const wrapper = input.closest(".autocomplete-wrapper");
    const suggestionsBox = wrapper.querySelector(".suggestions-box");

    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();

      if (query.length < 3) {
        suggestionsBox.style.display = "none";
        return;
      }

      // Aguarda o usuário parar de digitar por 350ms para disparar a busca
      debounceTimer = setTimeout(() => {
        buscarSugestoes(query, suggestionsBox, input);
      }, 350);
    });
  });

  // Esconder caixas de sugestão ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-wrapper")) {
      document.querySelectorAll(".suggestions-box").forEach(box => box.style.display = "none");
    }
  });
});

// BUSCAR SUGESTÕES VIA NOMINATIM
async function buscarSugestoes(query, boxElement, inputElement) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br&email=vanescolar@exemplo.com`;
    const res = await fetch(url, { headers: { 'User-Agent': 'VanEscolarApp/1.0' } });
    const data = await res.json();

    boxElement.innerHTML = "";

    if (!data || data.length === 0) {
      boxElement.style.display = "none";
      return;
    }

    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = item.display_name;

      div.addEventListener("click", () => {
        inputElement.value = item.display_name;
        boxElement.style.display = "none";
      });

      boxElement.appendChild(div);
    });

    boxElement.style.display = "block";
  } catch (err) {
    console.warn("Erro ao buscar sugestões:", err);
  }
}

// CONSULTA DE COORDENADAS VIA NOMINATIM
async function geocode(endereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&email=vanescolar@exemplo.com`;
  const res = await fetch(url, { headers: { 'User-Agent': 'VanEscolarApp/1.0' } });
  
  if (!res.ok) throw new Error("Erro de comunicação com o servidor de endereços.");
  const data = await res.json();
  
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name.split(',')[0]
    };
  }
  throw new Error(`Endereço não encontrado: "${endereco}"`);
}

// LIMPAR ELEMENTOS DO MAPA
function limparMapa() {
  if (rotaLayer) mapa.removeLayer(rotaLayer);
  markers.forEach(m => mapa.removeLayer(m));
  markers = [];
}

// PROCESSAR ROTA INTELIGENTE (OSRM TRIP API)
async function processarRotaInteligente() {
  const btn = document.getElementById("btnCalcular");
  const timeline = document.getElementById("timelineParadas");
  
  const inputs = Array.from(document.querySelectorAll(".input-endereco"));
  const enderecosText = inputs.map(i => i.value.trim()).filter(v => v !== "");

  if (enderecosText.length < 2) {
    alert("Preencha pelo menos o Ponto de Partida e um Endereço para otimizar.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Geocodificando...`;

  limparMapa();

  try {
    const localizacoes = [];
    for (let end of enderecosText) {
      const loc = await geocode(end);
      localizacoes.push(loc);
    }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Otimizando Trajeto...`;

    const stringCoords = localizacoes.map(l => `${l.lng},${l.lat}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${stringCoords}?overview=full&geometries=geojson&source=first&roundtrip=false`;

    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      const fallbackUrl = `https://routing.openstreetmap.de/routed-car/trip/v1/driving/${stringCoords}?overview=full&geometries=geojson&source=first&roundtrip=false`;
      const fallbackRes = await fetch(fallbackUrl);
      var data = await fallbackRes.json();
    } else {
      var data = await response.json();
    }

    if (!data.trips || data.trips.length === 0) {
      throw new Error("Não foi possível traçar a rota otimizada.");
    }

    const trip = data.trips[0];
    const waypointsOtimizados = data.waypoints;

    const routeGeoJSON = {
      type: "Feature",
      geometry: trip.geometry
    };

    rotaLayer = L.geoJSON(routeGeoJSON, {
      style: { color: "#d97706", weight: 6, opacity: 0.85 }
    }).addTo(mapa);

    timeline.innerHTML = "";
    const bounds = [];

    const sequencia = waypointsOtimizados.map((wp) => ({
      ordemOriginal: wp.waypoint_index,
      dados: localizacoes[wp.waypoint_index]
    }));

    sequencia.forEach((item, index) => {
      const coord = item.dados;
      const numeroParada = index + 1;

      const m = L.marker([coord.lat, coord.lng], {
        icon: criarIconeTexto(`${numeroParada}. ${coord.displayName}`, "fa-solid fa-location-dot", false)
      }).addTo(mapa);

      markers.push(m);
      bounds.push([coord.lat, coord.lng]);

      const stepHTML = `
        <div class="timeline-step">
          <div class="marker-num">${numeroParada}</div>
          <div class="content">
            <h4>${coord.displayName}</h4>
            <p>${index === 0 ? 'Ponto de Origem / Partida' : 'Parada da Rota Escolar'}</p>
          </div>
        </div>
      `;
      timeline.innerHTML += stepHTML;
    });

    mapa.fitBounds(bounds, { padding: [40, 40] });

    const distKm = (trip.distance / 1000).toFixed(1);
    const tempoMin = Math.round(trip.duration / 60);

    document.getElementById("dist").innerHTML = `${distKm} km`;
    document.getElementById("etaTime").innerHTML = `${tempoMin} min`;
    document.getElementById("qtdParadas").innerHTML = `${localizacoes.length} endereços`;

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Rota Inteligente`;
  }
}

// BOTAO CENTRALIZAR NO GPS
document.getElementById("minhaLocalizacao").addEventListener("click", () => {
  if (minhaPosicao) {
    mapa.setView(minhaPosicao, 16, { animate: true });
  } else {
    alert("Aguardando sinal de GPS da Van...");
  }
});

// REDIMENSIONAMENTO DE JANELA
window.addEventListener('resize', () => {
  if (mapa) mapa.invalidateSize();
});