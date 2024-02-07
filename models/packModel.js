const mongoose = require("mongoose");

//somecomment

const packSchema = new mongoose.Schema({
  en: {
    name: {
      type: String,
      required: [true, "pack name required"],
      unique: [true, "pack unique name required"],
      trim: true,
      maxlength: [100, "pack name must have less than 100 characters"],
      minlength: [2, "pack name must have at least 2 characters"]
    },
    description: {
      type: String,
      required: [true, "pack description required"]
    }
  },
  ua: {
    name: {
      type: String,
      required: [true, "pack name required"],
      unique: [true, "pack unique name required"],
      trim: true,
      maxlength: [100, "pack name must have less than 100 characters"],
      minlength: [2, "pack name must have at least 2 characters"]
    },
    description: {
      type: String,
      required: [true, "pack description required"]
    }
  },

  courses: [{ type: String }],

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

  fileId: {
    type: String,
    required: [true, "fileId required"]
  },

  createdAt: {
    type: Date,
    default: Date.now()
  }
});

const Pack = mongoose.model("Pack", packSchema);

module.exports = Course;
