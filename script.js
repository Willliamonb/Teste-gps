let map;
let marker;

let path;

let polyline;

let ultimaPosicao = null;

let distanciaTotal = 0;

function iniciarGPS(){

    navigator.geolocation.watchPosition(
        atualizarPosicao,
        erro,
        {
            enableHighAccuracy:true,
            maximumAge:0,
            timeout:5000
        }
    );

}

function atualizarPosicao(pos){

    const latitude = pos.coords.latitude;
    const longitude = pos.coords.longitude;

    const velocidade = pos.coords.speed
        ? (pos.coords.speed*3.6).toFixed(1)
        : 0;

    const precisao = pos.coords.accuracy;

    document.getElementById("lat").innerHTML=latitude.toFixed(6);
    document.getElementById("lng").innerHTML=longitude.toFixed(6);

    document.getElementById("vel").innerHTML=
        velocidade+" km/h";

    document.getElementById("prec").innerHTML=
        precisao.toFixed(1)+" metros";

    const atual = new google.maps.LatLng(latitude,longitude);

    if(!map){

        map = new google.maps.Map(document.getElementById("map"),{

            center:atual,
            zoom:18,
            mapTypeId:"roadmap"

        });

        marker = new google.maps.Marker({

            position:atual,
            map:map,
            title:"Você"

        });

        path = [];

        polyline = new google.maps.Polyline({

            path:path,
            geodesic:true,
            strokeColor:"#2196F3",
            strokeOpacity:1,
            strokeWeight:5

        });

        polyline.setMap(map);

    }

    marker.setPosition(atual);

    map.panTo(atual);

    path.push(atual);

    polyline.setPath(path);

    if(ultimaPosicao){

        distanciaTotal += calcularDistancia(

            ultimaPosicao.lat(),
            ultimaPosicao.lng(),

            latitude,
            longitude

        );

    }

    ultimaPosicao = atual;

    if(distanciaTotal<1000){

        document.getElementById("dist").innerHTML=
            distanciaTotal.toFixed(1)+" metros";

    }else{

        document.getElementById("dist").innerHTML=
            (distanciaTotal/1000).toFixed(2)+" km";

    }

}

function erro(e){

    alert("Erro ao localizar.");

    console.log(e);

}

function calcularDistancia(lat1,lon1,lat2,lon2){

    const R = 6371000;

    const dLat=(lat2-lat1)*Math.PI/180;

    const dLon=(lon2-lon1)*Math.PI/180;

    const a=

        Math.sin(dLat/2)**2+

        Math.cos(lat1*Math.PI/180)*

        Math.cos(lat2*Math.PI/180)*

        Math.sin(dLon/2)**2;

    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R*c;

}

window.onload=iniciarGPS;