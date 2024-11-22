const express = require("express"); // Express framework for building web applications
const PropertiesReader = require("properties-reader"); // Module to read properties file
const http = require("http");
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

// Middleware to log additional request details
app.use((request, response, next) => {
  console.log("Request coming in: " + request.method + " to " + request.url);
  console.log("Request IP: " + request.ip);
  console.log("Request date: " + new Date());
  next();
});

// // CORS configuration
// const corsOptions = {
//   origin: ['https://arbaazhussain1.github.io'], // Updated to allow new frontend origin.
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],    // Allow HTTP methods.
//   allowedHeaders: ['Content-Type', 'Authorization'], // Allow headers.
// };
// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions)); // Handle preflight requests

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

    // Update inventory for each product
    for (let i = 0; i < productsIDs.length; i++) {
      const productId = productsIDs[i];
      const spaces = numberOfSpaces[i];

      // Find the product in the `products` collection
      const product = await db
        .collection("products")
        .findOne({ id: productId });

      if (!product) {
        return res.status(404).send({
          error: `Product with ID ${productId} not found.`,
        });
      }

      // Check if there's enough inventory
      if (product.availableInventory < spaces) {
        return res.status(400).send({
          error: `Not enough inventory for product ID ${productId}. Available: ${product.availableInventory}, Requested: ${spaces}`,
        });
      }

      // Deduct inventory
      await db
        .collection("products")
        .updateOne(
          { id: productId },
          { $inc: { availableInventory: -spaces } }
        );
    }

    // Insert the order into the target collection
    const newDocument = {
      user,
      productsIDs,
      numberOfSpaces,
      orderDate: new Date(),
    };

    const results = await req.collection.insertOne(newDocument);

    // Respond with the inserted document
    if (results.insertedId) {
      console.log("Order inserted successfully:", results.insertedId);
      res.status(201).send({ _id: results.insertedId, ...newDocument });
    } else {
      res.status(500).send({ error: "Failed to insert order." });
    }
  } catch (err) {
    console.error("Error inserting order:", err);
    res.status(500).send({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

app.put("/collections/products", async (req, res, next) => {
  try {
    const { productIds } = req.body; // Expecting an array of product IDs in the request body

    console.log(`Restoring inventory for product IDs: ${productIds}`);

    // Validate input
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).send({
        error:
          "Invalid input. `productIds` must be a non-empty array of numbers.",
      });
    }

    // Validate each product ID
    const invalidIds = productIds.filter(
      (id) => typeof id !== "number" || id <= 0
    );
    if (invalidIds.length > 0) {
      return res.status(400).send({
        error: `Invalid Product IDs: ${invalidIds.join(
          ", "
        )}. All IDs must be positive numbers.`,
      });
    }

    const restorationResults = [];

    // Loop through each product ID
    for (const productId of productIds) {
      console.log(`Processing product ID: ${productId}`);

      // Find all orders containing this product ID
      const orders = await db
        .collection("orders")
        .find({ productsIDs: productId })
        .toArray();

      if (!orders || orders.length === 0) {
        console.log(`No orders found for product ID: ${productId}`);
        restorationResults.push({
          productId,
          restoredAmount: 0,
          status: "No orders found",
        });
        continue;
      }

      console.log(
        `Found ${orders.length} orders containing product ID: ${productId}`
      );

      // Calculate total inventory to restore for this product ID
      let totalRestoreAmount = 0;

      orders.forEach((order) => {
        const index = order.productsIDs.indexOf(productId); // Find the index of the product ID
        if (index !== -1) {
          totalRestoreAmount += order.numberOfSpaces[index]; // Add the corresponding number of spaces
        }
      });

      if (totalRestoreAmount === 0) {
        console.log(`No inventory to restore for product ID: ${productId}`);
        restorationResults.push({
          productId,
          restoredAmount: 0,
          status: "No inventory to restore",
        });
        continue;
      }

      console.log(
        `Total inventory to restore for product ID ${productId}: ${totalRestoreAmount}`
      );

      // Restore the inventory for the specified product ID
      const result = await db.collection("products").updateOne(
        { id: productId },
        { $inc: { availableInventory: totalRestoreAmount } } // Increment the inventory
      );

      if (result.matchedCount === 1) {
        console.log(
          `Successfully restored ${totalRestoreAmount} units to product ID: ${productId}`
        );
        restorationResults.push({
          productId,
          restoredAmount: totalRestoreAmount,
          status: "Inventory restored successfully",
        });
      } else {
        console.log(`Failed to restore inventory for product ID: ${productId}`);
        restorationResults.push({
          productId,
          restoredAmount: 0,
          status: "Product not found",
        });
      }
    }

    // Respond with the restoration results
    res.send({
      msg: "Inventory restoration completed",
      results: restorationResults,
    });
  } catch (err) {
    console.error("Error restoring inventory:", err);
    res.status(500).send({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

// 404 error handler for undefined routes
app.use(function (req, res) {
  res.status(404).send("File not found!");
});

// // Start the server on port 3000
// app.listen(3000, function () {
//   console.log("App started on port 3000");
// });

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("App started on port: " + port);
});
