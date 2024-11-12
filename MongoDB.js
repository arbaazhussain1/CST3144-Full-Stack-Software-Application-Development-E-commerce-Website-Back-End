// const express = require ("express");
// const bodyParser = require ("body-parser");
// const PropertiesReader = require ("properties-reader");
// const cors = require ("cors"); 
// const path = require ("path");



// const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');



// let propertiesPath = path.resolve(__dirname, "conf/db.properties");

// let properties = PropertiesReader(propertiesPath);
// let dbPrefix = properties.get("db.prefix");
// let dbuser = properties.get("db.user");
// let dbpwd = encodeURIComponent(properties.get("db.pwd"));
// let dbdbName = properties.get("db.dbName");
// let dbdbUrl = properties.get("db.dbUrl");
// let dbparams = properties.get("db.params");

// // Constructing URI
// const uri = `${dbPrefix}${dbuser}:${dbpwd}${dbdbUrl}${dbparams}`;
// let client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});
// let db = client.db(dbdbName);

// // console.log
// client
// .connect()
// .then(() => {
//   console.log("MongoDB connected Successfully ");
  
// }).catch((err) => {
//   console.error("MongoDB connected failed", err);
//   process.exit(1);
// });