const express = require("express");
const rewrite = require("express-urlrewrite");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const exphbs = require("express-handlebars");
const session = require("express-session");
const createError = require("http-errors");
const bodyParser = require("body-parser");
const flash = require("connect-flash");
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

      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // 12-hour format with AM/PM
      };

      return new Date(date).toLocaleString("en-IN", options); // Formats the date and time in DD/MM/YYYY, HH:MM:SS AM/PM format
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
    not: function (value) {
  return !value;
    },
    and: function (arg1, arg2) {
  return arg1 && arg2;
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
    shouldShowFollowUp: function (leadStage) {
      const stagesWithoutFollowUp = [
        "HQL",
        "UQL",
        "Not Interested",
        "Just Enquiry",
        "Regular",
      ];
      return !stagesWithoutFollowUp.includes(leadStage);
    },
    keyValue: function (obj) {
      return Object.keys(obj).map((key) => ({ key, value: obj[key] }));
    },
    toString: function (id) {
      return id.toString();
    },
    unlessEqual: function (value1, value2, options) {
      if (value1 !== value2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
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

app.use(flash());


app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});


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
