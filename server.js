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

app.use(cors());

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
      const collectionName = req.params.collectionName; // Get the collection name
      let query = req.params.query; // Extract the search query
      const queryAsNumber = parseFloat(query); // Attempt to parse the query as a number

      // Escape special characters in the query for regex safety
      query = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

      console.log(
        `Search Query: '${query}' as String, ${queryAsNumber} as Number`
      );

      // Build the aggregation pipeline
      const pipeline = [
        {
          $match: {
            $or: [
              // Text-based partial matches using regex
              { subject: { $regex: query, $options: "i" } }, // Match text in subject
              { description: { $regex: query, $options: "i" } }, // Match text in description
              { location: { $regex: query, $options: "i" } }, // Match text in location
              { image: { $regex: query, $options: "i" } }, // Match text in image

              // Partial numeric matches as strings
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$price" }, // Convert price to string
                    regex: query, // Match substring
                  },
                },
              },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$availableInventory" }, // Convert available inventory to string
                    regex: query, // Match substring
                  },
                },
              },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$rating" }, // Convert rating to string
                    regex: query, // Match substring
                  },
                },
              },

              // Exact numeric matches
              ...(isNaN(queryAsNumber)
                ? [] // Skip numeric matching if the query isn't a valid number
                : [
                    { price: queryAsNumber }, // Exact match for numeric price
                    { availableInventory: queryAsNumber }, // Exact match for inventory
                    { rating: queryAsNumber }, // Exact match for rating
                  ]),
            ],
          },
        },
      ];

      // Execute the aggregation pipeline
      const results = await req.collection.aggregate(pipeline).toArray();

      // If no documents are found, return a 404 error with a message
      if (results.length === 0) {
        console.log(`No documents found for query: '${query}'.`);
        return res.send([]); // Send an empty array
      }

      console.log("Search Results:", results);

      // Return the search results
      res.send(results);
    } catch (error) {
      console.error("Error during search:", error);
      // Pass the error to the next middleware
      next(error);
    }
  }
);

app.post("/collections/:collectionName", async (req, res, next) => {
  try {
    const collectionName = req.params.collectionName; // Target collection
    const { user, productsIDs, numberOfSpaces } = req.body; // Order details

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

    // Insert the order into the `orders` collection
    const newOrder = {
      user,
      productsIDs,
      numberOfSpaces,
      orderDate: new Date(),
    };

    const results = await req.collection.insertOne(newOrder);

    if (results.insertedId) {
      console.log("Order inserted successfully:", results.insertedId);
      res.status(201).send({ _id: results.insertedId, ...newOrder });
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

// app.put("/collections/products/:id", async (req, res) => {
//   try {
//     const productId = req.params.id; // Extract the product ID from the request URL
//     const updates = req.body; // Get the fields to update from the request body

//     // Validate that the ID is a valid ObjectId
//     if (!ObjectId.isValid(productId)) {
//       return res.status(400).send({ error: "Invalid product ID." });
//     }

//     // Ensure the request body contains at least one field to update
//     if (!updates || Object.keys(updates).length === 0) {
//       return res.status(400).send({ error: "No updates provided." });
//     }

//     // Define validation rules with custom error messages
//     const validationRules = {
//       id: {
//         validate: (value) => Number.isInteger(value),
//         errorMessage: 'The "id" field must be an integer.',
//       },
//       subject: {
//         validate: (value) =>
//           typeof value === "string" && value.trim().length > 0,
//         errorMessage: 'The "subject" field must be a non-empty string.',
//       },
//       description: {
//         validate: (value) => typeof value === "string",
//         errorMessage: 'The "description" field must be a string.',
//       },
//       price: {
//         validate: (value) => typeof value === "number" && value > 0,
//         errorMessage: 'The "price" field must be a positive number.',
//       },
//       location: {
//         validate: (value) =>
//           typeof value === "string" && value.trim().length > 0,
//         errorMessage: 'The "location" field must be a non-empty string.',
//       },
//       image: {
//         validate: (value) =>
//           typeof value === "string" &&
//           value.startsWith("Images/") &&
//           value.split("/").length === 2 &&
//           value.split("/")[1].trim().length > 0,
//         errorMessage:
//           'The "image" field must be a string in the format "Images/<image_name>".',
//       },
//       availableInventory: {
//         validate: (value) => Number.isInteger(value) && value >= 0,
//         errorMessage:
//           'The "availableInventory" field must be a non-negative integer.',
//       },
//       rating: {
//         validate: (value) =>
//           Number.isInteger(value) && value >= 0 && value <= 5,
//         errorMessage: 'The "rating" field must be an integer between 0 and 5.',
//       },
//     };

//     // Validate each field in the updates object
//     for (const [field, value] of Object.entries(updates)) {
//       if (!(field in validationRules)) {
//         return res
//           .status(400)
//           .send({ error: `Field '${field}' is not allowed.` });
//       }
//       if (!validationRules[field].validate(value)) {
//         return res.status(400).send({
//           error: validationRules[field].errorMessage,
//         });
//       }
//     }

//     // Update the product in the database
//     const result = await db.collection("products").updateOne(
//       { _id: new ObjectId(productId) }, // Find the product by ObjectId
//       { $set: updates } // Update only the fields provided in the request
//     );

//     // Check if a product was updated
//     if (result.matchedCount === 0) {
//       return res
//         .status(404)
//         .send({ error: `Product with ID '${productId}' not found.` });
//     }

//     res.send({
//       message: `Product with ID '${productId}' updated successfully.`,
//       updatedFields: updates,
//     });
//   } catch (error) {
//     console.error("Error updating product:", error);
//     res.status(500).send({
//       error: "An error occurred while updating the product.",
//       details: error.message,
//     });
//   }
// });

app.put("/collections/products/:id", async (req, res) => {
  try {
    const productId = req.params.id; // Extract product ID from the URL
    const { availableInventory } = req.body; // Get the quantity adjustment from the request body

    // Validate the product ID
    if (!ObjectId.isValid(productId)) {
      return res.status(400).send({ error: "Invalid product ID." });
    }

    // Validate availableInventory
    if (typeof availableInventory !== "number") {
      return res.status(400).send({
        error: "'availableInventory' must be a number.",
      });
    }

    // Update the product in the database
    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(productId) }, // Find the product by ID
      { $inc: { availableInventory } } // Increment or decrement the inventory
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Product not found." });
    }

    console.log(
      `Product ${productId} inventory updated by ${availableInventory}.`
    );
    res.send({
      message: `Product ${productId} inventory updated successfully.`,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({
      error: "An error occurred while updating the product.",
      details: error.message,
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
