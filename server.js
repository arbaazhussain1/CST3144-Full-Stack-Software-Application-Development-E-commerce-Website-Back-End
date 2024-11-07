// // import express from "express";
// // import bodyParser from "body-parser";
// // import expressSession from "express-session";

// const express = require('express');
// const { MongoClient } = require('mongodb');
// const bodyParser = require('body-parser');
// const app = express();
// const port = 3000;

// // MongoDB Atlas connection string
// const uri = "your_mongodb_atlas_connection_string_here";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


console.log("Hello, world!");

// var http = require("http"); // Requires the built-in http module

// Defines a function that’ll handle incoming HTTP requests
function requestHandler(request, response) {
console.log("Incoming request to: " + request.url) ;
 response.end(JSON.stringify(lesson));
}

// Creates a server that uses your function to handle requests
// var server = http.createServer(requestHandler);
// Starts the server listening on port 3000
// server.listen(3000);

let lesson = [
    { 'topic': 'math', 'location': 'London', 'price': 100 },
    { 'topic': 'math', 'location': 'Liverpool', 'price': 80 },
    { 'topic': 'math', 'location': 'Oxford', 'price': 90 },
    { 'topic': 'math', 'location': 'Bristol', 'price': 120 },
    ]


// Adding express 

//  var express = require("express"); // Requires the Express module
// var http = require('http');
// // Calls the express function to start a new Express application
// var app = express();
// app.use(function(request, response) { // middleware
//  console.log("In comes a request to: " + request.url);
//  response.end("Hello, world!");
// });
// http.createServer(app).listen(3000); // start the server



var express = require("express");
// var http = require("http");
var app = express();
var morgan = require("morgan");
var path = require("path");
var fs = require("fs");

app.use(function(request, response, next) {
console.log("In comes a " + request.method + " to " + request.url);
next();
});
app.use(function(request, response, next) {
 var minute = (new Date()).getMinutes();
 if ((minute % 2) === 0) { // continue if it is on an even minute
next();
 } else { // otherwise responds with an error code and stops
response.statusCode = 403;
response.end("Not authorized.");
 }
});
app.use(function(request, response) { // only run if authorised
response.end('Secret info: the password is "swordfish"!');
});
// http.createServer(app).listen(3000);

app.use(function(req, res, next) {
  console.log("Request IP: " + req.url);
  console.log("Request date: " + new Date());
 next();
 });

 app.use(morgan("short"));
 app.use(function(req, res, next) {
  var filePath = path.join(__dirname, "static", req.url);
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



    