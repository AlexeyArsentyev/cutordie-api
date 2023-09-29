const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "course name required"],
    unique: [true, "course unique name required"],
    trim: true,
    maxlength: [100, "course name must have less than 100 characters"],
    minlength: [2, "course name must have at least 2 characters"]
  },
  description: {
    type: String,
    required: [true, "course description required"]
  },
  difficulty: {
    type: Number,
    required: [true, "difficulty required"]
  },
  price: {
    type: Number,
    required: [true, "course price required"],
    min: [0, "Price must be above equal or above 0"]
  },
  duration: {
    type: Number,
    required: [true, "course duration required"]
  },
  coverImage: {},
  createdAt: {
    type: Date,
    default: Date.now()
  }
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
