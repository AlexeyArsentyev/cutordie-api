const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const requestIp = require("request-ip");
const cors = require("cors");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const courseRouter = require("./routes/courseRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();

//allow cors from all origins
const allowedOrigins = [
  "https://grigoryanandrew22.github.io/cutordie/",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function(origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

//set security http headers
app.use(helmet());

//for express rate limit working correctly
app.set("trust proxy", true);

//dev logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(requestIp.mw());

const limiter = rateLimit({
  max: process.env.MAX_REQUESTS_PER_HOUR,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP. Please try again in an hour",
  keyGenerator: (req, res) => {
    return req.clientIp; // IP address from requestIp.mw()
  }
});

//limit requests from the same IP
app.use("/api", limiter);

// Define your allowed origins
// const allowedOrigins = [
//   "http://localhost:3000",
//   "https://grigoryanandrew22.github.io/cutordie/"
// ];

// app.use((req, res, next) => {
//   const origin = req.headers.origin;

//   // If the origin of the request is in the allowed origins list,
//   // set the "Access-Control-Allow-Origin" header to that origin
//   if (allowedOrigins.includes(origin)) {
//     res.header("Access-Control-Allow-Origin", origin);
//   }

//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );

//   next();
// });

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

// //sessions used in disk auth
// app.use(
//   session({
//     secret: SESSIONS_SECRET,
//     resave: false,
//     saveUninitialized: true
//   })
// );

//serving static files
app.use(express.static(`${__dirname}/public`));

app.use(compression());

//cookies
app.use(cookieParser());

//routes
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 500));
});

app.use(globalErrorHandler);

module.exports = app;
