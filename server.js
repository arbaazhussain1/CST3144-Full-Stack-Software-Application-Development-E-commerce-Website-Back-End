const express = require ("express");
const bodyParser = require ("body-parser");
const PropertiesReader = require ("properties-reader");
const cors = require ("cors"); 
const path = require ("path");



const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');



let propertiesPath = path.resolve(__dirname, "conf/db.properties");

let properties = PropertiesReader(propertiesPath);
let dbPrefix = properties.get("db.prefix");
let dbuser = properties.get("db.user");
let dbpwd = encodeURIComponent(properties.get("db.pwd"));
let dbdbName = properties.get("db.dbName");
let dbdbUrl = properties.get("db.dbUrl");
let dbparams = properties.get("db.params");

// Constructing URI
const uri = `${dbPrefix}${dbuser}:${dbpwd}${dbdbUrl}${dbparams}`;
let client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});
let db = client.db(dbdbName);

// console.log
client
.connect()
.then(() => {
  console.log("MongoDB connected Successfully ");
  
}).catch((err) => {
  console.error("MongoDB connected failed", err);
  process.exit(1);
});



// const express = require("express");
// var http = require("http");
var app = express();
var morgan = require("morgan");
// var path = require("path");
var fs = require("fs");

console.log("Hello, world!");

app.use(function(request, response) { // only run if authorised
response.end('Secret info: the password is "swordfish"!');
});
// http.createServer(app).listen(3000);

// Middleware for logging IP and request date
app.use(function(req, res, next) {
  console.log("Request IP: " + req.url);
  console.log("Request date: " + new Date());
 next();
 });

 // Middleware for request logging with Morgan
 app.use(morgan("short"));
 
 app.use(function(req, res, next) {
  var filePath = path.join(__dirname, "public/Images", req.url);
 fs.stat(filePath, function(err, fileInfo) {
  if (err) {
 next();
 return;
  }
  if (fileInfo.isFile()) {
 res.sendFile(filePath);
  } else {
 next();
  }
  });
 });
 app.use(function(req, res) {
 res.status(404);
 res.send("File not found!");
 });
app.listen(3000, function() {
    console.log("App started on port 3000"); })

// // Middleware for serving static files from "public/Images" folder
// app.use('/public-images', express.static(path.join(__dirname, 'public/Images')));

// // Authorization Middleware (as a placeholder, adjust as needed)
// app.use((req, res, next) => {
//     const isAuthorized = true; // Replace with actual authorization logic
//     if (isAuthorized) {
//         next(); // Continue to the next middleware if authorized
//     } else {
//         res.end('Secret info: the password is "swordfish"!');
//     }
// });

// // Fallback 404 handler for unmatched routes
// app.use((req, res) => {
//     res.status(404).send("File not found!");
// });

// // Start the server
// app.listen(3000, () => {
//     console.log("App started on port 3000");
// });

