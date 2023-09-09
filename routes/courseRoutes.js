const express = require("express");
const courseController = require("./../controllers/courseController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post(
  "/purchase/:id",
  authController.protect,
  courseController.purchaseCourse
);

router
  .route("/")
  .get(courseController.getAllCourses)
  .post(authController.protect, courseController.createCourse);

router
  .route("/:id")
  .get(courseController.getCourse)
  .patch(courseController.updateCourse)
  .delete(
    authController.protect,
    authController.restrictTo,
    courseController.deleteCourse
  );

module.exports = router;
