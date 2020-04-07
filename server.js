// var http = require('http');
var express = require('express');
var https = require('https');
var fs = require('fs');
var app = express();

// var key = fs.readFileSync('./certs/private.key');
// var cert = fs.readFileSync('./certs/mydomain.csr');
// var options = {
//     key: key,
//     cert: cert
// }

// const hostname = '127.0.0.1'
const port = '9001'

app.use(express.static('hotspotmap-coronavirus.github.io'));
// https.createServer(app).listen(443);

var server = app.listen(port);

// var connect = require('connect');
// var serveStatic = require('serve-static');
// connect().use(serveStatic('public')).listen(port, function(){
//     console.log('Server running on ' + port + '...');
// });

// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`)
// })


// // scraping
// const siteUrl = "https://remoteok.io/";
// const axios = require("axios");

// const fetchData = async () => {
//   const result = await axios.get(siteUrl);
//   return cheerio.load(result.data);
// };

// const $ = await fetchData();
// const postJobButton = $('.top > .action-post-job').text();
// console.log(postJobButton) // Logs 'Post a Job'