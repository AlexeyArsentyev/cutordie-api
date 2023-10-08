const AppError = require("../utils/appError");
const Course = require("./../models/courseModel");
const User = require("./../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const { google } = require("googleapis");

exports.getAllCourses = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Course.find(), req.query)
    .filter()
    .sort()
    .limitFields();

  const courses = await features.query;

  res.status(200).json({
    status: "success",
    results: courses.Length,
    data: { courses }
  });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { course }
  });
});

exports.createCourse = catchAsync(async (req, res) => {
  const newCourse = await Course.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      course: newCourse
    }
  });
});

exports.updateCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      course
    }
  });
});

exports.deleteCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null
  });
});

exports.purchaseCourse = catchAsync(async (req, res, next) => {
  //course validation
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  //getting user
  let token = req.cookies.jwt;

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  //payment validation

  // if (!paymentToken) {
  //   return next(new AppError("Payment token required", 400));
  // }

  // const paymentToken = req.body.paymentToken;

  // DEPENDS ON THE GATEWAY THAT WE MAY USE
  // const gatewayResponse = await paymentGateway.processPayment(paymentToken);

  // if (!gatewayResponse.success) {
  //   return next(new AppError("Payment failed", 400));
  // }

  //granting access to google drive file

  const auth = new google.auth.GoogleAuth({
    keyFile: "./gleaming-nomad-380220-acd2fc3754fc.json",
    scopes: ["https://www.googleapis.com/auth/drive"]
  });

  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  );

  //setting our auth credentials
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
  });

  //LATER
  // const fileId = course.fileId;
  // const userEmail = user.email;

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client
  });

  const fileId = "1-GG0PCOtX0lMF6WzbAMfmj6fsD3a6AgB";
  const userEmail = "cutordieofficial@gmail.com";

  const result = await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: "reader", // or 'writer', 'commenter'
      type: "user",
      emailAddress: userEmail
    },
    fields: "id"
  });

  if (!result) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  //db stuff

  user.purchasedCourses.push(course._id);

  await user.save({
    validateBeforeSave: false
  });

  res.status(200).json({
    status: "success",
    data: {
      course
    }
  });
});
