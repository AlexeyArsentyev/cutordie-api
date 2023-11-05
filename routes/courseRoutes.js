const express = require("express");
const courseController = require("./../controllers/courseController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post(
  "/createInvoice/:id",
  authController.protect,
  courseController.createInvoice
);
router.post("/validatePayment", courseController.validatePayment);
router.post(
  "/giveAccess/:id",
  authController.protect,
  courseController.giveAccess
);
router.post(
  "/authorizeDisk/:id",
  authController.protect,
  courseController.authorizeDisk
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
