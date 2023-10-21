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

exports.createInvoice = catchAsync(async (req, res) => {
  fetch(
    `https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${}`,
    {
      method: "GET",
      headers: myHeaders
    }
  )
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Server response wasn't OK");
      }
    })
    .then(json => {
      console.log(json);
    });

});

exports.validatePayment = catchAsync(async (req, res) => {
  
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

  const myHeaders = new Headers();
  const xtoken =
    process.env.NODE_ENV === "production"
      ? process.env.XTOKEN
      : "uBssBGdixC9sYFD3hzVN1XDKohln5B_VnmKpPG3AM0iU";

  myHeaders.append("X-Token", xtoken);


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
