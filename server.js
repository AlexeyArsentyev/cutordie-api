const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });
const app = require("./app");
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(con => {
    console.log("DB connection successful");
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

console.log(process.env.JWT_SECRET);

process.on("unhandledRejection", err => {
  console.log("UNHANDLED REJECTION");

  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", err => {
  console.log("UNCAUGHT EXCEPTION");
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
