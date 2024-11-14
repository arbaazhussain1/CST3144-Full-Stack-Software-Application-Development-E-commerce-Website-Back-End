const express = require("express");
const { MongoClient } = require("mongodb");
const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(morgan("short"));

// MongoDB Connection URI and Client Setup
const uri = "mongodb+srv://TutordaysUser:TutordaysPassword1@tutordays.3yyu4.mongodb.net/tutordays?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let db; // This will hold the reference to the `tutordays` database

// Connect to MongoDB and Initialize Database Reference
client.connect()
  .then(() => {
    db = client.db("tutordays"); // Set the database reference to `tutordays`
    console.log("MongoDB connected successfully to database:", db.databaseName);
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1); // Exit if connection fails
  });

// Dynamic Route to Retrieve All Documents from Any Collection
app.get("/collections/:collectionName", async (req, res) => {
  const collectionName = req.params.collectionName; // Get the collection name from the URL
  console.log(`Attempting to retrieve documents from collection: ${collectionName}`); // Log the collection name

  try {
    const collection = db.collection(collectionName); // Access the collection dynamically
    const documents = await collection.find({}).toArray(); // Fetch all documents
    console.log(`Documents in '${collectionName}':`, documents); // Log the retrieved documents

    res.send(documents); // Send the documents as the response
  } catch (err) {
    console.error(`Error retrieving documents from '${collectionName}':`, err);
    res.status(500).send(`Error retrieving documents from ${collectionName}`);
  }
});

// Root Route (for basic connectivity check)
app.get("/", (req, res) => {
  res.send("Welcome to the MongoDB API!");
});

// 404 Error Handling (for undefined routes)
app.use((req, res) => {
  res.status(404).send("Route not found");
});

// Start the Express Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
