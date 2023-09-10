const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const courseRouter = require("./routes/courseRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();

//set security http headers
app.use(helmet());

//for express rate limit working correctly
app.set("trust proxy", true);

//dev logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: process.env.MAX_REQUESTS_PER_HOUR,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP. Please try again in an hour"
});

//limit requests from the same IP
app.use("/api", limiter);

// Set up middleware to handle CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // Replace '*' with your allowed origins
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  ); // Include 'Authorization' header

  // Continue to the next middleware
  next();
});

//cookies
app.use(cookieParser());

//body parser
app.use(express.json({ limit: "10kb" }));

//data sanitization against NoSQL query injection and cross-side scripting attacks
app.use(mongoSanitize());

//data sanitization against XSS
app.use(xss());

//prevent parameters pollution
app.use(
  hpp({
    whitelist: ["duration", "price", "difficulty"]
  })
);

//serving static files
app.use(express.static(`${__dirname}/public`));

app.use(compression());

//routes
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 3));
});

app.use(globalErrorHandler);

module.exports = app;
