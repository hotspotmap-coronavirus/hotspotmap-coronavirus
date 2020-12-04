// Global variables
// map
var mymap;
var dateDiff = 0;

// charts
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

// slider
var slider = document.getElementById("dateRange");
var startingDate = new Date("2020-01-24"); // Jan 24th UTC 

// update date next to slider 
slider.oninput = function() {
    var thisDay = new Date();
    thisDay.setUTCDate(thisDay.getUTCDate() - 1 - parseInt(this.value, 10));
    document.getElementById("selectedDate").innerHTML = formatZero(thisDay.getUTCMonth() + 1) + " / " + formatZero(thisDay.getUTCDate()) + " / " + thisDay.getUTCFullYear();
}

// change map according to new date
slider.onchange = async function() {
    var val = parseInt(this.value, 10);
    // set the current date value
    var thisDay = new Date();
    thisDay.setUTCDate(thisDay.getUTCDate() - 1);
    // change date to slider value
    thisDay.setUTCDate(thisDay.getUTCDate() - val);
    dateDiff = val;

    var prevDay = new Date(thisDay);
    prevDay.setUTCDate(thisDay.getUTCDate() - 1);
    var prevDay2 = new Date(thisDay);
    prevDay2.setUTCDate(thisDay.getUTCDate() - 2);
    console.log(formatZero(thisDay.getUTCMonth() + 1) + "-" + formatZero(thisDay.getUTCDate()) + "-" + thisDay.getUTCFullYear());

    // update map to selected date
    mymap.remove();
    slider.disabled = true;
    makeChart("Global");
    await generateMap(thisDay, prevDay, prevDay2);
    slider.disabled = false;
}

// initialize the page
async function initialize() {
    // do not allow slider to be used before finishing intialization
    slider.disabled = true;

    // process current and previous date 
    // NOTE: currently set to update at 12:00 AM UTC
    var currentDate = new Date();
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);

    // check if today's data exists, otherwise roll back to yesterday
    await d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv")
        .then(function(data) {
            if (!data[0][(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)]) {
                console.log("Today's data not uploaded yet");
                currentDate.setUTCDate(currentDate.getUTCDate() - 1);
                slider.min = 1;
                slider.value = 1;
            }
        });

    
    var yest = new Date(currentDate);
    yest.setUTCDate(currentDate.getUTCDate() - 1);
    var yest2 = new Date(currentDate);
    yest2.setUTCDate(currentDate.getUTCDate() - 2);

    console.log(formatZero(currentDate.getUTCMonth() + 1) + "-" + formatZero(currentDate.getUTCDate()) + "-" + currentDate.getUTCFullYear());
    console.log(formatZero(yest.getUTCMonth() + 1) + "-" + formatZero(yest.getUTCDate()) + "-" + yest.getUTCFullYear());
    console.log(formatZero(yest2.getUTCMonth() + 1) + "-" + formatZero(yest2.getUTCDate()) + "-" + yest2.getUTCFullYear());

    // time slider
    slider.max = Math.floor((currentDate.getTime() - startingDate.getTime()) / (1000 * 3600 * 24));

    // initialize page with global charts
    await makeChart("Global", "");

    // map for today
    await generateMap(currentDate, yest, yest2);

    // update date next to slider 
    document.getElementById("selectedDate").innerHTML = formatZero(currentDate.getUTCMonth() + 1) + " / " + formatZero(currentDate.getUTCDate()) + " / " + currentDate.getUTCFullYear();

    // update info here so it doesn't mess up file reading
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    currentDate.setUTCHours(4);
    currentDate.setUTCMinutes(0);
    currentDate.setUTCSeconds(0);

    document.getElementById('lastUpdated').innerHTML = 'Updated at ' + currentDate.toLocaleString() + ' | ';

    // reactivate slider
    slider.disabled = false;
}

