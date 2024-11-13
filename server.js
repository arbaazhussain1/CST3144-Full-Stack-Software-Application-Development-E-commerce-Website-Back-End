const express = require("express");
// const bodyParser = require("body-parser");
const PropertiesReader = require("properties-reader");
const cors = require("cors");
const path = require("path");

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

console.log(uri)
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
let client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbdbName);

// console.log
// Asynchronous MongoDB connection using Promises
// client
//   .connect() // Initiates an asynchronous connection to MongoDB
//   .then(() => {
//     console.log("MongoDB connected Successfully ");
//   })
//   .catch((err) => {
//     console.error("MongoDB connected failed", err);  // Logs error if connection fails
//     process.exit(1); // Exits the application if the database connection fails
//   });


  

var app = express();
var morgan = require("morgan");
var fs = require("fs");


//we need this to parse json received in the requests
//(e.g., to read json passed in req.body)
app.use(express.json());

console.log("Hello, world!");

// Middleware for logging IP and request date
// app.use(function (req, res, next) {
//   console.log("Request IP: " + req.url);
//   console.log("Request date: " + new Date());
//   next();
// });

// Middleware for request logging with Morgan
app.use(morgan("short"));

// var imagePath = path.resolve(__dirname, "public/Images");
// app.use("/images", express.static(imagePath));

// Serve static files from public and images directories
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/images", express.static(path.resolve(__dirname, "public/Images")));

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the homepage!");
});

// app.param middleware to dynamically set the collection based on URL
// app.param("collectionName", (req, res, next, collectionName) => {
//   req.collection = db.collection(collectionName);
//   next();
// });
app.param('collectionName'
  , function(req, res, next, collectionName) {
  req.collection = db.collection(collectionName);
   return next();
  });

// // GET route to retrieve all documents from a specific collection
// app.get("/collections/:collectionName", (req, res, next) => {
//   console.log("collections is connected")
//   req.collection.find({}).toArray((err, results) => {
//     if (err) {
//       return next(err);
//     }
//     console.log(results)
//     res.send(results);
//   });
// });

// app.get('/collections/:collectionName'
//   , function(req, res, next) {
//    req.collection.find({}).toArray(function(err, results) {
//       console.log("collections is connected")
//    if (err) {
//    return next(err);
//    }
//        console.log(results)
//    res.send(results);
//    });
//   });

// app.get('/collections/:collectionName', async (req, res, next) => {
//   try {
//     console.log("Attempting to retrieve documents from collection:", req.params.collectionName);
//     const results = await req.collection.find({}).toArray();
//     if (results.length === 0) {
//       console.log("No documents found in collection:", req.params.collectionName);
//     } else {
//       console.log("Documents retrieved:", results);
//     }
//     res.send(results);
//   } catch (err) {
//     console.error("Error retrieving documents:", err);
//     next(err);
//   }
// });

app.get('/collections/:collectionName'
  , function(req, res, next) {
   req.collection.find({}).toArray(function(err, results) {
   if (err) {
   return next(err);
   }
   res.send(results);
   });
  });

app.use(function (req, res) {
  res.status(404);
  res.send("File not found!");
});
app.listen(3000, function () {
  console.log("App started on port 3000");
});