const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.get("/currentUser", authController.protect, userController.currentUser);

router.post("/signup", authController.signup);
router.post("/signin", authController.signin);
router.delete("/logout", authController.protect, authController.logout);
router.post("/googleAuth", authController.googleAuth);
router.post("/createAdmin", userController.createAdmin);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword", authController.resetPassword);
router.patch("/updateMe", authController.protect, userController.updateMe);

router
  .route("/")
  .get(
    authController.protect,
    authController.restrictTo("admin"),
    userController.getAllUsers
  )
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