/// FUNCTIONS ///
// compile data and create map
async function generateMap(currentDate, yest, yest2) {
    // show loader while map is processing data
    document.getElementById("map").style.display = "none";
    document.getElementById("mapLoader").style.display = "inline";

    var stateOrder = [];
    var filesUSA = [];
    var filesCanada = [];
    var canadaOrder = [];

    await Promise.all([d3.csv("./data/statelatlong.csv")]).then(function (locations) {
        for (let i = 0; i < locations[0].length; i++) {
            stateOrder.push(locations[0][i].City);
            if (locations[0][i].State != "") {
                filesUSA.push(d3.csv("https://api.covidtracking.com/v1/states/" + locations[0][i].State + "/daily.csv"));
            }
        }
    });

    var USrecs = [];
    var canadaRecs = [];
    
    // get data for US states recoveries
    await Promise.all(filesUSA).then(function (USstates) {
        var recDate = currentDate.getUTCFullYear() + "" + formatZero(currentDate.getUTCMonth() + 1) + "" + formatZero(currentDate.getUTCDate());
        var recDate_Y = yest.getUTCFullYear() + "" + formatZero(yest.getUTCMonth() + 1) + "" + formatZero(yest.getUTCDate());
        for (let i = 0; i < USstates.length; i++) {
            var UStoday = USstates[i].find(e => e.date === recDate);
            var USyest = USstates[i].find(e => e.date === recDate_Y)
            USrecs.push({
                State: stateOrder[i],
                Recovered: !UStoday || UStoday.recovered == "" ? 0 : UStoday.recovered,
                Recovered_Y: !USyest || USyest.recovered == "" ? 0 : USyest.recovered,
            });
        }
    });
    
    // get data for Canadian provinces recoveries
    await Promise.all([
        d3.csv("https://health-infobase.canada.ca/src/data/covidLive/covid19.csv"),
        d3.csv("./data/canadaprovinces.csv")
    ]).then(function (CAdata) {
        var recDate = formatZero(currentDate.getUTCDate()) + "-" + formatZero(currentDate.getUTCMonth() + 1) + "-" + currentDate.getUTCFullYear();
        var recDate_Y = formatZero(yest.getUTCDate()) + "-" + formatZero(yest.getUTCMonth() + 1) + "-" + yest.getUTCFullYear();
        for (let i = 0; i < CAdata[1].length; i++) {
            var CAtoday = CAdata[0].find(e => e.date === recDate && e.prname === CAdata[1][i].Province);
            var CAyest = CAdata[0].find(e => e.date === recDate_Y && e.prname === CAdata[1][i].Province);
            canadaRecs.push({
                Province: CAdata[1][i].Province,
                Recovered: !CAtoday || CAtoday.numrecover === "" ? 0 : CAtoday.numrecover,
                Recovered_Y: !CAyest || CAyest.numrecover === "" ? 0 : CAyest.numrecover,
            });
        }
    });
    
    // process full data
    await Promise.all([
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv"),
        d3.csv("./data/statelatlong.csv"),
        d3.csv("./data/canadaprovinces.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv")
    ]).then(async function (data) {
        // global totals counters
        var globalActive = 0;
        var globalConfirmed = 0;
        var globalRecovered = 0;
        var globalDeaths = 0;
        var globalNewCases = 0;
    
        var globalA_Y = 0;
        var globalC_Y = 0;
        var globalR_Y = 0;
        var globalD_Y = 0;
        var globalN_Y = 0;
    
        // total counters for Australia, Canada, China, USA
        var AustraliaTotals = {
            Active: 0,
            Confirmed: 0,
            Recovered: 0,
            Deaths: 0,
            Active_Y: 0,
            Confirmed_Y: 0,
            Confirmed_Y2: 0,
            Recovered_Y: 0,
            Deaths_Y: 0,
            New: 0
        }
    
        var CanadaTotals = {
            Active: 0,
            Confirmed: 0,
            Recovered: 0,
            Deaths: 0,
            Active_Y: 0,
            Confirmed_Y: 0,
            Confirmed_Y2: 0,
            Recovered_Y: 0,
            Deaths_Y: 0,
            New: 0
        }
    
        var ChinaTotals = {
            Active: 0,
            Confirmed: 0,
            Recovered: 0,
            Deaths: 0,
            Active_Y: 0,
            Confirmed_Y: 0,
            Confirmed_Y2: 0,
            Recovered_Y: 0,
            Deaths_Y: 0,
            New: 0
        }
    
        var USATotals = {
            Active: 0,
            Confirmed: 0,
            Recovered: 0,
            Deaths: 0,
            Active_Y: 0,
            Confirmed_Y: 0,
            Confirmed_Y2: 0,
            Recovered_Y: 0,
            Deaths_Y: 0,
            New: 0
        }
    
        var markers = [];
        var radii = [1, 2, 4, 6, 8, 10, 13];
    
        // process data for all regions EXCEPT Canada & USA
        for (let i = 0; i < data[0].length; i++) {
            if (data[0][i]['Country/Region'] != 'US' && data[0][i]['Country/Region'] != 'Canada') {
                var confs = data[0][i];
                var recs = data[1].find(item => item['Country/Region'] === confs['Country/Region'] && item['Province/State'] === confs['Province/State']);
                var dead = data[2].find(item => item['Country/Region'] === confs['Country/Region'] && item['Province/State'] === confs['Province/State']);
                var today = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)],
                    Recovered: recs[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)],
                    Deaths: dead[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)]
                }
                
                var yesterday = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)],
                    Recovered: recs[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)],
                    Deaths: dead[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)]
                }

                var twoDaysBack = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)],
                    Recovered: recs[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)],
                    Deaths: dead[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)]
                }

                if (today.Confirmed > 0) {
                    plotPoint(today, yesterday, twoDaysBack);
                }

                // get totals for China
                if (today.Country_Region === 'China') {
                    ChinaTotals.Confirmed += parseInt(today.Confirmed, 10);
                    ChinaTotals.Recovered += parseInt(today.Recovered, 10);
                    ChinaTotals.Deaths += parseInt(today.Deaths, 10);
                    ChinaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
                    ChinaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
                    ChinaTotals.Recovered_Y += parseInt(yesterday.Recovered, 10);
                    ChinaTotals.Deaths_Y += parseInt(yesterday.Deaths, 10);
                }
        
                // get totals for Australia
                if (today.Country_Region === 'Australia') {
                    AustraliaTotals.Confirmed += parseInt(today.Confirmed, 10);
                    AustraliaTotals.Recovered += parseInt(today.Recovered, 10);
                    AustraliaTotals.Deaths += parseInt(today.Deaths, 10);
                    AustraliaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
                    AustraliaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
                    AustraliaTotals.Recovered_Y += parseInt(yesterday.Recovered, 10);
                    AustraliaTotals.Deaths_Y += parseInt(yesterday.Deaths, 10);
                }
            } 
            else if (data[0][i]['Country/Region'] == 'Canada' && data[0][i]['Province/State'] != 'Grand Princess'
                        && data[0][i]['Province/State'] != 'Diamond Princess' 
                        && data[0][i]['Province/State'] != 'Recovered'
                        && data[0][i]['Province/State'] != 'Repatriated Travellers') {
                var confs = data[0][i];
                var dead = data[2].find(item => item['Country/Region'] === confs['Country/Region'] && item['Province/State'] === confs['Province/State']);
                var today = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)],
                    Recovered: parseInt(canadaRecs.find(e => e.Province === data[0][i]['Province/State']).Recovered, 10),
                    Deaths: dead[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)]
                }
                
                var yesterday = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)],
                    Recovered: parseInt(canadaRecs.find(e => e.Province === data[0][i]['Province/State']).Recovered_Y, 10),
                    Deaths: dead[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)]
                }

                var twoDaysBack = {
                    Province_State: data[0][i]['Province/State'],
                    Country_Region: data[0][i]['Country/Region'],
                    Lat: data[0][i].Lat,
                    Long_: data[0][i].Long,
                    Confirmed: confs[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)],
                    Recovered: 0,
                    Deaths: dead[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)]
                }

                if (today.Confirmed > 0) {
                    plotPoint(today, yesterday, twoDaysBack);
                }

                CanadaTotals.Confirmed += parseInt(today.Confirmed, 10);
                CanadaTotals.Deaths += parseInt(today.Deaths, 10);
                CanadaTotals.Confirmed_Y += parseInt(yesterday.Confirmed, 10);
                CanadaTotals.Confirmed_Y2 += parseInt(twoDaysBack.Confirmed, 10);
                CanadaTotals.Deaths_Y += parseInt(yesterday.Deaths, 10);
            }
            else if (data[0][i]['Country/Region'] == 'US') {
                var confs = data[0][i];
                var recs = data[1].find(item => item['Country/Region'] === confs['Country/Region'] && item['Province/State'] === confs['Province/State']);
                var dead = data[2].find(item => item['Country/Region'] === confs['Country/Region'] && item['Province/State'] === confs['Province/State']);
                USATotals.Confirmed = parseInt(confs[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
                USATotals.Recovered = parseInt(recs[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
                USATotals.Deaths = parseInt(dead[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
                USATotals.Confirmed_Y = parseInt(confs[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
                USATotals.Confirmed_Y2 = parseInt(confs[(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)], 10);
                USATotals.Recovered_Y = parseInt(recs[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
                USATotals.Deaths_Y = parseInt(dead[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
                USATotals.Active = USATotals.Confirmed - USATotals.Recovered - USATotals.Deaths;
                USATotals.Active_Y = USATotals.Confirmed_Y - USATotals.Recovered_Y - USATotals.Deaths_Y;
                USATotals.New = USATotals.Confirmed - USATotals.Confirmed_Y;
            }
        }
        CanadaTotals.Recovered = parseInt(data[1].find(item => item['Country/Region'] === 'Canada' && item['Province/State'] === '')[(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
        CanadaTotals.Recovered_Y = parseInt(data[1].find(item => item['Country/Region'] === 'Canada' && item['Province/State'] === '')[(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
        CanadaTotals.Active = CanadaTotals.Confirmed - CanadaTotals.Recovered - CanadaTotals.Deaths;
        CanadaTotals.New = CanadaTotals.Confirmed - CanadaTotals.Confirmed_Y;
        CanadaTotals.Active_Y = CanadaTotals.Confirmed_Y - CanadaTotals.Recovered_Y - CanadaTotals.Deaths_Y;

        ChinaTotals.Active = ChinaTotals.Confirmed - ChinaTotals.Recovered - ChinaTotals.Deaths;
        ChinaTotals.New = ChinaTotals.Confirmed - ChinaTotals.Confirmed_Y;
        ChinaTotals.Active_Y = ChinaTotals.Confirmed_Y - ChinaTotals.Recovered_Y - ChinaTotals.Deaths_Y;

        AustraliaTotals.Active = AustraliaTotals.Confirmed - AustraliaTotals.Recovered - AustraliaTotals.Deaths;
        AustraliaTotals.New = AustraliaTotals.Confirmed - AustraliaTotals.Confirmed_Y;
        AustraliaTotals.Active_Y = AustraliaTotals.Confirmed_Y - AustraliaTotals.Recovered_Y - AustraliaTotals.Deaths_Y;
        
        // process data for USA by state
        for (let i = 0; i < data[3].length; i++) {
            var conf = 0;
            var dead = 0;
            for (let j = 0; j < data[5].length; j++) {
                if (data[5][j].Province_State === data[3][i].City) {
                    conf += parseInt(data[5][j][(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
                }
            }
            for (let j = 0; j < data[6].length; j++) {
                if (data[6][j].Province_State === data[3][i].City) {
                    dead += parseInt(data[6][j][(currentDate.getUTCMonth() + 1) + "/" + currentDate.getUTCDate() + "/" + (currentDate.getUTCFullYear() - 2000)], 10);
                }
            }
            var today = {
                Province_State: data[3][i].City,
                Country_Region: 'US',
                Lat: data[3][i].Latitude,
                Long_: data[3][i].Longitude,
                Confirmed: conf,
                Recovered: parseInt(USrecs.find(item => item.State == data[3][i].City).Recovered, 10),
                Deaths: dead
            }

            conf = 0;
            dead = 0;
            for (let j = 0; j < data[5].length; j++) {
                if (data[5][j].Province_State === data[3][i].City) {
                    conf += parseInt(data[5][j][(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
                }
            }
            for (let j = 0; j < data[6].length; j++) {
                if (data[6][j].Province_State === data[3][i].City) {
                    dead += parseInt(data[6][j][(yest.getUTCMonth() + 1) + "/" + yest.getUTCDate() + "/" + (yest.getUTCFullYear() - 2000)], 10);
                }
            }
            var yesterday = {
                Province_State: data[3][i].City,
                Country_Region: 'US',
                Lat: data[3][i].Latitude,
                Long_: data[3][i].Longitude,
                Confirmed: conf,
                Recovered: parseInt(USrecs.find(item => item.State == data[3][i].City).Recovered_Y, 10),
                Deaths: dead
            }

            conf = 0;
            dead = 0;
            for (let j = 0; j < data[5].length; j++) {
                if (data[5][j].Province_State === data[3][i].City) {
                    conf += parseInt(data[5][j][(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)], 10);
                }
            }
            for (let j = 0; j < data[6].length; j++) {
                if (data[6][j].Province_State === data[3][i].City) {
                    dead += parseInt(data[6][j][(yest2.getUTCMonth() + 1) + "/" + yest2.getUTCDate() + "/" + (yest2.getUTCFullYear() - 2000)], 10);
                }
            }
            var twoDaysBack = {
                Province_State: data[3][i].City,
                Country_Region: 'US',
                Lat: data[3][i].Latitude,
                Long_: data[3][i].Longitude,
                Confirmed: conf,
                Recovered: 0,
                Deaths: dead
            }

            if (today.Confirmed > 0) {
                plotPoint(today, yesterday, twoDaysBack);
            }
        }

        // add USA and Canda recoveries to global counters
        globalRecovered += parseInt(USATotals.Recovered, 10) + parseInt(CanadaTotals.Recovered, 10);
        globalR_Y += parseInt(USATotals.Recovered_Y, 10) + parseInt(CanadaTotals.Recovered_Y, 10);
        
        // Update doc with global numbers
        globalActive = globalConfirmed - globalDeaths - globalRecovered;
        globalA_Y = globalC_Y - globalD_Y - globalR_Y;
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
        } 
        else {
            document.getElementById('changeDiff').innerHTML = '<i class="arrow up icon"></i>' 
                + (globalNewCases - globalN_Y).toLocaleString()
                + ' from yesterday (+' + (((globalNewCases - globalN_Y) / globalN_Y) * 100).toFixed(1) + '%)';
        }
    
        if (globalActive - globalA_Y < 0) {
            document.getElementById('activeDiff').innerHTML = (globalActive - globalA_Y).toLocaleString()
                 + ' from yesterday (' + (((globalActive - globalA_Y) / globalA_Y) * 100).toFixed(1) + '%)';
        } 
        else {
            document.getElementById('activeDiff').innerHTML = '+' + (globalActive - globalA_Y).toLocaleString() 
                + ' from yesterday (+' + (((globalActive - globalA_Y) / globalA_Y) * 100).toFixed(1) + '%)';
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
            + 'Change in Daily Increase: ' + (AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2) == 0 ? 
                '<strong>0</strong>' : (AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2) > 0 ? 
                    '<strong style="color: orange;"><i class="arrow up icon"></i>' + (AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2)) + '</strong>'
                    : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((AustraliaTotals.New - (AustraliaTotals.Confirmed_Y - AustraliaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
            + '<br><br>'
            + 'Active: <strong class="active">' + AustraliaTotals.Active 
                + (AustraliaTotals.Active - AustraliaTotals.Active_Y >= 0 ? '&emsp;(+' : '&emsp;(') + (AustraliaTotals.Active - AustraliaTotals.Active_Y) + ')</strong><br>'
            + 'Recovered: <strong class="recovered">' + AustraliaTotals.Recovered 
                + '&emsp;(+' + (AustraliaTotals.Recovered - AustraliaTotals.Recovered_Y) + ')</strong><br>' 
            + 'Deaths: <strong class="deaths">' + AustraliaTotals.Deaths
                + '&emsp;(+' + (AustraliaTotals.Deaths - AustraliaTotals.Deaths_Y) + ')</strong><br>'
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
            + 'Change in Daily Increase: ' + (CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2) == 0 ? 
                '<strong>0</strong>' : (CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2) > 0 ? 
                    '<strong style="color: orange;"><i class="arrow up icon"></i>' + (CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2)) + '</strong>'
                    : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((CanadaTotals.New - (CanadaTotals.Confirmed_Y - CanadaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
            + '<br><br>'
            + 'Active: <strong class="active">' + CanadaTotals.Active 
            + (CanadaTotals.Active - CanadaTotals.Active_Y >= 0 ? '&emsp;(+' : '&emsp;(') + (CanadaTotals.Active - CanadaTotals.Active_Y) + ')</strong><br>'
            + 'Recovered: <strong class="recovered">' + CanadaTotals.Recovered 
                + '&emsp;(+' + (CanadaTotals.Recovered - CanadaTotals.Recovered_Y) + ')</strong><br>' 
            + 'Deaths: <strong class="deaths">' + CanadaTotals.Deaths
                + '&emsp;(+' + (CanadaTotals.Deaths - CanadaTotals.Deaths_Y) + ')</strong><br>'
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
            + 'Change in Daily Increase: ' + (ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2) == 0 ? 
                '<strong>0</strong>' : (ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2) > 0 ? 
                    '<strong style="color: orange;"><i class="arrow up icon"></i>' + (ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2)) + '</strong>'
                    : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((ChinaTotals.New - (ChinaTotals.Confirmed_Y - ChinaTotals.Confirmed_Y2)) * -1) + '</strong>')) 
            + '<br><br>'
            + 'Active: <strong class="active">' + ChinaTotals.Active 
            + (ChinaTotals.Active - ChinaTotals.Active_Y >= 0 ? '&emsp;(+' : '&emsp;(') + (ChinaTotals.Active - ChinaTotals.Active_Y) + ')</strong><br>'
            + 'Recovered: <strong class="recovered">' + ChinaTotals.Recovered 
                + '&emsp;(+' + (ChinaTotals.Recovered - ChinaTotals.Recovered_Y) + ')</strong><br>' 
            + 'Deaths: <strong class="deaths">' + ChinaTotals.Deaths
                + '&emsp;(+' + (ChinaTotals.Deaths - ChinaTotals.Deaths_Y) + ')</strong><br>'
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
            + 'Change in Daily Increase: ' + (USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2) == 0 ? 
                '<strong>0</strong>' : (USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2) > 0 ? 
                    '<strong style="color: orange;"><i class="arrow up icon"></i>' + (USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2)) + '</strong>'
                    : '<strong style="color: cyan;"><i class="arrow down icon"></i>' + ((USATotals.New - (USATotals.Confirmed_Y - USATotals.Confirmed_Y2)) * -1) + '</strong>')) 
            + '<br><br>'
            + 'Active: <strong class="active">' + USATotals.Active 
            + (USATotals.Active - USATotals.Active_Y >= 0 ? '&emsp;(+' : '&emsp;(') + (USATotals.Active - USATotals.Active_Y) + ')</strong><br>'
            + 'Recovered: <strong class="recovered">' + USATotals.Recovered 
                + '&emsp;(+' + (USATotals.Recovered - USATotals.Recovered_Y) + ')</strong><br>' 
            + 'Deaths: <strong class="deaths">' + USATotals.Deaths
                + '&emsp;(+' + (USATotals.Deaths - USATotals.Deaths_Y) + ')</strong><br>'
            + 'Total Cases: <strong>' + USATotals.Confirmed + '</strong></div>'
            ).on('click', L.bind(makeChart, null, "US", ""))
            .on('popupclose', L.bind(makeChart, null, "Global", "")),

            // Hawaii flag cuz why not
            L.marker([25.148794, -156.429348],{
                icon: L.icon({
                    iconUrl: 'images/HawaiiFlag.png',
                    iconSize: [20, 10],
                    iconAnchor: [10, 5]
                })
            }).bindPopup('<div id="PopupTitle">This map was made in Hawaii</div>'
                + '<div id="PopupBody">This map shows the current case numbers around the world of the COVID-19 pandemic. '
                + 'For more information about COVID-19 in the United States, visit the ' 
                + '<a href="https://www.cdc.gov/coronavirus/2019-ncov/index.html" target="_blank">CDC website </a>' 
                + 'where you can find guidelines on preventing the spread of COVID-19 and protecting yourself and others. '
                + 'Remember to social distance and wear a mask while out in public.</div>')
        ]);

        document.getElementById("mapLoader").style.display = "none";
        document.getElementById("map").style.display = "inline";

        // initialize geo map
        mymap = L.map('map', {
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
    
            globalConfirmed += parseInt(today.Confirmed, 10);
            globalDeaths += parseInt(today.Deaths, 10);
            globalC_Y += parseInt(yesterday.Confirmed, 10);
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
            if (caseChange < 10) {
                color = '#fff4e9';
            }
            else if (caseChange < 100) {
                color = '#fcd5b4'
            }
            else if (caseChange < 500) {
                color = '#fab484'
            }
            else if (caseChange < 2000) {
                color = '#f6905b'
            }
            else if (caseChange < 5000) {
                color = '#f26839';
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
                + 'Active: <strong class="active">' + today.Active 
                + (today.Active - yesterday.Active >= 0 ? '&emsp;(+' : '&emsp;(') + (today.Active - yesterday.Active) + ')</strong><br>'
                + 'Recovered: <strong class="recovered">' + today.Recovered 
                    + '&emsp;(+' + (today.Recovered - yesterday.Recovered) + ')</strong><br>' 
                + 'Deaths: <strong class="deaths">' + today.Deaths
                    + '&emsp;(+' + (today.Deaths - yesterday.Deaths) + ')</strong><br>'
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
    }); 
}


// create chart based on selected region and province
async function makeChart(region, province = "") {
    var files = [d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv"),
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv")
    ];
    if (region == 'US' && province != "") {
        files = [d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv"),
            "",
            d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv")
        ];
            
        await d3.csv("./data/statelatlong.csv").then(async function (USlocations) {
            files[1] = d3.csv("https://api.covidtracking.com/v1/states/" + USlocations.find(e => e.City === province).State + "/daily.csv");
        });
    }
    else if (region == 'Canada' && province != "") {
        files[1] = d3.csv("https://health-infobase.canada.ca/src/data/covidLive/covid19.csv");
    }
    // time series data for charts
    await Promise.all(files).then(function (data) {
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
        
        // Charts for global data
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
                // filter out bad data points, duplicate points, and points where confirmed was 0
                if (weeklyGrowth <= confs[i] && trend.findIndex(val => val.y === weeklyGrowth && val.x === confs[i]) == -1 && confs[i] != 0) {
                    trend.push({x: confs[i], y: weeklyGrowth});
                    exponential.push({x: confs[i], y: confs[i]});
                }
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
                if (!data[1][i].recovered) {
                    recs.push(0);
                }
                else {
                    recs.push(parseInt(data[1][i].recovered, 10));
                }
            }
            
            // catch mismatch length in recovery data
            while (recs.length < confs.length && recs.length != confs.length) {
                recs.unshift(0);
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
                // filter out bad data points, duplicate points, and points where confirmed was 0
                if (weeklyGrowth <= confs[i] && trend.findIndex(val => val.y === weeklyGrowth && val.x === confs[i]) == -1 && confs[i] != 0) {
                    trend.push({x: confs[i], y: weeklyGrowth});
                    exponential.push({x: confs[i], y: confs[i]});
                }
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small or selected date comes first
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5 || firstIdx > dateLabels.length - 1 - dateDiff) {
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
                // filter out bad data points, duplicate points, and points where confirmed was 0
                if (weeklyGrowth <= confs[i] && trend.findIndex(val => val.y === weeklyGrowth && val.x === confs[i]) == -1 && confs[i] != 0) {
                    trend.push({x: confs[i], y: weeklyGrowth});
                    exponential.push({x: confs[i], y: confs[i]});
                }
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small or selected date comes first
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5 || firstIdx > dateLabels.length - 1 - dateDiff) {
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

            // use other files for Canadian recoveries
            if (region == "Canada") {
                // find all entries for the province
                for (let i = 0; i < data[1].length; i++) {
                    if (data[1][i].prname == province) {
                        recs.push(data[1][i].numrecover);
                    }
                }

                // backfill missing dates with 0 to match data length
                while (recs.length < confs.length) {
                    recs.unshift(0);
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
                // filter out bad data points, duplicate points, and points where confirmed was 0
                if (weeklyGrowth <= confs[i] && trend.findIndex(val => val.y === weeklyGrowth && val.x === confs[i]) == -1 && confs[i] != 0) {
                    trend.push({x: confs[i], y: weeklyGrowth});
                    exponential.push({x: confs[i], y: confs[i]});
                }
            }

            // chop to 100th confirmed case, or first confirmed case if data is too small or selected date comes first
            var firstIdx = confs.findIndex(val => val >= 100);
            if (firstIdx == -1 || firstIdx > confs.length - 5 || firstIdx > dateLabels.length - 1 - dateDiff) {
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
                },
                annotation: {
                    annotations: [{
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: dateLabels[dateLabels.length - 1 - dateDiff],
                        borderColor: "white",
                        borderWidth: 2,
                        borderDash: [5, 5],
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
                        backgroundColor: "white",
                        borderColor: "white",
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
                            display: true,
                            color: "#4f4f4f",
                            zeroLineColor: '#e0e0e0',
                            drawOnChartArea: false
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
                            display: true,
                            color: "#4f4f4f", 
                            zeroLineColor: '#e0e0e0',
                            drawOnChartArea: false,
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

// format single digits for file names
function formatZero(num) {
    return num > 9 ? "" + num : "0" + num;
}

// setup the page
initialize();
