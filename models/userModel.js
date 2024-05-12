const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { token } = require("morgan");

const standardCharactersValidator = require("../utils/standardCharacters");

const userNameLengthMessage =
  "Username length must be between 2 and 20 characters";
const passwordLengthMessage =
  "Password length must be between 4 and 30 characters";
const standardCharactersMessage =
  "Only A-Z; a-z; А-Я; а-я; !@#$%^&*()_+ are acceptable";

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, "Username required"],
    unique: [true, "Username must be unique"],
    trim: true,
    maxlength: [20, userNameLengthMessage],
    minlength: [2, userNameLengthMessage],
    validate: {
      validator: standardCharactersValidator,
      message: standardCharactersMessage
    }
  },
  email: {
    type: String,
    required: [true, "Email required"],
    unique: [true, "This email is already taken"],
    validate: [
      validator.isEmail,
      "Please provide a valid email ",
      {
        validator: standardCharactersValidator,
        message: standardCharactersMessage
      }
    ]
  },
  role: {
    type: String,
    enum: ["user", "admin", "dev"],
    default: "user"
  },
  password: {
    type: String,
    required: [true, "Please provide password"],
    minlength: [4, passwordLengthMessage],
    maxlength: [30, passwordLengthMessage],
    select: false,
    validate: {
      validator: standardCharactersValidator,
      message: standardCharactersMessage
    }
  },

  invoices: [{ invoiceId: { type: String }, courseId: { type: String } }],
  purchasedCourses: [{ type: String }],

  passwordChangedAt: Date,

  passwordResetToken: String,
  passwordResetExpires: Date,

  createdAt: {
    type: Date,
    default: Date.now()
  }
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

// userSchema.methods.createPasswordResetToken = function() {
//   const resetToken = crypto.randomBytes(32).toString("hex");

//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   const minutesForReset = 10;
//   this.passwordResetExpires = Date.now() + minutesForReset * 60 * 1000;

//   return resetToken;
// };

userSchema.methods.createPasswordResetToken = async function() {
  const length = 6;

  const resetToken = Math.floor(
    Math.pow(10, length - 1) +
      Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
  );

  const minutesForReset = 10;
  this.passwordResetExpires = Date.now() + minutesForReset * 60 * 1000;
  return resetToken.toString();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
