// process current and previous date 
// NOTE: currently set to update at 12:00 AM UTC
var currentDate = new Date();
currentDate.setUTCDate(currentDate.getUTCDate() - 1);
// try {
//     d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + formatZero(currentDate.getUTCMonth() + 1) + "-" + formatZero(currentDate.getUTCDate()) + "-" + currentDate.getUTCFullYear() + ".csv")
//     .then(function(data){
//         // do nothing
//     });
// } 
// catch (err) {
//     console.log("DIDNT WORK");
//     currentDate.setUTCDate(currentDate.getUTCDate() - 1);
// }
var yest = new Date(currentDate);
yest.setUTCDate(currentDate.getUTCDate() - 1);
var yest2 = new Date(currentDate);
yest2.setUTCDate(currentDate.getUTCDate() - 2);

function formatZero(num) {
    return num > 9 ? "" + num : "0" + num;
}

console.log(formatZero(currentDate.getUTCMonth() + 1) + "-" + formatZero(currentDate.getUTCDate()) + "-" + currentDate.getUTCFullYear());
console.log(formatZero(yest.getUTCMonth() + 1) + "-" + formatZero(yest.getUTCDate()) + "-" + yest.getUTCFullYear());
console.log(formatZero(yest2.getUTCMonth() + 1) + "-" + formatZero(yest2.getUTCDate()) + "-" + yest2.getUTCFullYear());

