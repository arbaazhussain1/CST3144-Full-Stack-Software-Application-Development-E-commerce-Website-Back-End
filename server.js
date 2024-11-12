const express = require("express");
const bodyParser = require("body-parser");
const PropertiesReader = require("properties-reader");
const cors = require("cors");
const path = require("path");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
let client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbdbName);

// console.log
client
  .connect()
  .then(() => {
    console.log("MongoDB connected Successfully ");
  })
  .catch((err) => {
    console.error("MongoDB connected failed", err);
    process.exit(1);
  });


var app = express();
var morgan = require("morgan");
var fs = require("fs");

console.log("Hello, world!");

// Middleware for logging IP and request date
app.use(function (req, res, next) {
  console.log("Request IP: " + req.url);
  console.log("Request date: " + new Date());
  next();
});

// Middleware for request logging with Morgan
app.use(morgan("short"));

var imagePath = path.resolve(__dirname, "public/Images");
app.use("/images", express.static(imagePath));

app.use(function (req, res) {
  res.status(404);
  res.send("File not found!");
});
app.listen(3000, function () {
  console.log("App started on port 3000");
});
