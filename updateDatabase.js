const { google } = require("googleapis");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron"); // Add this line
require("dotenv").config();

// Load the Google Sheets API credentials
const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, "credentials.json"))
);

// Configure MongoDB
const url = process.env.MONGODB_URL;
const dbName = "indianedudashboard";
const collectionName = "googlesheets";

// Authenticate with Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function updateDatabase() {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1UZYtJRvlT7yZLae32ScaoamWGdigF_4_eqJhaBeGnD0"; // Replace with your actual spreadsheet ID
  const range = "Sheet1"; // Fetch all data in Sheet1

  // Fetch data from Google Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (rows.length) {
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Clear the collection
    await collection.deleteMany({});

    // Insert new data
    const dataToInsert = rows.map((row) => ({
      timeStamp: row[0],
      state: row[1],
      name: row[2],
      whatsapp: row[3],
      mobile: row[4],
      uni1: row[5],
      uni2: row[6],
      uni3: row[7],
      uni4: row[8],
    }));

    await collection.insertMany(dataToInsert);

    console.log("Database updated successfully");
    client.close();
  } else {
    console.log("No data found in the spreadsheet.");
  }
}

// Schedule the updateDatabase function to run every minute
cron.schedule("* * * * *", () => {
  console.log("Running a task every minute");
  updateDatabase().catch(console.error);
});
