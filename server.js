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

console.log(uri);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
let client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
// Removed the immediate db assignment here to initialize it after connection
// let db = client.db(dbdbName); // This will be initialized after connection

var app = express();
var morgan = require("morgan");
var fs = require("fs");

// We need this to parse JSON received in the requests
// (e.g., to read JSON passed in req.body)
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

// Serve static files from public and images directories
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/images", express.static(path.resolve(__dirname, "public/Images")));

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to the homepage!");
});

// Function to start the server after connecting to MongoDB
async function startServer() {
    try {
        // Connect to MongoDB
        await client.connect(); // Initiates an asynchronous connection to MongoDB
        console.log("MongoDB connected successfully");

        // Initialize the database after successful connection
        let db = client.db(dbdbName);

        // app.param middleware to dynamically set the collection based on URL
        app.param("collectionName", (req, res, next, collectionName) => {
            req.collection = db.collection(collectionName);
            return next();
        });

        // GET route to retrieve all documents from a specific collection
        app.get("/collections/:collectionName", (req, res, next) => {
            req.collection.find({}).toArray((err, results) => {
                if (err) {
                    return next(err);
                }
                res.send(results);
            });
        });

        // 404 Error handler
        app.use(function (req, res) {
            res.status(404);
            res.send("File not found!");
        });

        // Start the server after setting up routes and middleware
        app.listen(3000, function () {
            console.log("App started on port 3000");
        });
    } catch (err) {
        console.error("MongoDB connection failed", err); // Logs error if connection fails
        process.exit(1); // Exits the application if the database connection fails
    }
}

// Call the function to start the server
startServer();
