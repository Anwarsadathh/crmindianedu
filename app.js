const express = require("express");
const rewrite = require("express-urlrewrite");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const exphbs = require("express-handlebars");
const session = require("express-session");
const createError = require("http-errors");
const bodyParser = require("body-parser");
// const cron = require("node-cron"); // Comment this out if you don't want the cron job

require("dotenv").config();

const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const db = require("./config/connection");

const app = express();


const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "user-layout",
  layoutsDir: path.join(__dirname, "views/layout"),
  partialsDir: path.join(__dirname, "views/partials"),
  helpers: {
    formatDate: function (date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString(); // Formats the date as a readable string
},
    incrementIndex: function (index) {
      return index + 1;
    },
    ifEquals: function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
    eq: function (arg1, arg2) {
      return arg1 == arg2;
    },
    ifCond: function (v1, operator, v2, options) {
      switch (operator) {
        case "==":
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case "===":
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case "!=":
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case "!==":
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case "<":
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case "<=":
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case ">":
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case ">=":
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
    or: function () {
      const args = Array.prototype.slice.call(arguments, 0, -1);
      return args.some(Boolean);
    },
    json: function (context) {
      return JSON.stringify(context);
    },
    defaultImage: function (imageUrl, defaultImage) {
      return imageUrl || defaultImage;
    },
   
    hidePartial: function (value) {
      if (value && value.length > 3) {
        const halfLength = Math.floor(value.length / 3);
        return value.slice(0, halfLength) + "****";
      }
      return value;
    },
  },
});


app.engine("hbs", hbs.engine);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Middleware setup
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Database connection
db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});

// Routes setup
app.use("/", userRouter);
app.use("/regular-service", adminRouter);

// URL Rewriting
app.use(rewrite("/STcWasa", "/view-details"));

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// Comment this out if you want to control updates only through button click
// cron.schedule("* * * * *", () => {
//   console.log("Running a task every minute");
//   updateDatabase().catch(console.error);
// });

module.exports = app;
