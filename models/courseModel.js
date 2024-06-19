const mongoose = require("mongoose");

//somecomment

const courseSchema = new mongoose.Schema({
  en: {
    name: {
      type: String,
      required: [true, "course name required"],
      unique: [true, "course unique name required"],
      trim: true,
      maxlength: [100, "course name must have less than 100 characters"],
      minlength: [2, "course name must have at least 2 characters"]
    },
    subHeader: {
      type: String,
      required: [true, "course subHeader required"],
      unique: [true, "course unique subHeader required"],
      trim: true,
      maxlength: [100, "course subHeader must have less than 100 characters"],
      minlength: [2, "course subHeader must have at least 2 characters"]
    },
    description: {
      type: String,
      required: [true, "course description required"]
    },
    paragraphs: [
      {
        type: String
      }
    ]
  },
  ua: {
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
    paragraphs: [
      {
        type: String
      }
    ]
  },

  difficulty: {
    type: Number,
    required: [true, "difficulty required"]
  },
  price: {
    usd: {
      type: Number,
      required: [true, "pack price required"],
      min: [0, "Price must be above equal or above 0"]
    },
    uah: {
      type: Number,
      required: [true, "pack price required"],
      min: [0, "Price must be above equal or above 0"]
    },
    eur: {
      type: Number,
      required: [true, "pack price required"],
      min: [0, "Price must be above equal or above 0"]
    }
  },
  duration: {
    type: Number,
    required: [true, "course duration required"]
  },
  equipment: {
    type: String,
    required: [true, "course duration required"]
  },
  fileId: {
    type: String,
    required: [true, "fileId required"]
  },

  coverImage: { type: String, required: [true, "Cover image required"] },
  images: [
    {
      type: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now()
  }
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
