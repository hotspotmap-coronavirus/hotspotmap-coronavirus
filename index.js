// process current and previous date 
// NOTE: currently set to update at 12:00 AM UTC
var d = new Date();
var currentDay;
if (d.getUTCDate() < 10) {
    currentDay = '0' + (d.getUTCDate() - 1);
}
else {
    currentDay = '' + (d.getUTCDate() - 1);
}

var currentMonth;
if (d.getUTCMonth() + 1 < 10) {
    currentMonth = '0' + (d.getUTCMonth() + 1);
}
else {
    currentMonth = '' + (d.getUTCMonth() + 1);
}
var currentYear = d.getUTCFullYear();

// CHECK if at the start of new month
if (currentDay <= 0) {
    switch(currentMonth - 1) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
            currentDay = 31;
            if (currentMonth - 1 < 10) {
                currentMonth = '0' + (currentMonth - 1);
            }
            else {
                currentMonth = '' + (currentMonth - 1);
            }
            break;
        case 2:
            if (currentYear % 4 == 0) {
                currentDay = 29;
            }
            else {
                currentDay = 28;
            }
            currentMonth = '0' + (currentMonth - 1);
            break;
        case 4:
        case 6:
        case 9:
        case 11:
            currentDay = 30;
            if (currentMonth - 1 < 10) {
                currentMonth = '0' + (currentMonth - 1);
            }
            else {
                currentMonth = '' + (currentMonth - 1);
            }
            break;
        // THIS IS DECEMBER
        case 0:
            currentDay = 31;
            currentYear--;
            currentMonth = '12';
            break;
    }
}

function getYesterday(day, month, year) {
    var previousDay = day - 1;
    if (previousDay < 10) {
        previousDay = '0' + previousDay;
    }
    var previousMonth = month;
    var previousYear = year;
    // if month has changed
    if (previousDay <= 0) {
        switch(month - 1) {
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
                previousDay = 31;
                if (month - 1 < 10) {
                    previousMonth = '0' + (month - 1);
                }
                else {
                    previousMonth = '' + (month - 1);
                }
                break;
            case 2:
                if (currentYear % 4 == 0) {
                    previousDay = 29;
                }
                else {
                    previousDay = 28;
                }
                previousMonth = '0' + (month - 1);
                break;
            case 4:
            case 6:
            case 9:
            case 11:
                previousDay = 30;
                if (month - 1 < 10) {
                    previousMonth = '0' + (month - 1);
                }
                else {
                    previousMonth = '' + (month - 1);
                }
                break;
            // THIS IS DECEMBER
            case 0:
                previousDay = 31;
                previousYear--;
                previousMonth = '12';
                break;
        }
    }

    return { day: previousDay, month: previousMonth, year: previousYear };
}

var yest = getYesterday(currentDay, currentMonth, currentYear);
var yest2 = getYesterday(yest.day, yest.month, yest.year);

console.log(currentMonth + "-" + currentDay + "-" + currentYear);
console.log(yest.month + "-" + yest.day + "-" + yest.year);
console.log(yest2.month + "-" + yest2.day + "-" + yest2.year);

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
            Recovered: USstates[i][0].Recovered
        });
    }

