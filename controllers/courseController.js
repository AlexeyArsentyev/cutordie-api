const AppError = require("../utils/appError");
const Course = require("./../models/courseModel");
const User = require("./../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");

const { google } = require("googleapis");
const drive = google.drive("v3");

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
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  const userId = req.body.userId;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("No user found with this ID", 404));
  }

  if (!paymentToken) {
    return next(new AppError("Payment token required", 400));
  }

  const paymentToken = req.body.paymentToken;

  // DEPENDS ON THE GATEWAY THAT WE MAY USE
  const gatewayResponse = await paymentGateway.processPayment(paymentToken);

  if (!gatewayResponse.success) {
    return next(new AppError("Payment failed", 400));
  }

  //granting access to google drive file

  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  );

  user.purchasedCourses.push(course._id);

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: { course }
  });
});
