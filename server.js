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

var http = require("http"); // Requires the built-in http module

// Defines a function that’ll handle incoming HTTP requests
function requestHandler(request, response) {
console.log("Incoming request to: " + request.url) ;
 response.end(JSON.stringify(lesson));
}

// Creates a server that uses your function to handle requests
var server = http.createServer(requestHandler);
// Starts the server listening on port 3000
server.listen(3000);

let lesson = [
    { 'topic': 'math', 'location': 'London', 'price': 100 },
    { 'topic': 'math', 'location': 'Liverpool', 'price': 80 },
    { 'topic': 'math', 'location': 'Oxford', 'price': 90 },
    { 'topic': 'math', 'location': 'Bristol', 'price': 120 },
    ]