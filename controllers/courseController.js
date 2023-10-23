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

exports.createCourse = catchAsync(async (req, res, next) => {
  const newCourse = await Course.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      course: newCourse
    }
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
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

exports.createInvoice = catchAsync(async (req, res, next) => {
  const user = req.user;

  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  const xtoken =
    process.env.NODE_ENV === "production"
      ? process.env.XTOKEN
      : "uBssBGdixC9sYFD3hzVN1XDKohln5B_VnmKpPG3AM0iU";

  const url = "https://api.monobank.ua/api/merchant/invoice/create";
  const data = {
    amount: course.price,
    ccy: 980,
    merchantPaymInfo: {
      reference: "84d0070ee4e44667b31371d8f8813947",
      destination: "Some course",
      comment: "Cut or die haircut course"
    },
    redirectUrl: "https://grigoryanandrew22.github.io/cutordie/",
    webHookUrl:
      "https://cut-or-die-api.onrender.com/api/v1/courses/testPayment",
    validity: 3600,
    paymentType: "debit",
    saveCardData: {
      saveCard: true,
      walletId: "69f780d841a0434aa535b08821f4822c"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": "uBssBGdixC9sYFD3hzVN1XDKohln5B_VnmKpPG3AM0iU"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  console.log(result);

  const invoiceId = result.invoiceId;

  user.invoices.invoiceId = invoiceId;
  user.invoices.courseId = course._id;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      invoiceId,
      url: result.pageUrl
    }
  });
});

exports.testPayment = catchAsync(async (req, res) => {
  console.log("payment validated");
  console.log(req.body);
});

exports.giveAccess = catchAsync(async (req, res, next) => {
  const invoiceId = req.body.invoiceId;
  const user = User.findOne({ "invoices.invoiceId": invoiceId });

  if (!user) {
    console.error("No user found that matches invoiceId");
    return next(new AppError("No user found with this invoiceId", 404));
  }

  console.log(user);

  //course validation
  const course = await Course.findById();

  if (!course) {
    return next(new AppError("No course found with this ID", 404));
  }

  //granting access to google drive file

  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  );

  oauth2Client.getAccessToken((err, token) => {
    if (err) {
      console.log(err);
    } else {
      console.log("new access_token: " + token);
    }
  });

  //setting our auth credentials
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
  });

  const fileId = course.fileId;
  const userEmail = user.email;

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client
  });

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
