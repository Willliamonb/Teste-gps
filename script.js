let mapa;

let entregador;

let cliente;

let rota;

let minhaPosicao;



let destino = null;



mapa = L.map("map")
.setView([-23.5505,-46.6333],13);



L.tileLayer(
"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
{

attribution:"© OpenStreetMap"

}

).addTo(mapa);





// PEGAR GPS DO ENTREGADOR

navigator.geolocation.watchPosition(

(pos)=>{


let lat =
pos.coords.latitude;


let lng =
pos.coords.longitude;



minhaPosicao=[
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





if(!entregador){


entregador =
L.marker(
minhaPosicao,
{

title:"Entregador"

}

)
.addTo(mapa)
.bindPopup(
"🚚 Você"
);



mapa.setView(
minhaPosicao,
16
);



}
else{


entregador.setLatLng(
minhaPosicao
);


}





if(destino){

calcularRota(
minhaPosicao,
destino
);


}



},



(err)=>{

alert(
"Erro GPS: "+err.message
);

},



{

enableHighAccuracy:true,

timeout:10000,

maximumAge:0

}

);







// BUSCAR ENDEREÇO

function buscarEndereco(){



let endereco =
document.getElementById("endereco")
.value;



if(!endereco){

alert(
"Digite um endereço"
);

return;

}




let url =

`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;



fetch(url)

.then(res=>res.json())


.then(data=>{


if(data.length===0){

alert(
"Endereço não encontrado"
);

return;

}



let local=data[0];



destino=[

parseFloat(local.lat),

parseFloat(local.lon)

];



document.getElementById("destino")
.innerHTML =
local.display_name;





if(cliente){

mapa.removeLayer(cliente);

}



cliente =
L.marker(
destino
)

.addTo(mapa)

.bindPopup(
"🏠 Cliente"
)

.openPopup();





calcularRota(

minhaPosicao,

destino

);



});


}








// CALCULAR ROTA

function calcularRota(origem,destino){


if(!origem)
return;



let url =

`https://router.project-osrm.org/route/v1/driving/${

origem[1]

},

${origem[0]};

${destino[1]},

${destino[0]}

?overview=full&geometries=geojson`;




fetch(url)


.then(res=>res.json())


.then(data=>{


if(!data.routes.length){

alert(
"Não foi possível calcular rota"
);

return;

}



let pontos =

data.routes[0]
.geometry
.coordinates
.map(

p=>[

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

weight:6

}

)

.addTo(mapa);





mapa.fitBounds(
rota.getBounds()
);





let distancia =
data.routes[0]
.distance;



document.getElementById("dist")
.innerHTML =

distancia < 1000

?

distancia.toFixed(0)+" metros"

:

(distancia/1000).toFixed(2)+" km";



});


}