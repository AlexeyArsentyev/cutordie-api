const crypto = require("crypto");
const { promisify } = require("util");
const axios = require("axios");
const mongoose = require("mongoose");

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
    httpOnly: false
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  // res.cookie("jwt", token, cookieOptions);
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
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
};

exports.googleAuth = catchAsync(async (req, res, next) => {
  // let credential;
  // let googleUser;
  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startsWith("Bearer")
  // ) {
  //   credential = req.headers.authorization.split(" ")[1];
  // }

  // if (!credential) {
  //   return next(new AppError("Access token required", 401));
  // }

  // getAccessToken(credential)
  //   .then(accessToken => console.log("Access Token:", accessToken))
  //   .catch(error => console.error("Error:", error));

  // fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
  //   headers: {
  //     Authorization: `Bearer ${accessToken}`
  //   }
  // })
  //   .then(response => response.json())
  //   .then(data => {
  //     // Handle the response data
  //     googleUser = data;
  //     console.log(googleUser);
  //   })
  //   .catch(error => {
  //     // Handle any errors
  //     console.error("Error:", error);
  //   });

  const body = req.body;
  const email = body.email;
  const user = await User.findOne({ email });
  if (!user) {
    const randomPassword = generateRandomString(15);
    const userName = body.name;

    const newUser = await User.create({
      userName,
      email,
      password: randomPassword
    });

    createSendToken(newUser, 201, res);
  }

  createSendToken(user, 201, res);
});

async function getAccessToken(authorizationCode) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: authorizationCode,
      grant_type: "authorization_code",
      redirect_uri: "YOUR_REDIRECT_URI" // Replace with your actual redirect URI
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

exports.signup = catchAsync(async (req, res, next) => {
  const filteredBody = filterFields(
    req.body,
    "userName",
    "email",
    "password",

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

// exports.logout = catchAsync(async (req, res) => {
//   res.clearCookie("jwt");
//   res.status(204).json({
//     status: "success",
//     data: null
//   });
// });

exports.logout = (req, res) => {
  // res.cookie("jwt", {
  //   expires: new Date(Date.now() - 10000000),
  //   httpOnly: true
  // });
  res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  const token = req.body.jwt;

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id).populate(
    "purchasedCourses"
  );

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
    console.log("Start sending email");
    await sendEmail({
      email: user.email,
      subject: "Forgot your password?",
      message
    });

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

  const originalToken = user.passwordResetToken;
  const inputToken = req.body.passwordResetToken;

  if (!originalToken) {
    return next(
      new AppError("Please execute forgot password procedure first", 400)
    );
  }

  if (!inputToken) {
    return next(new AppError("Token cant be empty", 400));
  }

  if (!(await bcrypt.compare(inputToken, originalToken))) {
    return next(new AppError("Invalid code. Please try again.", 400));
  }

  user.password = req.body.password;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    token
  });
});
exports.checkToken = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email
  });

  if (!user) {
    return next(new AppError("There is no user with this email", 404));
  }

  if (user.passwordResetExpires < Date.now()) {
    return next(new AppError("Code has expired. Please send email again", 400));
  }

  const originalToken = user.passwordResetToken;
  const inputToken = req.body.passwordResetToken;

  if (!originalToken) {
    return next(
      new AppError("Please execute forgot password procedure first", 400)
    );
  }

  if (!inputToken) {
    return next(new AppError("Token cant be empty", 400));
  }

  if (!(await bcrypt.compare(inputToken, originalToken))) {
    return next(new AppError("Invalid code. Please try again.", 400));
  }

  res.status(200).json({
    status: "success",
    token: inputToken
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  next();
});
