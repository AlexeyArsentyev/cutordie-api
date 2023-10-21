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
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    courseController.updateCourse
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    courseController.deleteCourse
  );

module.exports = router;
