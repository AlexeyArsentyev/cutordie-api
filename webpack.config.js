const path = require("path");
const nodeExternals = require("webpack-node-externals"); // Import nodeExternals

module.exports = {
  entry: "./server.js", // Entry point of your Express app
  output: {
    filename: "CutOrDieApi.js", // Output filename
    path: path.resolve(__dirname, "dist") // Output directory
  },
  target: "node", // Build for Node.js environment
  externals: [nodeExternals()], // Exclude Node.js core modules from the bundle
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader" // Transpile JavaScript using Babel
        }
      }
    ]
  }
};
