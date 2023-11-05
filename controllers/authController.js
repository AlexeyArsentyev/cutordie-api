const crypto = require("crypto");
const { promisify } = require("util");
const axios = require("axios");

const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");
const bcrypt = require("bcryptjs");
const filterFields = require("./../utils/filterFields");

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    sameSite: "None",
    secure: true,
    httpOnly: true
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user
    }
  });
};

const generateRandomString = length => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
};

exports.googleAuth = catchAsync(async (req, res, next) => {
  let accessToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    accessToken = req.headers.authorization.split(" ")[1];
  }

  if (!accessToken) {
    return next(new AppError("You are not logged in!", 401));
  }

  const googleUser = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!googleUser) {
    return next(new AppError("You are not logged in!", 401));
  }

  const userData = googleUser.data;

  const randomPassword = generateRandomString(15);

  const email = userData.email;
  const user = await User.findOne({ email });
  if (!user) {
    const newUser = await User.create({
      userName: userData.name,
      email: email,
      password: randomPassword,
      passwordConfirm: randomPassword
    });

    createSendToken(newUser, 201, res);
  }

  createSendToken(user, 201, res);
});

exports.signup = catchAsync(async (req, res, next) => {
  const filteredBody = filterFields(
    req.body,
    "userName",
    "email",
    "password",
    "passwordConfirm",
    "passwordChangedAt"
  );

  const newUser = await User.create(filteredBody);

  createSendToken(newUser, 201, res);
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    return next(new AppError("Please provide email", 400));
  }
  if (!password) {
    return next(new AppError("Please provide password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, res);
});

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password. Please login again.", 401)
    );
  }

  req.user = currentUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with this email address"));
  }

  const resetToken = await user.createPasswordResetToken();

  user.passwordResetToken = await bcrypt.hash(resetToken, 12);

  await user.save({ validateBeforeSave: false });

  const message = `Forgot your password? Enter this code on the site. ${resetToken}`;

  try {
    if (process.env.SEND_EMAIL) {
      await sendEmail({
        email: user.email,
        subject: "Forgot your password?",
        message
      });
    } else {
      console.log(message);
    }

    res.status(200).json({
      status: "success",
      message: "Token sent to email"
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was an error sending the email", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email
  });

  if (!user) {
    return next(new AppError("There is no user with this email", 404));
  }

  if (user.passwordResetExpires < Date.now()) {
    return next(new AppError("Code has expired. Please send email again", 400));
  }

  if (
    !(await bcrypt.compare(
      req.body.passwordResetToken,
      user.passwordResetToken
    ))
  ) {
    return next(new AppError("Invalid code. Please try again.", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    token
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  next();
});