// begin compiling data
Promise.all([d3.csv("./data/statelatlong.csv"), d3.csv("./data/canadaprovinces.csv")])
.then(function (locations) {
    var stateOrder = [];
    var filesUSA = [];
    var filesCanada = [];
    var canadaOrder = [];
    for (let i = 0; i < locations[0].length; i++) {
        stateOrder.push(locations[0][i].City);
        var fileName;
        switch(locations[0][i].City) {
            case "Washington":
                fileName = "WA";
                break;
            case "District of Columbia":
                fileName = "Washington%20DC";
                break;
            case "Virgin Islands":
                fileName = "US%20Virgin%20Islands";
                break;
            case "Northern Mariana Islands":
                fileName = "";
                break;
            default:
                fileName = locations[0][i].City.split(' ').join('%20');
                break;
        }

        if (fileName != "") {
            filesUSA.push(d3.csv("https://raw.githubusercontent.com/Perishleaf/data-visualisation-scripts/master/dash-2019-coronavirus/cumulative_data/"
            + fileName + ".csv"));
        }
    }

    for (let i = 0; i < locations[1].length; i++) {
        canadaOrder.push(locations[1][i].Province);
        filesCanada.push(d3.csv("https://raw.githubusercontent.com/Perishleaf/data-visualisation-scripts/master/dash-2019-coronavirus/cumulative_data/"
            + locations[1][i].Province.split(' ').join('%20') + ".csv"));
    }

// get files for US states recoveries
Promise.all(filesUSA).then(function (USstates) {
    var USrecs = [];
    for (let i = 0; i < USstates.length; i++) {
        USrecs.push({
            State: stateOrder[i],
            Recovered: USstates[i][0].Recovered,
            Recovered_Y: USstates[i][1].Recovered
        });
    }

// get files for Canadian provinces recoveries
Promise.all(filesCanada).then(function (canadaStates) {
    var canadaRecs = [];
    for (let i = 0; i < canadaStates.length; i++) {
        canadaRecs.push({
            Province: canadaOrder[i],
            Recovered: canadaStates[i][0].Recovered,
            Recovered_Y: canadaStates[i][1].Recovered
        });
    }

// process full data
Promise.all([
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + formatZero(yest.getUTCMonth() + 1) + "-" + formatZero(yest.getUTCDate()) + "-" + yest.getUTCFullYear() + ".csv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + formatZero(currentDate.getUTCMonth() + 1) + "-" + formatZero(currentDate.getUTCDate()) + "-" + currentDate.getUTCFullYear() + ".csv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + formatZero(yest2.getUTCMonth() + 1) + "-" + formatZero(yest2.getUTCDate()) + "-" + yest2.getUTCFullYear() + ".csv"),
    d3.csv("./data/statelatlong.csv"),
    d3.csv("./data/canadaprovinces.csv")
]).then(function (data) {
    // global totals counters
    var globalActive = 0;
    var globalRecovered = 0;
    var globalDeaths = 0;
    var globalNewCases = 0;

    var globalA_Y = 0;
    var globalR_Y = 0;
    var globalD_Y = 0;
    var globalN_Y = 0;

    // total counters for Australia, Canada, China, USA
    var AustraliaTotals = {
        Active: 0,
        Confirmed: 0,
        Recovered: 0,
        Deaths: 0,
        Confirmed_Y: 0,
        Confirmed_Y2: 0,
        New: 0
    }

    var CanadaTotals = {
        Active: 0,
        Confirmed: 0,
        Recovered: 0,
        Deaths: 0,
        Confirmed_Y: 0,
        Confirmed_Y2: 0,
        New: 0
    }

    var ChinaTotals = {
        Active: 0,
        Confirmed: 0,
        Recovered: 0,
        Deaths: 0,
        Confirmed_Y: 0,
        Confirmed_Y2: 0,
        New: 0
    }

    var USATotals = {
        Active: 0,
        Confirmed: 0,
        Recovered: 0,
        Deaths: 0,
        Confirmed_Y: 0,
        Confirmed_Y2: 0,
        New: 0
    }

    var markers = [];
    var radii = [1, 2, 4, 6, 8, 10, 13];

    // process data for all regions EXCEPT Canada & USA
    for (let i = 0; i < data[1].length; i++) {
        var today = data[1][i];
        var yesterday = data[0].find(item => item['Country_Region'] === today['Country_Region'] && item['Province_State'] === today['Province_State']);
        var twoDaysBack = data[2].find(item => item['Country_Region'] === today['Country_Region'] && item['Province_State'] === today['Province_State']);
        
        // zero out previous days' data for regions that are new
        if (!yesterday) {
            yesterday = {
                Province_State: today.Province_State,
                Country_Region: today.Country_Region,
                Lat: today.Lat,
                Long_: today.Long_,
                Confirmed: 0,
                Recovered: 0,
                Deaths: 0
            }
            twoDaysBack = yesterday;
        } 
        else if (!twoDaysBack) {
            twoDaysBack = {
                Province_State: today.Province_State,
                Country_Region: today.Country_Region,
                Lat: today.Lat,
                Long_: today.Long_,
                Confirmed: 0,
                Recovered: 0,
                Deaths: 0
            }
        }

        // plot points 
        if (today.Country_Region !== 'US' && today.Country_Region !== 'Canada' && today.Confirmed != 0) {
            plotPoint(today, yesterday, twoDaysBack);
        }
        else if ((today.Country_Region === 'US' || today.Country_Region === 'Canada') && today.Province_State === 'Recovered') {
            globalRecovered += parseInt(today.Recovered, 10);
            globalR_Y += parseInt(yesterday.Recovered, 10);
        }

        if (today.Country_Region === 'China') {
            ChinaTotals.Confirmed += parseInt(today.Confirmed, 10);
            ChinaTotals.Recovered += parseInt(today.Recovered, 10);
            ChinaTotals.Deaths += parseInt(today.Deaths, 10);
            ChinaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
            ChinaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
        }

        if (today.Country_Region === 'Australia') {
            AustraliaTotals.Confirmed += parseInt(today.Confirmed, 10);
            AustraliaTotals.Recovered += parseInt(today.Recovered, 10);
            AustraliaTotals.Deaths += parseInt(today.Deaths, 10);
            AustraliaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
            AustraliaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
        }
    }
    ChinaTotals.Active = ChinaTotals.Confirmed - ChinaTotals.Recovered - ChinaTotals.Deaths;
    ChinaTotals.New = ChinaTotals.Confirmed - ChinaTotals.Confirmed_Y;
    AustraliaTotals.Active = AustraliaTotals.Confirmed - AustraliaTotals.Recovered - AustraliaTotals.Deaths;
    AustraliaTotals.New = AustraliaTotals.Confirmed - AustraliaTotals.Confirmed_Y;

    // process data for USA by state
    for (let i = 0; i < data[3].length; i++) {
        var conf = 0;
        var rec = 0;
        var dead = 0;

        if (data[3][i].City != "Northern Mariana Islands") {
            rec = parseInt(USrecs.find(item => item.State == data[3][i].City).Recovered, 10);
        }

        // today's data
        for (let j = 0; j < data[1].length; j++) {
            if (data[1][j].Province_State === data[3][i].City) {
                conf += parseInt(data[1][j].Confirmed, 10);
                dead += parseInt(data[1][j].Deaths, 10);
            }
        }

        var today = {
            Province_State: data[3][i].City,
            Country_Region: 'US',
            Lat: data[3][i].Latitude,
            Long_: data[3][i].Longitude,
            Confirmed: conf,
            Recovered: rec,
            Deaths: dead
        }

        conf = 0;
        rec = 0;
        dead = 0;

        if (data[3][i].City != "Northern Mariana Islands") {
            rec = parseInt(USrecs.find(item => item.State == data[3][i].City).Recovered_Y, 10);
        }

        // yesterday's data
        for (let j = 0; j < data[0].length; j++) {
            if (data[0][j].Province_State === data[3][i].City) {
                conf += parseInt(data[0][j].Confirmed, 10);
                //rec += parseInt(data[0][j].Recovered, 10);
                dead += parseInt(data[0][j].Deaths, 10);
            }
        }

        var yesterday = {
            Province_State: data[3][i].City,
            Country_Region: 'US',
            Lat: data[3][i].Latitude,
            Long_: data[3][i].Longitude,
            Confirmed: conf,
            Recovered: rec,
            Deaths: dead
        }

        conf = 0;
        rec = 0;
        dead = 0;

        // two days ago's data
        for (let j = 0; j < data[2].length; j++) {
            if (data[2][j].Province_State === data[3][i].City) {
                conf += parseInt(data[2][j].Confirmed, 10);
                rec += parseInt(data[2][j].Recovered, 10);
                dead += parseInt(data[2][j].Deaths, 10);
            }
        }

        var twoDaysBack = {
            Province_State: data[3][i].City,
            Country_Region: 'US',
            Lat: data[3][i].Latitude,
            Long_: data[3][i].Longitude,
            Confirmed: conf,
            Recovered: rec,
            Deaths: dead
        }

        // do not plot points if no cases exist
        if (today.Confirmed != 0) {
            plotPoint(today, yesterday, twoDaysBack);
        }

        USATotals.Confirmed += parseInt(today.Confirmed, 10);
        USATotals.Recovered += parseInt(today.Recovered, 10);
        USATotals.Deaths += parseInt(today.Deaths, 10);
        USATotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
        USATotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
    }
    USATotals.Active = USATotals.Confirmed - USATotals.Recovered - USATotals.Deaths;
    USATotals.New = USATotals.Confirmed - USATotals.Confirmed_Y;

    // process data for canadian provinces
    for (let i = 0; i < data[4].length; i++) {
        var today = data[1].find(item => item.Province_State == data[4][i].Province);
        today.Recovered = parseInt(canadaRecs.find(item => item.Province == data[4][i].Province).Recovered, 10);
        var yesterday = data[0].find(item => item.Province_State == data[4][i].Province);
        yesterday.Recovered = parseInt(canadaRecs.find(item => item.Province == data[4][i].Province).Recovered_Y, 10);
        var twoDaysBack = data[2].find(item => item.Province_State == data[4][i].Province);

        // do not plot points if no cases exist
        if (today.Confirmed != 0) {
            plotPoint(today, yesterday, twoDaysBack);
        }

        CanadaTotals.Confirmed += parseInt(today.Confirmed, 10);
        CanadaTotals.Recovered += parseInt(today.Recovered, 10);
        CanadaTotals.Deaths += parseInt(today.Deaths, 10);
        CanadaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
        CanadaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
    }
    CanadaTotals.Active = CanadaTotals.Confirmed - CanadaTotals.Recovered - CanadaTotals.Deaths;
    CanadaTotals.New = CanadaTotals.Confirmed - CanadaTotals.Confirmed_Y;

    // Update doc with global numbers
    document.getElementById('activeCount').innerHTML = globalActive.toLocaleString();
    document.getElementById('recoveredCount').innerHTML = globalRecovered.toLocaleString();
    document.getElementById('deathCount').innerHTML = globalDeaths.toLocaleString();
    document.getElementById('changeCount').innerHTML = globalNewCases.toLocaleString();

    document.getElementById('recoveredDiff').innerHTML = '+' + (globalRecovered - globalR_Y).toLocaleString() 
        + ' from yesterday (+' + (((globalRecovered - globalR_Y) / globalR_Y) * 100).toFixed(1) + '%)';
    document.getElementById('deathDiff').innerHTML = '+' + (globalDeaths - globalD_Y).toLocaleString()
        + ' from yesterday (+' + (((globalDeaths - globalD_Y) / globalD_Y) * 100).toFixed(1) + '%)';
    if (globalNewCases - globalN_Y < 0) {
        document.getElementById('changeDiff').innerHTML = '<i class="arrow down icon"></i>' 
            + ((globalNewCases - globalN_Y) * -1).toLocaleString() 
            + ' from yesterday (' + (((globalNewCases - globalN_Y) / globalN_Y) * 100).toFixed(1) + '%)';
        document.getElementById('changeDiff').style.color = 'cyan';
    } 
    else {
        document.getElementById('changeDiff').innerHTML = '<i class="arrow up icon"></i>' 
            + (globalNewCases - globalN_Y).toLocaleString()
            + ' from yesterday (+' + (((globalNewCases - globalN_Y) / globalN_Y) * 100).toFixed(1) + '%)';
        document.getElementById('changeDiff').style.color = 'orange';
    }

    if (globalActive - globalA_Y < 0) {
        document.getElementById('activeDiff').innerHTML = (globalActive - globalA_Y).toLocaleString()
             + ' from yesterday (' + (((globalActive - globalA_Y) / globalA_Y) * 100).toFixed(1) + '%)';
        document.getElementById('activeDiff').style.color = 'cyan';
    } 
    else {
        document.getElementById('activeDiff').innerHTML = '+' + (globalActive - globalA_Y).toLocaleString() 
            + ' from yesterday (+' + (((globalActive - globalA_Y) / globalA_Y) * 100).toFixed(1) + '%)';
        document.getElementById('activeDiff').style.color = 'orange';
    }

    // create layer group of all the markers
    var markerLayer = L.layerGroup(markers);

    L.mapbox.accessToken = 'pk.eyJ1IjoiamtiaXNoYXkiLCJhIjoiY2ptM3N4OGU5MGk5YTNxbW10dms2b2FyYyJ9.IH37mJFcTWUa6O3RH7b4cA';
    var mapLayer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=' + L.mapbox.accessToken, {
        attribution: '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    var countryMarkers = L.layerGroup([
        // Australia marker
        L.marker([-25.406062, 133.942153], {
            icon: L.icon({
                iconUrl: 'images/au.png',
                iconSize: [35, 20],
                iconAnchor: [17, 10]
            })
        }).bindPopup('<div id="PopupTitle">Australia</div>'
        + '<div id="PopupBody">New Cases: ' + 
        (AustraliaTotals.New == 0 ? '<strong>0</strong><br>' : '<strong class="caseChange">' + AustraliaTotals.New + '</strong><br>')
        + 'Change in Daily Increase: ' + (AustraliaTotals.New - AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2 == 0 ? 
            '<strong>0</strong>' : (AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2) > 0 ? 
                '<strong style="color: orange;"><i class="arrow up icon"></i>' + (AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2)) + '</strong>'
                : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
        + '<br><br>'
        + 'Active: <strong class="active">' + AustraliaTotals.Active + '</strong><br>'
        + 'Recovered: <strong class="recovered">' + AustraliaTotals.Recovered + '</strong><br>' 
        + 'Deaths: <strong class="deaths">' + AustraliaTotals.Deaths + '</strong><br>'
        + 'Total Cases: <strong>' + AustraliaTotals.Confirmed + '</strong></div>'
        ).on('click', L.bind(makeChart, null, "Australia", ""))
        .on('popupclose', L.bind(makeChart, null, "Global", "")),

        // Canada marker
        L.marker([61.638154, -106.516615], {
            icon: L.icon({
                iconUrl: 'images/ca.png',
                iconSize: [35, 20],
                iconAnchor: [17, 10]
            })
        }).bindPopup('<div id="PopupTitle">Canada</div>'
        + '<div id="PopupBody">New Cases: ' + 
        (CanadaTotals.New == 0 ? '<strong>0</strong><br>' : '<strong class="caseChange">' + CanadaTotals.New + '</strong><br>')
        + 'Change in Daily Increase: ' + (CanadaTotals.New - CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2 == 0 ? 
            '<strong>0</strong>' : (CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2) > 0 ? 
                '<strong style="color: orange;"><i class="arrow up icon"></i>' + (CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2)) + '</strong>'
                : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
        + '<br><br>'
        + 'Active: <strong class="active">' + CanadaTotals.Active + '</strong><br>'
        + 'Recovered: <strong class="recovered">' + CanadaTotals.Recovered + '</strong><br>' 
        + 'Deaths: <strong class="deaths">' + CanadaTotals.Deaths + '</strong><br>'
        + 'Total Cases: <strong>' + CanadaTotals.Confirmed + '</strong></div>'
        ).on('click', L.bind(makeChart, null, "Canada", ""))
        .on('popupclose', L.bind(makeChart, null, "Global", "")),

        // China marker
        L.marker([23.990069, 135.514587], {
            icon: L.icon({
                iconUrl: 'images/cn.png',
                iconSize: [35, 20],
                iconAnchor: [17, 10]
            })
        }).bindPopup('<div id="PopupTitle">China</div>'
        + '<div id="PopupBody">New Cases: ' + 
        (ChinaTotals.New == 0 ? '<strong>0</strong><br>' : '<strong class="caseChange">' + ChinaTotals.New + '</strong><br>')
        + 'Change in Daily Increase: ' + (ChinaTotals.New - ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2 == 0 ? 
            '<strong>0</strong>' : (ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2) > 0 ? 
                '<strong style="color: orange;"><i class="arrow up icon"></i>' + (ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2)) + '</strong>'
                : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
        + '<br><br>'
        + 'Active: <strong class="active">' + ChinaTotals.Active + '</strong><br>'
        + 'Recovered: <strong class="recovered">' + ChinaTotals.Recovered + '</strong><br>' 
        + 'Deaths: <strong class="deaths">' + ChinaTotals.Deaths + '</strong><br>'
        + 'Total Cases: <strong>' + ChinaTotals.Confirmed + '</strong></div>'
        ).on('click', L.bind(makeChart, null, "China", ""))
        .on('popupclose', L.bind(makeChart, null, "Global", "")),

        // USA marker
        L.marker([35.796809, -135.019634], {
            icon: L.icon({
                iconUrl: 'images/us.png',
                iconSize: [35, 20],
                iconAnchor: [17, 10]
            })
        }).bindPopup('<div id="PopupTitle">United States</div>'
        + '<div id="PopupBody">New Cases: ' + 
        (USATotals.New == 0 ? '<strong>0</strong><br>' : '<strong class="caseChange">' + USATotals.New + '</strong><br>')
        + 'Change in Daily Increase: ' + (USATotals.New - USATotals.Confirmed_Y - USATotals.Confirmed_Y2 == 0 ? 
            '<strong>0</strong>' : (USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2) > 0 ? 
                '<strong style="color: orange;"><i class="arrow up icon"></i>' + (USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2)) + '</strong>'
                : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2)) * -1) + '</strong>')) 
        + '<br><br>'
        + 'Active: <strong class="active">' + USATotals.Active + '</strong><br>'
        + 'Recovered: <strong class="recovered">' + USATotals.Recovered + '</strong><br>' 
        + 'Deaths: <strong class="deaths">' + USATotals.Deaths + '</strong><br>'
        + 'Total Cases: <strong>' + USATotals.Confirmed + '</strong></div>'
        ).on('click', L.bind(makeChart, null, "US", ""))
        .on('popupclose', L.bind(makeChart, null, "Global", ""))
    ]);

    // initialize geo map
    var mymap = L.map('map', {
        center: [28.1559614,6.6860949],
        zoom: 2, 
        minZoom: 2,
        maxZoom: 7,
        maxBounds: L.latLngBounds([-90, -240], [90, 240]),
        maxBoundsViscosity: 0.5,
        wheelPxPerZoomLevel: 200,
        layers: [mapLayer, markerLayer, countryMarkers]
    });

    // function to take data and plot onto map
    function plotPoint(today, yesterday, twoDaysAgo) {
        today.Active = parseInt(today.Confirmed, 10) - parseInt(today.Recovered, 10) - parseInt(today.Deaths, 10);
        yesterday.Active = parseInt(yesterday.Confirmed, 10) - parseInt(yesterday.Recovered, 10) - parseInt(yesterday.Deaths, 10);

        globalActive += parseInt(today.Active, 10);
        globalDeaths += parseInt(today.Deaths, 10);
        globalA_Y += parseInt(yesterday.Active, 10);
        globalD_Y += parseInt(yesterday.Deaths, 10);

        // count USA and Canada recoveries from JHU for global total
        if (today.Country_Region !== 'US' && today.Country_Region !== 'Canada') {
            globalRecovered += parseInt(today.Recovered, 10);
            globalR_Y += parseInt(yesterday.Recovered, 10);
        }

        var radius = radii[6];
        if (today.Active <= 250) {
            radius = radii[0];
        }
        else if (today.Active <= 1000) {
            radius = radii[1];
        }
        else if (today.Active <= 5000) {
            radius = radii[2];
        }
        else if (today.Active <= 10000) {
            radius = radii[3];
        }
        else if (today.Active <= 30000) {
            radius = radii[4];
        }
        else if (today.Active <= 70000) {
            radius = radii[5];
        }

        var caseChange = parseInt(today.Confirmed, 10);
        if (yesterday) {
            caseChange = parseInt(today.Confirmed, 10) - parseInt(yesterday.Confirmed, 10);
        }

        var rateChange = caseChange;
        if (twoDaysAgo) {
            rateChange = caseChange - (parseInt(yesterday.Confirmed, 10) - parseInt(twoDaysAgo.Confirmed, 10));
        }

        var rateInfo;
        if (rateChange > 0) {
            rateInfo = 'Change in Daily Increase: <strong style="color: orange;"><i class="arrow up icon"></i>' + rateChange + '</strong><br>';
        }
        else if (rateChange < 0) {
            rateInfo = 'Change in Daily Increase: <strong style="color: cyan;"><i class="arrow down icon"></i>' + (rateChange * -1) + '</strong><br>';
        }
        else {
            rateInfo = 'Change in Daily Increase: <strong>' + rateChange + '</strong><br>';
        }

        globalNewCases += parseInt(caseChange, 10);
        globalN_Y += parseInt(yesterday.Confirmed, 10) - parseInt(twoDaysAgo.Confirmed, 10);
            
        var color = '#ed2d1f';
        if (caseChange <= 20) {
            color = '#fff4e9';
        }
        else if (caseChange <= 100) {
            color = '#fccda8'
        }
        else if (caseChange <= 500) {
            color = '#f8a36f'
        }
        else if (caseChange <= 2000) {
            color = '#f37240'
        }
        
        /// EXPERIMENTING ///
        // var color = '#f1f1f1';
        // if (rateChange < -20 && rateChange >= -200) {
        //     color = '#a4d5f8';
        // }
        // else if (rateChange < -200) {
        //     color = '#00bbff'
        // }
        // else if (caseChange > 20 && caseChange <= 200) {
        //     color = '#fe9a84'
        // }
        // else if (caseChange > 200) {
        //     color = '#ed2d1f'
        // }

        // popup info
        var popup = '<div id="PopupTitle">' 
            + (today['Province_State'] ? today['Province_State'] + ', ' : '') + today['Country_Region'] + '</div>'
            + '<div id="PopupBody">New Cases: ' + (caseChange === 0 ? '<strong>0</strong><br>' : '<strong class="caseChange">' + caseChange + '</strong><br>')
            + rateInfo + '<br>'
            + 'Active: <strong class="active">' + today.Active + '</strong><br>'
            + 'Recovered: <strong class="recovered">' + today.Recovered + '</strong><br>' 
            + 'Deaths: <strong class="deaths">' + today.Deaths + '</strong><br>'
            + 'Total Cases: <strong>' + today.Confirmed + '</strong></div>';

        // dont plot garbage locations, but count their data towards totals
        if (today.Province_State !== 'Recovered') {
            markers.push(L.circleMarker([today['Lat'], today['Long_']], {
                color: color,
                fillColor: color,
                fillOpacity: 0.65,
                weight: 1,
                radius: radius
            }).bindPopup(popup)
                .on('click', L.bind(makeChart, null, today.Country_Region, today.Province_State))
                .on('popupclose', L.bind(makeChart, null, "Global", "")));
        }
    }

    // check previous zoom level
    var oldZoom = mymap.getZoom();
    mymap.on('zoomstart', function() {
        oldZoom = mymap.getZoom();
        mymap.scrollWheelZoom.disable();
    });

    // change marker size on zoom
    mymap.on('zoomend', function() {
        var zoom = mymap.getZoom();
        var zoom2 = radii;
        var zoom3 = [2, 3, 6, 8, 12, 15, 20];
        var zoom4 = [4, 7, 11, 15, 19, 23, 30];
        var zoom5 = [6, 10, 14, 18, 22, 26, 32];

        // zooming into 3
        if (zoom == 3 && zoom > oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom2[0]:
                        markers[i].setRadius(zoom3[0]);
                        break;
                    case zoom2[1]: 
                        markers[i].setRadius(zoom3[1]);
                        break;
                    case zoom2[2]: 
                        markers[i].setRadius(zoom3[2]);
                        break;
                    case zoom2[3]: 
                        markers[i].setRadius(zoom3[3]);
                        break;
                    case zoom2[4]: 
                        markers[i].setRadius(zoom3[4]);
                        break;
                    case zoom2[5]: 
                        markers[i].setRadius(zoom3[5]);
                        break;
                    case zoom2[6]: 
                        markers[i].setRadius(zoom3[6]);
                        break;
                }
            }
        }
        // zooming into 4
        else if (zoom == 4 && zoom > oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom3[0]:
                        markers[i].setRadius(zoom4[0]);
                        break;
                    case zoom3[1]: 
                        markers[i].setRadius(zoom4[1]);
                        break;
                    case zoom3[2]: 
                        markers[i].setRadius(zoom4[2]);
                        break;
                    case zoom3[3]: 
                        markers[i].setRadius(zoom4[3]);
                        break;
                    case zoom3[4]: 
                        markers[i].setRadius(zoom4[4]);
                        break;
                    case zoom3[5]: 
                        markers[i].setRadius(zoom4[5]);
                        break;
                    case zoom3[6]: 
                        markers[i].setRadius(zoom4[6]);
                        break;
                }
            }
        }
        // zooming into 5
        else if (zoom == 5 && zoom > oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom4[0]:
                        markers[i].setRadius(zoom5[0]);
                        break;
                    case zoom4[1]: 
                        markers[i].setRadius(zoom5[1]);
                        break;
                    case zoom4[2]: 
                        markers[i].setRadius(zoom5[2]);
                        break;
                    case zoom4[3]: 
                        markers[i].setRadius(zoom5[3]);
                        break;
                    case zoom4[4]: 
                        markers[i].setRadius(zoom5[4]);
                        break;
                    case zoom4[5]: 
                        markers[i].setRadius(zoom5[5]);
                        break;
                    case zoom4[6]: 
                        markers[i].setRadius(zoom5[6]);
                        break;
                }
            }
        }
        // zooming out to 4
        else if (zoom == 4 && zoom < oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom5[0]:
                        markers[i].setRadius(zoom4[0]);
                        break;
                    case zoom5[1]: 
                        markers[i].setRadius(zoom4[1]);
                        break;
                    case zoom5[2]: 
                        markers[i].setRadius(zoom4[2]);
                        break;
                    case zoom5[3]: 
                        markers[i].setRadius(zoom4[3]);
                        break;
                    case zoom5[4]: 
                        markers[i].setRadius(zoom4[4]);
                        break;
                    case zoom5[5]: 
                        markers[i].setRadius(zoom4[5]);
                        break;
                    case zoom5[6]: 
                        markers[i].setRadius(zoom4[6]);
                        break;
                }
            }
        }
        // zooming out to 3
        else if (zoom == 3 && zoom < oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom4[0]:
                        markers[i].setRadius(zoom3[0]);
                        break;
                    case zoom4[1]: 
                        markers[i].setRadius(zoom3[1]);
                        break;
                    case zoom4[2]: 
                        markers[i].setRadius(zoom3[2]);
                        break;
                    case zoom4[3]: 
                        markers[i].setRadius(zoom3[3]);
                        break;
                    case zoom4[4]: 
                        markers[i].setRadius(zoom3[4]);
                        break;
                    case zoom4[5]: 
                        markers[i].setRadius(zoom3[5]);
                        break;
                    case zoom4[6]: 
                        markers[i].setRadius(zoom3[6]);
                        break;
                }
            }
        }
        // zooming out to 2
        else if (zoom == 2 && zoom < oldZoom) {
            for (let i = 0; i < markers.length; i++) {
                var rad = markers[i]._radius;
                switch(rad) {
                    case zoom3[0]:
                        markers[i].setRadius(zoom2[0]);
                        break;
                    case zoom3[1]: 
                        markers[i].setRadius(zoom2[1]);
                        break;
                    case zoom3[2]: 
                        markers[i].setRadius(zoom2[2]);
                        break;
                    case zoom3[3]: 
                        markers[i].setRadius(zoom2[3]);
                        break;
                    case zoom3[4]: 
                        markers[i].setRadius(zoom2[4]);
                        break;
                    case zoom3[5]: 
                        markers[i].setRadius(zoom2[5]);
                        break;
                    case zoom3[6]: 
                        markers[i].setRadius(zoom2[6]);
                        break;
                }
            }
        }
        mymap.scrollWheelZoom.enable();
    });

    // update info here so it doesn't mess up file reading
    currentDate.setUTCHours(24);
    currentDate.setUTCMinutes(0);
    currentDate.setUTCSeconds(0);

    document.getElementById('lastUpdated').innerHTML = 'Updated at ' + currentDate.toLocaleString() + ' | ';
})})})}); // <== dont worry about it...

