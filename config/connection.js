const { MongoClient } = require("mongodb");
require("dotenv").config();

const state = {
  db: null,
};

module.exports.connect = function (done) {
  const url = process.env.MONGODB_URL;
  const dbname = "indianedudashboard";

  MongoClient.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
      if (err) {
        console.error("Error connecting to the database:", err);
        return done(err);
      }
      state.db = client.db(dbname);
      console.log("Connected to the database successfully");
      done();
    }
  );
};

module.exports.get = function () {
  return state.db;
};
