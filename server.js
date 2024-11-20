const express = require("express"); // Express framework for building web applications
const PropertiesReader = require("properties-reader"); // Module to read properties file
const cors = require("cors"); // Enable Cross-Origin Resource Sharing
const path = require("path"); // Module to work with file paths
const morgan = require("morgan"); // HTTP request logger middleware
const fs = require("fs"); // File system module for working with files

// Load database configuration from properties file
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = PropertiesReader(propertiesPath);
let dbPrefix = properties.get("db.prefix");
let dbuser = properties.get("db.user");
let dbpwd = encodeURIComponent(properties.get("db.pwd"));
let dbdbName = properties.get("db.dbName");
let dbdbUrl = properties.get("db.dbUrl");
let dbparams = properties.get("db.params");

// Constructing MongoDB connection URI
const uri = `${dbPrefix}${dbuser}:${dbpwd}${dbdbUrl}/${dbdbName}${dbparams}`;
console.log("MongoDB URI:", uri); // Log the URI to verify it's correctly constructed

// Import MongoDB client and initialize variables
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
let client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db; // Database variable to hold the database instance/object

// Asynchronous MongoDB connection using Promises
client
  .connect()
  .then(async () => {
    db = client.db(dbdbName);
    // console.log("MongoDB connected successfully"); // Initialise db object after successful connection
    // console.log("Connected to database:", db.databaseName); // Log the connected database name for verification
    console.log("MongoDB connected successfully to database:", db.databaseName);

    // Log all collections in the database to verify "products" exists
    const collections = await db.listCollections().toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    // Check if "products" collection has documents
    const productsCount = await db.collection("products").countDocuments();
    console.log(
      `Number of documents in 'products' collection: ${productsCount}`
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed", err); // Log connection errors
    process.exit(1); // Exit process if connection fails
  });

// Create an instance of the Express application
var app = express();
app.use(express.json()); // Middleware to parse JSON in requests
app.use(morgan("short")); // Middleware for logging requests

// Serve static files from the "public" and "public/Images" directories
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/images", express.static(path.resolve(__dirname, "public/Images")));

// Root route to display a welcome message
app.get("/", (req, res) => {
  res.send("Welcome to the homepage!"); // Send welcome message on root URL
});

// Middleware to dynamically set the collection based on URL parameter
app.param("collectionName", function (req, res, next, collectionName) {
  console.log("Accessing collection:", collectionName); // Log the collection name being accessed
  req.collection = db.collection(collectionName); // Set the collection on the request object
  next(); // Proceed to the next middleware or route handler
});

// Route to retrieve all documents from a specified collection
app.get("/collections/:collectionName", async (req, res, next) => {
  try {
    console.log(
      "Attempting to retrieve documents from collection:",
      req.params.collectionName
    );
    const results = await req.collection.find({}).toArray(); // Query all documents in the collection
    console.log("Documents retrieved:", results); // Log the documents retrieved
    res.send(results); // Send the retrieved documents as the response
  } catch (err) {
    console.error("Error retrieving documents:", err); // Log any errors
    next(err); // Pass the error to the next middleware
  }
});

// Retrieve a limited number of sorted documents from a collection
app.get(
  "/collections/:collectionName/:max/:sortAspect/:sortAscDesc",
  async (req, res, next) => {
    try {
      // Parse and validate the 'max' parameter
      const rawMax = req.params.max;

      // Check if 'max' is a valid positive integer
      if (!/^\d+$/.test(rawMax)) {
        return res.status(400).send({
          error:
            "'max' must be a valid positive integer. It should contain only whole numbers greater than 0 (e.g., 1, 2, 3) and should not include decimals, letters, or special characters.",
        });
      }
      const max = parseInt(rawMax, 10);

      console.log("Raw max parameter:", rawMax);
      console.log("Parsed max parameter:", max);

      if (isNaN(max) || max <= 0) {
        return res
          .status(400)
          .send({ error: "'max' must be a positive integer." });
      }

      const sortDirection = req.params.sortAscDesc === "desc" ? -1 : 1;
      const sortAspect = req.params.sortAspect;

      // Define valid sortAspect fields
      const validSortAspects = [
        "id",
        "subject",
        "description",
        "price",
        "location",
        "image",
        "availableInventory",
        "rating",
      ];

      // Validate the sortAspect
      if (!validSortAspects.includes(sortAspect)) {
        return res.status(400).send({
          error: `'sortAspect' must be one of the following: ${validSortAspects.join(
            ", "
          )}`,
        });
      }

      const sortAscDesc = req.params.sortAscDesc.toLowerCase();

      // Validate the sortAscDesc parameter
      if (!["asc", "desc"].includes(sortAscDesc)) {
        return res.status(400).send({
          error: `'sortAscDesc' must be either 'asc' or 'desc'.`,
        });
      }

      // Check the total number of documents in the collection
      const collectionCount = await req.collection.countDocuments();

      console.log(`Total documents in collection: ${collectionCount}`);

      if (max > collectionCount) {
        return res.status(400).send({
          error: `'max' cannot exceed the total number of documents in the collection (${collectionCount}).`,
        });
      }

      console.log(
        `Retrieving ${max} documents from ${
          req.params.collectionName
        }, sorted by ${sortAspect} in ${
          sortDirection === 1 ? "ascending" : "descending"
        } order`
      );
      // Query the collection and retrieve results
      const documents = await req.collection.find({}).toArray();

      // Perform case-insensitive sorting in application code
      documents.sort((a, b) => {
        const fieldA = a[sortAspect];
        const fieldB = b[sortAspect];

        // Handle string fields (apply .toLowerCase())
        if (typeof fieldA === "string" && typeof fieldB === "string") {
          return fieldA.toLowerCase() < fieldB.toLowerCase()
            ? -1 * sortDirection
            : fieldA.toLowerCase() > fieldB.toLowerCase()
            ? 1 * sortDirection
            : 0;
        }

        // Handle numeric and other fields
        return fieldA < fieldB
          ? -1 * sortDirection
          : fieldA > fieldB
          ? 1 * sortDirection
          : 0;
      });

      // Limit results and send to clients
      res.send(documents.slice(0, max));
    } catch (err) {
      console.error("Error retrieving sorted/limited documents:", err);
      next(err); // Pass error to middleware
    }
  }
);
// test for http://localhost:3000/collections/products/10/image/Asc

app.get("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    // Extract the collection name and ID from the request parameters
    const collectionName = req.params.collectionName;
    const id = req.params.id;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ error: `'${id}' is not a valid ObjectId.` });
    }

    // Access the collection and find the document by ObjectId
    const result = await req.collection.findOne({ _id: new ObjectId(id) });

    // Check if the document was found
    // If no document matches the given ID, return a 404 Not Found response
    if (!result) {
      return res
        .status(404)
        .send({ error: `Document with id '${id}' not found.` });
    }

    // If the document is found, send it back as the response
    res.send(result);
  } catch (err) {
    // Log any unexpected errors that occur during execution
    console.error("Error fetching document by ID:", err);
    // Pass the error to the next middleware for centralized error handling
    next(err);
  }
});

