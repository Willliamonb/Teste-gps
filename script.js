let mapa;
let entregador;
let cliente;
let rota;
let minhaPosicao;
let destino = null;

// Ícones Customizados no formato da interface
function criarIconeTexto(texto, icone, ehEntregador = false) {
  const classe = ehEntregador ? 'custom-pin pin-driver' : 'custom-pin';
  return L.divIcon({
    className: '',
    html: `<div class="${classe}">
             <i class="${icone}"></i>
             <span>${texto}</span>
           </div>`,
    iconAnchor: [50, 15]
  });
}

// INICIALIZAR O MAPA LEAFLET
mapa = L.map("map", { zoomControl: false }).setView([-23.5505, -46.6333], 13);

// Adiciona controles do Leaflet no canto superior direito
L.control.zoom({ position: 'topright' }).addTo(mapa);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(mapa);

// GEOLOCALIZAÇÃO DO ENTREGADOR (REAL-TIME)
navigator.geolocation.watchPosition(
  (pos) => {
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;
    minhaPosicao = [lat, lng];

    // Atualiza telemetria na barra lateral
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

    if (destino) {
      calcularRota(minhaPosicao, destino);
    }
  },
  (err) => {
    console.warn("Erro GPS: " + err.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);

// BOTAO ENTER NA BUSCA
function handleKeyPress(e) {
  if (e.key === 'Enter') {
    buscarEndereco();
  }
}

// BUSCAR ENDEREÇO VIA NOMINATIM
function buscarEndereco() {
  let endereco = document.getElementById("endereco").value;

  if (!endereco) {
    alert("Digite um endereço para buscar");
    return;
  }

  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert("Endereço não encontrado!");
        return;
      }

      let local = data[0];
      destino = [parseFloat(local.lat), parseFloat(local.lon)];

      // Atualiza nome curto do destino
      let nomeCurto = local.display_name.split(',')[0];
      document.getElementById("destino").innerHTML = nomeCurto;

      if (cliente) {
        mapa.removeLayer(cliente);
      }

      cliente = L.marker(destino, {
        icon: criarIconeTexto(`${nomeCurto} (Destino)`, "fa-solid fa-location-dot", false)
      }).addTo(mapa);

      if (minhaPosicao) {
        calcularRota(minhaPosicao, destino);
      } else {
        mapa.setView(destino, 15);
      }
    })
    .catch(err => {
      alert("Falha na consulta de endereço.");
    });
}

// CALCULAR ROTA COM OSRM
function calcularRota(origem, destino) {
  if (!origem || !destino) return;

  let url = `https://router.project-osrm.org/route/v1/driving/${origem[1]},${origem[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.routes || !data.routes.length) {
        alert("Não foi possível calcular a rota para este local.");
        return;
      }

      let rotaData = data.routes[0];
      let pontos = rotaData.geometry.coordinates.map(p => [p[1], p[0]]);

      if (rota) {
        mapa.removeLayer(rota);
      }

      // Estilo da linha do mapa no tom roxo
      rota = L.polyline(pontos, {
        color: "#7c3aed",
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(mapa);

      mapa.fitBounds(rota.getBounds(), { padding: [50, 50] });

      // Atualiza distância e estimativa de tempo
      let distancia = rotaData.distance;
      document.getElementById("dist").innerHTML = distancia < 1000 
        ? distancia.toFixed(0) + " metros" 
        : (distancia / 1000).toFixed(2) + " km";

      let tempoMinutos = Math.round(rotaData.duration / 60);
      document.getElementById("etaTime").innerHTML = tempoMinutos + " minutos";
    })
    .catch(err => {
      console.error("Erro ao traçar rota OSRM:", err);
    });
}

// BOTÃO MINHA LOCALIZAÇÃO
document.getElementById("minhaLocalizacao").addEventListener("click", () => {
  if (minhaPosicao) {
    mapa.setView(minhaPosicao, 17, { animate: true });
  } else {
    alert("Aguardando coordenadas de GPS...");
  }
});