// initialize chart here so it can be destroyed for redraws
var canvas = document.getElementById('infectionChart');
var ctx = canvas.getContext('2d');
var chart = new Chart(ctx, {
    type: 'line',
    options: {
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 12
            }
        }
    }
});

var canvas2 = document.getElementById('trajectoryChart');
var ctx2 = canvas2.getContext('2d');
var trajectory = new Chart(ctx2, {
    type: 'line',
    options: {
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 12
            }
        }
    }
});

// create chart based on selected region and province
function makeChart(region, province = "") {
    var files = [d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv")
    ];
    if (region == 'US' && province != "") {
        files = [d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv"),
            "",
            d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv")
        ];
        switch(province) {
            case "Washington":
                fileName = "WA";
                break;
            case "District of Columbia":
                fileName = "Washington%20DC";
                break;
            case "Virgin Islands":
                fileName = "US%20Virgin%20Islands";
                break;
            case "Northern Mariana Islands":
                fileName = "";
                break;
            default:
                fileName = province.split(' ').join('%20');
                break;
        }
        if (fileName != "") {
            files[1] = d3.csv("https://raw.githubusercontent.com/Perishleaf/data-visualisation-scripts/master/dash-2019-coronavirus/cumulative_data/"
                + fileName + ".csv");
        }
    }
    else if (region == 'Canada' && province != "") {
        files[1] = d3.csv("https://raw.githubusercontent.com/Perishleaf/data-visualisation-scripts/master/dash-2019-coronavirus/cumulative_data/"
            + province.split(' ').join('%20') + ".csv");
    }
    // time series data for charts
    Promise.all(files).then(function (data) {
        var title = region;
        if (province != "" && region != "Global") {
            title = province + ', ' + region;
        }

        document.getElementById('infoTitle').innerHTML = title;
        chart.destroy();
        trajectory.destroy();

        var dateLabels = [];
        var confs = [];
        var recs = [];
        var deaths = [];
        var active = [];
        var increase = [];
        var trend = [];
        var exponential = [];
        
        if (region == "Global") {
            for (let [key, value] of Object.entries(data[0][0])) {
                if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                    dateLabels.push(key);
                }
            }

            // Confirmed cases
            for (let i = 0; i < Object.keys(data[0][0]).length - 4; i++) {
                confs[i] = 0;
            }
            for (let i = 0; i < data[0].length; i++) {
                let j = 0;
                for (let [key, value] of Object.entries(data[0][i])) {
                    if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                        confs[j] += parseInt(value, 10);
                        j++;
                    }
                }
            }

            // Recovered cases
            for (let i = 0; i < Object.keys(data[1][0]).length - 4; i++) {
                recs[i] = 0;
            }
            for (let i = 0; i < data[1].length; i++) {
                let j = 0;
                for (let [key, value] of Object.entries(data[1][i])) {
                    if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                        recs[j] += parseInt(value, 10);
                        j++;
                    }
                }
            }

            // Death cases
            for (let i = 0; i < Object.keys(data[2][0]).length - 4; i++) {
                deaths[i] = 0;
            }
            for (let i = 0; i < data[2].length; i++) {
                let j = 0;
                for (let [key, value] of Object.entries(data[2][i])) {
                    if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                        deaths[j] += parseInt(value, 10);
                        j++;
                    }
                }
            }

            // create active cases data
            for (let i = 0; i < confs.length; i++) {
                active.push(confs[i] - recs[i] - deaths[i]);
            }

            // create daily change data
            increase.push(confs[0]);
            for (let i = 0; i < confs.length - 1; i++) {
                if (confs[i+1] - confs[i] < 0) {
                    increase.push(0);
                }
                else {
                    increase.push(confs[i+1] - confs[i]);
                }
            }

            // create trajectory data
            for (let i = 6; i < confs.length; i++) {
                var weeklyGrowth = 0;
                for (let j = i - 6; j <= i; j++) {
                    weeklyGrowth += increase[j];
                }
                trend.push({x: confs[i], y: weeklyGrowth});
                exponential.push({x: confs[i], y: confs[i]});
            }
        }
        // Charts for US states
        else if (region == "US" && province != "") {
            // get the dates
            for (let [key, value] of Object.entries(data[0][0])) {
                if (key != "Province_State" && key != "Country_Region" && key != "Lat" && key != "Long_" 
                && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                    dateLabels.push(key);
                }
            }

            // Confirmed cases
            for (let i = 0; i < Object.keys(data[0][0]).length - 11; i++) {
                confs[i] = 0;
            }
            data[0].forEach(element => {
                var i = 0;
                if (element['Province_State'] === province) {
                    for (let [key, value] of Object.entries(element)) {
                        if (key != "Province_State" && key != "Country_Region" && key != "Lat" && key != "Long_" 
                        && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                        && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                            confs[i] += parseInt(value, 10);
                            i++;
                        }
                    }
                }
            });

            // Death cases
            for (let i = 0; i < Object.keys(data[2][0]).length - 12; i++) {
                deaths[i] = 0;
            }
            data[2].forEach(element => {
                var i = 0;
                if (element['Province_State'] === province) {
                    for (let [key, value] of Object.entries(element)) {
                        if (key != "Province_State" && key != "Country_Region" && key != "Lat" && key != "Long_" 
                        && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                        && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                            deaths[i] += parseInt(value, 10);
                            i++;
                        }
                    }
                }
            });

            // Recovered cases
            for (let i = data[1].length - 1; i >= 0; i--) {
                recs.push(parseInt(data[1][i].Recovered, 10));
            }

            // catch mismatch length in recovery data
            while (recs.length > confs.length && recs.length != confs.length) {
                recs.splice(0, 1);
            }

            // create active cases data
            for (let i = 0; i < confs.length; i++) {
                active.push(confs[i] - recs[i] - deaths[i]);
            }

            // create daily change data
            increase.push(confs[0]);
            for (let i = 0; i < confs.length - 1; i++) {
                if (confs[i+1] - confs[i] < 0) {
                    increase.push(0);
                }
                else {
                    increase.push(confs[i+1] - confs[i]);
                }
            }

            // create trajectory data from entire data length
            for (let i = 6; i < confs.length; i++) {
                var weeklyGrowth = 0;
                for (let j = i - 6; j <= i; j++) {
                    weeklyGrowth += increase[j];
                }
                trend.push({x: confs[i], y: weeklyGrowth});
                exponential.push({x: confs[i], y: confs[i]});
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5) {
                firstIdx = confs.findIndex(val => val >= 1);
            }
            confs.splice(0, firstIdx);
            recs.splice(0, firstIdx);
            deaths.splice(0, firstIdx);
            dateLabels.splice(0, firstIdx);
            increase.splice(0, firstIdx);
            active.splice(0, firstIdx);
        }
        // Charts for full China, Canada, and Australia countries
        else if ((region == "Canada" || region == "China" || region == "Australia") && province == "") {
            // get the dates
            for (let [key, value] of Object.entries(data[0][0])) {
                if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long" 
                && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                    dateLabels.push(key);
                }
            }

            // Confirmed cases
            for (let i = 0; i < dateLabels.length; i++) {
                confs[i] = 0;
            }
            data[0].forEach(element => {
                var i = 0;
                if (element['Country/Region'] === region) {
                    for (let [key, value] of Object.entries(element)) {
                        if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long" 
                        && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                        && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                            confs[i] += parseInt(value, 10);
                            i++;
                        }
                    }
                }
            });

            // Death cases
            for (let i = 0; i < dateLabels.length; i++) {
                deaths[i] = 0;
            }
            data[2].forEach(element => {
                var i = 0;
                if (element['Country/Region'] === region) {
                    for (let [key, value] of Object.entries(element)) {
                        if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long" 
                        && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                        && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                            deaths[i] += parseInt(value, 10);
                            i++;
                        }
                    }
                }
            });

            // Recovery cases
            if (region == "Canada") {
                var areaR = data[1].find(item => item['Country/Region'] === region);
                for (let [key, value] of Object.entries(areaR)) {
                    if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                        recs.push(parseInt(value, 10));
                    }
                }
            }
            else {
                for (let i = 0; i < dateLabels.length; i++) {
                    recs[i] = 0;
                }
                data[1].forEach(element => {
                    var i = 0;
                    if (element['Country/Region'] === region) {
                        for (let [key, value] of Object.entries(element)) {
                            if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long" 
                            && key != "Admin2" && key != "UID" && key != "iso2" && key != "iso3" && key != "code3" 
                            && key != "FIPS" && key != "Combined_Key" && key != "Population") {
                                recs[i] += parseInt(value, 10);
                                i++;
                            }
                        }
                    }
                });
            }
            

            // create active cases data
            for (let i = 0; i < confs.length; i++) {
                active.push(confs[i] - recs[i] - deaths[i]);
            }

            // create daily change data
            increase.push(confs[0]);
            for (let i = 0; i < confs.length - 1; i++) {
                if (confs[i+1] - confs[i] < 0) {
                    increase.push(0);
                }
                else {
                    increase.push(confs[i+1] - confs[i]);
                }
            }

            // create trajectory data from entire data length
            for (let i = 6; i < confs.length; i++) {
                var weeklyGrowth = 0;
                for (let j = i - 6; j <= i; j++) {
                    weeklyGrowth += increase[j];
                }
                trend.push({x: confs[i], y: weeklyGrowth});
                exponential.push({x: confs[i], y: confs[i]});
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5) {
                firstIdx = confs.findIndex(val => val >= 1);
            }
            confs.splice(0, firstIdx);
            recs.splice(0, firstIdx);
            deaths.splice(0, firstIdx);
            dateLabels.splice(0, firstIdx);
            increase.splice(0, firstIdx);
            active.splice(0, firstIdx);
        }
        // Charts for all other regions
        else {
            var areaC = data[0].find(item => item['Country/Region'] === region && item['Province/State'] === province);
            var areaR;
            var areaD = data[2].find(item => item['Country/Region'] === region && item['Province/State'] === province);

            // use other files for Canadian recoveries
            if (region == "Canada") {
                for (let i = data[1].length - 1; i >= 0; i--) {
                    recs.push(parseInt(data[1][i].Recovered, 10));
                }
            }
            else {
                areaR = data[1].find(item => item['Country/Region'] === region && item['Province/State'] === province);
                for (let [key, value] of Object.entries(areaR)) {
                    if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                        recs.push(parseInt(value, 10));
                    }
                }
            }

            // Confirmed cases
            for (let [key, value] of Object.entries(areaC)) {
                if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                    confs.push(parseInt(value, 10));
                    dateLabels.push(key);
                }
            }
            
            // Death cases
            for (let [key, value] of Object.entries(areaD)) {
                if (key != "Province/State" && key != "Country/Region" && key != "Lat" && key != "Long") {
                    deaths.push(parseInt(value, 10));
                }
            }

            // catch mismatch length in recovery data
            while (recs.length > confs.length && recs.length != confs.length) {
                recs.splice(0, 1);
            }

            // create active cases data
            for (let i = 0; i < confs.length; i++) {
                active.push(confs[i] - recs[i] - deaths[i]);
            }

            // create daily change data
            increase.push(confs[0]);
            for (let i = 0; i < confs.length - 1; i++) {
                if (confs[i+1] - confs[i] < 0) {
                    increase.push(0);
                }
                else {
                    increase.push(confs[i+1] - confs[i]);
                }
            }

            // create trajectory data from entire data length
            for (let i = 6; i < confs.length; i++) {
                var weeklyGrowth = 0;
                for (let j = i - 6; j <= i; j++) {
                    weeklyGrowth += increase[j];
                }
                trend.push({x: confs[i], y: weeklyGrowth});
                exponential.push({x: confs[i], y: confs[i]});
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5) {
                firstIdx = confs.findIndex(val => val >= 1);
            }
            confs.splice(0, firstIdx);
            recs.splice(0, firstIdx);
            deaths.splice(0, firstIdx);
            dateLabels.splice(0, firstIdx);
            increase.splice(0, firstIdx);
            active.splice(0, firstIdx);
        }

        // show/hide series depending on current button selection
        var activeHide = document.getElementById('activeButton').classList.contains("basic");
        var recHide = document.getElementById('recoveredButton').classList.contains("basic");
        var deathHide = document.getElementById('deathButton').classList.contains("basic");
        var increaseHide = document.getElementById('increaseButton').classList.contains("basic");

        // draw chart
        Chart.defaults.global.defaultFontColor = 'lightgray';
        Chart.scaleService.updateScaleDefaults('logarithmic', {
            ticks: {
                callback: function(tick, index, ticks) {
                    if (tick > 999 && tick < 1000000) {
                        return (tick / 1000).toFixed(0) + 'k';
                    } 
                    else if (tick >= 1000000) {
                        return (tick / 1000000).toFixed(0) + 'M';
                    } 
                    else {
                        return tick;
                    }
                }
            }
        });

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [
                    {
                        label: "Active Cases",
                        backgroundColor: "gold",
                        borderColor: "gold",
                        data: active,
                        pointRadius: 1,
                        fill: false,
                        hidden: activeHide
                    },
                    {
                        label: "Recovered",
                        backgroundColor: "dodgerblue",
                        borderColor: "dodgerblue",
                        data: recs,
                        pointRadius: 1,
                        fill: false,
                        hidden: recHide
                    },
                    {
                        label: "Deaths",
                        backgroundColor: "orchid",
                        borderColor: "orchid",
                        data: deaths,
                        pointRadius: 1,
                        fill: false,
                        hidden: deathHide
                    },
                    {
                        label: "Daily Increase",
                        backgroundColor: "#ed2d1f",
                        borderColor: "#ed2d1f",
                        data: increase,
                        pointRadius: 1,
                        fill: false,
                        hidden: increaseHide
                    }
                ]
            },
            options: {
                legend: {
                    display: false,
                    position: 'bottom',
                    labels: {
                        boxWidth: 12
                    }
                },
                scales: {
                    xAxes: [{
                        gridLines: { 
                            color: "#4f4f4f",
                            zeroLineColor: '#e0e0e0'
                            }
                        }],
                    yAxes: [{
                        gridLines: { 
                            color: "#4f4f4f", 
                            zeroLineColor: '#e0e0e0'
                            },
                        // type: 'logarithmic'
                        }]
                }
            }
        });

        trajectory = new Chart(ctx2, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: "Current Trajectory",
                        backgroundColor: "orange",
                        borderColor: "orange",
                        data: trend,
                        pointRadius: 1,
                        fill: false,
                        showLine: true
                    },
                    {
                        label: "Exponential Growth",
                        backgroundColor: "#a600ff",
                        borderColor: "#a600ff",
                        data: exponential,
                        pointRadius: 1,
                        fill: false,
                        showLine: true
                    }
                ]
            },
            options: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12
                    }
                },
                scales: {
                    xAxes: [{
                        gridLines: { 
                            display: false,
                            color: "#4f4f4f",
                            zeroLineColor: '#e0e0e0'
                            },
                        scaleLabel: {
                            display: true,
                            labelString: 'Total Confirmed Cases',
                            padding: -3
                        },
                        type: 'logarithmic',
                        ticks: {
                            maxTicksLimit: 8,
                        }
                    }],
                    yAxes: [{
                        gridLines: { 
                            display: false,
                            color: "#4f4f4f", 
                            zeroLineColor: '#e0e0e0'
                            },
                        scaleLabel: {
                            display: true,
                            labelString: 'New Cases (Weekly)'
                        },
                        type: 'logarithmic',
                        ticks: {
                            maxTicksLimit: 4,
                        }
                    }]
                }
            }
        });
    });
}

// initialize page with global charts
makeChart("Global", "");

// handle click with dataset chart buttons
function clickChartButton(buttonID) {
    var color = "";
    var set = "";
    switch (buttonID) {
        case 'activeButton':
            color = "yellow";
            set = "Active Cases";
            break;
        case 'recoveredButton':
            color = "blue";
            set = "Recovered";
            break;
        case 'deathButton':
            color = "purple";
            set = "Deaths";
            break;
        case 'increaseButton':
            color = "red";
            set = "Daily Increase";
    }
    var button = document.getElementById(buttonID);
    if (button.classList.contains("basic")) {
        button.className = "ui " + color + " button mini";
        chart.data.datasets.find(item => item['label'] == set).hidden = false;
    }
    else {
        button.className = "ui " + color + " basic button mini";
        chart.data.datasets.find(item => item['label'] == set).hidden = true;
    }
    chart.update();
}
