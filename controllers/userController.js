const AppError = require("../utils/appError");
const User = require("./../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
const filterFields = require("./../utils/filterFields");
const catchAsync = require("./../utils/catchAsync");

exports.getAllUsers = catchAsync(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields();

  const users = await features.query;

  // users.forEach(async user => {
  //   if (!user.purchasedCourses) {
  //     return;
  //   }
  //   await user.populate("purchasedCourses");
  // });

  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("No user found with this ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { user }
  });
});

exports.currentUser = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user
    }
  });
});

exports.createUser = catchAsync(async (req, res) => {
  const filteredBody = filterFields(
    req.body,
    "userName",
    "email",
    "password",

    "passwordChangedAt"
  );

  const newUser = await User.create(filteredBody);

  res.status(201).json({
    status: "success",
    data: {
      user: newUser
    }
  });
});

exports.createAdmin = catchAsync(async (req, res, next) => {
  const filteredBody = filterFields(
    req.body,
    "userName",
    "email",
    "password",

    "passwordChangedAt",
    "adminKey"
  );

  if (filteredBody.adminKey !== process.env.ADMIN_KEY) {
    return next(new AppError("Wrong admin key", 401));
  }

  const newUser = await User.create(filteredBody);
  newUser.role = "admin";

  res.status(201).json({
    status: "success",
    data: {
      user: newUser
    }
  });
});

exports.updateUser = catchAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError("No course found with this ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user
    }
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword instead."
      )
    );
  }

  const filteredBody = filterFields(req.body, "userName", "email");
  const updatedUser = await User.findOneAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: "success",
    data: { user: updatedUser }
  });
});

exports.deleteUser = catchAsync(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError("No course found with this ID", 404));
  }
  res.status(204).json({
    status: "success",
    data: null
  });
});