// get files for Canadian provinces recoveries
Promise.all(filesCanada).then(function (canadaStates) {
    var canadaRecs = [];
    for (let i = 0; i < canadaStates.length; i++) {
        canadaRecs.push({
            Province: canadaOrder[i],
            Recovered: canadaStates[i][0].Recovered
        });
    }

// process full data
Promise.all([
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + yest.month + "-" + yest.day + "-" + yest.year + ".csv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + currentMonth + "-" + currentDay + "-" + currentYear + ".csv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + yest2.month + "-" + yest2.day + "-" + yest2.year + ".csv"),
    d3.csv("./data/statelatlong.csv"),
    d3.csv("./data/canadaprovinces.csv")
]).then(function (data) {
    // global totals counters
    var globalActive = 0;
    var globalRecovered = 0;
    var globalDeaths = 0;
    var globalNewCases = 0;

    var markers = [];
    var radii = [1, 2, 3, 5, 7, 10, 13];

    // process data for non-USA regions
    for (let i = 0; i < data[1].length; i++) {
        var today = data[1][i];
        if (today.Country_Region !== 'US' && today.Country_Region !== 'Canada' && today.Confirmed != 0) {
            var yesterday = data[0].find(item => item['Country_Region'] === today['Country_Region'] && item['Province_State'] === today['Province_State']);
            var yesterYesterday = data[2].find(item => item['Country_Region'] === today['Country_Region'] && item['Province_State'] === today['Province_State']);
            plotPoint(today, yesterday, yesterYesterday);
        }
        else if ((today.Country_Region === 'US' || today.Country_Region === 'Canada') && today.Province_State === 'Recovered') {
            globalRecovered += parseInt(today.Recovered, 10);
        }
    }

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

        // yesterday's data
        for (let j = 0; j < data[0].length; j++) {
            if (data[0][j].Province_State === data[3][i].City) {
                conf += parseInt(data[0][j].Confirmed, 10);
                rec += parseInt(data[0][j].Recovered, 10);
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
    }

    // process data for canadian provinces
    for (let i = 0; i < data[4].length; i++) {
        var today = data[1].find(item => item.Province_State == data[4][i].Province);
        today.Recovered = parseInt(canadaRecs.find(item => item.Province == data[4][i].Province).Recovered, 10);
        var yesterday = data[0].find(item => item.Province_State == data[4][i].Province);
        var twoDaysBack = data[2].find(item => item.Province_State == data[4][i].Province);

        // do not plot points if no cases exist
        if (today.Confirmed != 0) {
            plotPoint(today, yesterday, twoDaysBack);
        }
    }

    document.getElementById('activeCount').innerHTML = globalActive.toLocaleString();
    document.getElementById('recoveredCount').innerHTML = globalRecovered.toLocaleString();
    document.getElementById('deathCount').innerHTML = globalDeaths.toLocaleString();
    document.getElementById('changeCount').innerHTML = globalNewCases.toLocaleString();

    // function to take data and plot onto map
    function plotPoint(today, yesterday, twoDaysAgo) {
        // data is weird, double check if Active is truly 0
        if (!today.Active || today.Active == 0) {
            today.Active = parseInt(today.Confirmed, 10) - parseInt(today.Recovered, 10) - parseInt(today.Deaths, 10);
        }

        globalActive += parseInt(today.Active, 10);
        globalDeaths += parseInt(today.Deaths, 10);

        // count USA and Canada recoveries from JHU for global total
        if (today.Country_Region !== 'US' && today.Country_Region !== 'Canada') {
            globalRecovered += parseInt(today.Recovered, 10);
        }

        var radius = radii[6];
        if (today.Active <= 25) {
            radius = radii[0];
        }
        else if (today.Active <= 100) {
            radius = radii[1];
        }
        else if (today.Active <= 500) {
            radius = radii[2];
        }
        else if (today.Active <= 1000) {
            radius = radii[3];
        }
        else if (today.Active <= 10000) {
            radius = radii[4];
        }
        else if (today.Active <= 20000) {
            radius = radii[5];
        }

        var caseChange = parseInt(today.Confirmed, 10);
        if (yesterday) {
            caseChange = parseInt(today.Confirmed, 10) - parseInt(yesterday.Confirmed, 10);
        }

        var dailyInfo;
        if (caseChange === 0) {
            dailyInfo = 'New Cases: <strong>' + caseChange + '</strong><br>';
        }
        else {
            dailyInfo = 'New Cases: <strong class="caseChange">' + caseChange + '</strong><br>';
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
        if (today['Province_State']) {
            popup = '<div id="PopupTitle">' + today['Province_State'] + ', ' + today['Country_Region'] + '</div>'
                    + '<div id="PopupBody">' + dailyInfo
                    + rateInfo + '<br>'
                    + 'Active: <strong class="active">' + today.Active + '</strong><br>'
                    + 'Recovered: <strong class="recovered">' + today.Recovered + '</strong><br>' 
                    + 'Deaths: <strong class="deaths">' + today.Deaths + '</strong><br>'
                    + 'Total Cases: <strong>' + today.Confirmed + '</strong></div>';
        }
        else {
            popup = '<div id="PopupTitle">' + today['Country_Region'] + '</div>'
                    + '<div id="PopupBody">' + dailyInfo
                    + rateInfo + '<br>'
                    + 'Active: <strong class="active">' + today.Active + '</strong><br>'
                    + 'Recovered: <strong class="recovered">' + today.Recovered + '</strong><br>' 
                    + 'Deaths: <strong class="deaths">' + today.Deaths + '</strong><br>'
                    + 'Total Cases: <strong>' + today.Confirmed + '</strong></div>';
        }

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
                .on('popupclose', L.bind(makeChart, null, "Global")));
        }
    }

    // create layer group of all the markers
    var markerLayer = L.layerGroup(markers);

    L.mapbox.accessToken = 'pk.eyJ1IjoiamtiaXNoYXkiLCJhIjoiY2ptM3N4OGU5MGk5YTNxbW10dms2b2FyYyJ9.IH37mJFcTWUa6O3RH7b4cA';
    var mapLayer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=' + L.mapbox.accessToken, {
        attribution: '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    // initialize geo map
    var mymap = L.map('map', {
        center: [28.1559614,6.6860949],
        zoom: 2, 
        minZoom: 2,
        maxZoom: 7,
        maxBounds: L.latLngBounds([-90, -240], [90, 240]),
        maxBoundsViscosity: 0.5,
        wheelPxPerZoomLevel: 200,
        layers: [mapLayer, markerLayer]
    });

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
        var zoom3 = [2, 3, 5, 8, 12, 15, 20];
        var zoom4 = [4, 7, 11, 15, 19, 23, 30];
        var zoom5 = [6, 10, 14, 19, 24, 29, 36];

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

// create chart based on selected region and province
function makeChart(region, province = "") {
    var files = [d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv")
    ];
    if (region == 'US') {
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
    else if (region == 'Canada') {
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

        var dateLabels = [];
        var confs = [];
        var recs = [];
        var deaths = [];
        var active = [];
        var increase = [];
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
        }
        // Charts for US states
        else if (region == "US") {
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
            
            // catch mismatch length in recovery data
            if (recs.length != confs.length) {
                recs.splice(0, 1);
            }
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

            // catch mismatch length in recovery data
            if (recs.length != confs.length) {
                recs.splice(0, 1);
            }
        }

        // show/hide series depending on current button selection
        var activeHide = document.getElementById('activeButton').classList.contains("basic");
        var recHide = document.getElementById('recoveredButton').classList.contains("basic");
        var deathHide = document.getElementById('deathButton').classList.contains("basic");
        var increaseHide = document.getElementById('increaseButton').classList.contains("basic");

        // draw chart
        Chart.defaults.global.defaultFontColor = 'lightgray';
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
    });
}

// initialize page with global charts
makeChart("Global");

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

var dat = new Date();
dat.setUTCDate(currentDay);
dat.setUTCMonth(d.getUTCMonth());
dat.setUTCFullYear(currentYear);
dat.setUTCHours(24);
dat.setUTCMinutes(0);
dat.setUTCSeconds(0);

document.getElementById('lastUpdated').innerHTML = 'Updated at ' + dat.toLocaleString();