// test for http://localhost:3000/collections/products/673361cda42587c540f10ca6

// Route to search for documents in a collection based on a query
app.get(
  "/collections/:collectionName/search/:query",
  async (req, res, next) => {
    try {
      const collectionName = req.params.collectionName;
      const query = req.params.query;

      console.log(
        `Searching in collection: ${collectionName} with query: '${query}'`
      );

      // Build a search pipeline for numeric and text fields
      const pipeline = [
        {
          $match: {
            $or: [
              { subject: { $regex: query, $options: "i" } }, // Partial match in `subject`
              { description: { $regex: query, $options: "i" } }, // Partial match in `description`
              { location: { $regex: query, $options: "i" } }, // Partial match in `location`
              { image: { $regex: query, $options: "i" } }, // Partial match in `image`
              {
                $expr: {
                  $regexMatch: { input: { $toString: "$id" }, regex: query },
                },
              }, // Match in `id` (converted to string)
              {
                $expr: {
                  $regexMatch: { input: { $toString: "$price" }, regex: query },
                },
              }, // Match in `price` (converted to string)
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$availableInventory" },
                    regex: query,
                  },
                },
              }, // Match in `availableInventory`
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$rating" },
                    regex: query,
                  },
                },
              }, // Match in `rating`
            ],
          },
        },
      ];

      // Execute the aggregation pipeline
      const results = await req.collection.aggregate(pipeline).toArray();

      // Check if any documents were found
      if (results.length === 0) {
        return res.status(404).send({
          message: `No documents found matching the query '${query}'.`,
        });
      }

      console.log("Search results:", results);
      // Return the search results
      res.send(results);
    } catch (err) {
      console.error("Error performing search:", err);
      next(err); // Pass the error to the next middleware for centralised error handling
    }
  }
);

