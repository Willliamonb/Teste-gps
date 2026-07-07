let map;
let marker;
let polyline;

let path = [];
let ultimaPosicao = null;
let distanciaTotal = 0;

function iniciarGPS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta Geolocalização.");
        return;
    }

    navigator.geolocation.watchPosition(
        atualizarPosicao,
        erro,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function atualizarPosicao(pos) {

    const latitude = pos.coords.latitude;
    const longitude = pos.coords.longitude;

    const velocidade = pos.coords.speed
        ? (pos.coords.speed * 3.6).toFixed(1)
        : "0.0";

    const precisao = pos.coords.accuracy;

    document.getElementById("lat").textContent = latitude.toFixed(6);
    document.getElementById("lng").textContent = longitude.toFixed(6);
    document.getElementById("vel").textContent = velocidade + " km/h";
    document.getElementById("prec").textContent = precisao.toFixed(1) + " metros";

    const atual = new google.maps.LatLng(latitude, longitude);

    if (!map) {

        map = new google.maps.Map(document.getElementById("map"), {
            center: atual,
            zoom: 18,
            mapTypeId: "roadmap",
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: true
        });

        marker = new google.maps.Marker({
            position: atual,
            map: map,
            title: "Minha localização",
            icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
        });

        path = [atual];

        polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: "#2196F3",
            strokeOpacity: 1,
            strokeWeight: 5
        });

        polyline.setMap(map);

    } else {

        marker.setPosition(atual);
        map.panTo(atual);

        path.push(atual);
        polyline.setPath(path);
    }

    if (ultimaPosicao) {

        distanciaTotal += calcularDistancia(
            ultimaPosicao.lat(),
            ultimaPosicao.lng(),
            latitude,
            longitude
        );
    }

    ultimaPosicao = atual;

    if (distanciaTotal < 1000) {
        document.getElementById("dist").textContent =
            distanciaTotal.toFixed(1) + " metros";
    } else {
        document.getElementById("dist").textContent =
            (distanciaTotal / 1000).toFixed(2) + " km";
    }
}

function erro(e) {

    console.error(e);

    switch (e.code) {

        case e.PERMISSION_DENIED:
            alert("Permissão para acessar a localização foi negada.");
            break;

        case e.POSITION_UNAVAILABLE:
            alert("Não foi possível obter sua localização.");
            break;

        case e.TIMEOUT:
            alert("Tempo de espera pela localização excedido.");
            break;

        default:
            alert("Ocorreu um erro ao acessar a localização.");
            break;
    }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}