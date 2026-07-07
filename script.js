let mapa;

let marcadorEntregador;

let marcadorDestino;

let rota;

let destino = [
    -23.561414,
    -46.655881
];
// exemplo: São Paulo


let ultimaPosicao = null;



// cria mapa

mapa = L.map("map")
.setView(destino,15);



L.tileLayer(
"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
{

attribution:
"© OpenStreetMap"

}
).addTo(mapa);



// marcador cliente

marcadorDestino =
L.marker(destino)
.addTo(mapa)
.bindPopup(
"🏠 Cliente"
);



// inicia GPS

navigator.geolocation.watchPosition(

(pos)=>{


let lat =
pos.coords.latitude;


let lng =
pos.coords.longitude;



let atual=[
lat,
lng
];



document.getElementById("lat")
.innerHTML =
lat.toFixed(6);



document.getElementById("lng")
.innerHTML =
lng.toFixed(6);



let velocidade =
pos.coords.speed
?
(pos.coords.speed*3.6).toFixed(1)
:
0;



document.getElementById("vel")
.innerHTML =
velocidade+" km/h";




// cria marcador entregador

if(!marcadorEntregador){


marcadorEntregador =
L.marker(atual)
.addTo(mapa)
.bindPopup(
"🚚 Você"
);


mapa.setView(
atual,
17
);


calcularRota(atual,destino);


}
else{


marcadorEntregador
.setLatLng(atual);



}



// recalcula rota

calcularRota(
atual,
destino
);



// calcula distância

let distancia =
calcularDistancia(

lat,
lng,

destino[0],
destino[1]

);



document.getElementById("dist")
.innerHTML =

distancia < 1000

?

distancia.toFixed(0)+" metros"

:

(distancia/1000).toFixed(2)+" km";



},

(err)=>{

alert(
"Erro GPS: "+err.message
);

},

{

enableHighAccuracy:true,

maximumAge:0,

timeout:10000

}

);





function calcularRota(origem,destino){


let url =

`https://router.project-osrm.org/route/v1/driving/${

origem[1]

},

${origem[0]};

${

destino[1]

},

${destino[0]

}?overview=full&geometries=geojson`;



fetch(url)

.then(res=>res.json())

.then(data=>{


let pontos =

data.routes[0]
.geometry
.coordinates
.map(
(p)=>[
p[1],
p[0]
]
);



if(rota){

mapa.removeLayer(rota);

}



rota =
L.polyline(
pontos,
{

color:"blue",

weight:5

}

)
.addTo(mapa);



});


}





function calcularDistancia(

lat1,

lon1,

lat2,

lon2

){


const R=6371000;


const dLat=
(lat2-lat1)
*Math.PI/180;


const dLon=
(lon2-lon1)
*Math.PI/180;



const a=

Math.sin(dLat/2)**2+

Math.cos(lat1*Math.PI/180)*

Math.cos(lat2*Math.PI/180)*

Math.sin(dLon/2)**2;



return R*

2*

Math.atan2(
Math.sqrt(a),
Math.sqrt(1-a)
);


}