app.post("/collections/:collectionName", async (req, res, next) => {
  try {
    const collectionName = req.params.collectionName;
    const { user, productsIDs, numberOfSpaces } = req.body;

    console.log(`Inserting into collection: ${collectionName}`);
    console.log("User Data:", user);
    console.log("Products IDs:", productsIDs);
    console.log("Number of Spaces:", numberOfSpaces);

    // Validate `user` fields
    const requiredUserFields = ["firstName", "lastName", "phoneNumber"];
    const missingUserFields = requiredUserFields.filter(
      (field) => !(field in user)
    );

    if (missingUserFields.length > 0) {
      return res.status(400).send({
        error: `Missing required user fields: ${missingUserFields.join(", ")}`,
      });
    }

    // Validate user data
    if (typeof user.firstName !== "string" || user.firstName.trim() === "") {
      return res
        .status(400)
        .send({ error: "Invalid `firstName`. It must be a non-empty string." });
    }
    if (typeof user.lastName !== "string" || user.lastName.trim() === "") {
      return res
        .status(400)
        .send({ error: "Invalid `lastName`. It must be a non-empty string." });
    }
    if (
      typeof user.phoneNumber !== "string" ||
      user.phoneNumber.trim().length < 10 ||
      !/^\d+$/.test(user.phoneNumber)
    ) {
      return res.status(400).send({
        error:
          "Invalid `phoneNumber`. It must be a string of at least 10 digits containing only numbers.",
      });
    }

    // Validate `productsIDs` and `numberOfSpaces`
    if (
      !Array.isArray(productsIDs) ||
      !Array.isArray(numberOfSpaces) ||
      productsIDs.length === 0 ||
      numberOfSpaces.length === 0
    ) {
      return res.status(400).send({
        error: "`productsIDs` and `numberOfSpaces` must be non-empty arrays.",
      });
    }

    if (productsIDs.length !== numberOfSpaces.length) {
      return res.status(400).send({
        error:
          "`productsIDs` and `numberOfSpaces` arrays must have the same length.",
      });
    }

    // Validate each product ID and corresponding number of spaces
    for (let i = 0; i < productsIDs.length; i++) {
      if (typeof productsIDs[i] !== "number" || productsIDs[i] <= 0) {
        return res.status(400).send({
          error: `Invalid product ID at index ${i}. Must be a positive number.`,
        });
      }
      if (typeof numberOfSpaces[i] !== "number" || numberOfSpaces[i] <= 0) {
        return res.status(400).send({
          error: `Invalid number of spaces at index ${i}. Must be a positive number.`,
        });
      }
    }

    // Prepare the document
    const newDocument = {
      user,
      productsIDs,
      numberOfSpaces,
      orderDate: new Date(),
    };

    // Insert the document into MongoDB
    const results = await req.collection.insertOne(newDocument);

    // Respond with the inserted document
    if (results.insertedId) {
      console.log("Document inserted successfully:", results.insertedId);
      res.status(201).send({ _id: results.insertedId, ...newDocument });
    } else {
      res.status(500).send({ error: "Failed to insert document." });
    }
  } catch (err) {
    console.error("Error inserting document:", err);
    res.status(500).send({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

app.put("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const collectionName = req.params.collectionName;
    const id = req.params.id;
    const updateData = req.body;

    console.log(`Updating document in collection: ${collectionName}`);
    console.log(`Document ID: ${id}`);
    console.log("Update Data:", updateData);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid ObjectId format." });
    }

    // Validate req.body
    if (
      !updateData ||
      typeof updateData !== "object" ||
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).send({ error: "Invalid or empty update data." });
    }

    // Update the document in the specified collection
    const result = await req.collection.updateOne(
      { _id: new ObjectId(id) }, // Match by ID
      { $set: updateData }, // Update with new data
      { safe: true, multi: false } // Options
    );

    if (result.matchedCount === 1) {
      console.log("Document updated successfully:", result);
      res.send({ msg: "success" });
    } else {
      console.log("No document found with the specified ID.");
      res.status(404).send({ msg: "error", error: "Document not found." });
    }
  } catch (err) {
    console.error("Error updating document:", err);
    next(err); // Pass error to the centralized error handler
  }
});

// 404 error handler for undefined routes
app.use(function (req, res) {
  res.status(404).send("File not found!");
});

// Start the server on port 3000
app.listen(3000, function () {
  console.log("App started on port 3000");
});
