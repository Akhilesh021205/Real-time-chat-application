import express from "express"
import passport from "passport"
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js"

const router = express.Router()

// register user
router.post("/register", registerUser)

// login user
router.post("/login", loginUser)

// logout user
router.post("/logout", logoutUser)


// 🔵 Google Login Route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
)


// 🔵 Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173") // frontend URL
  }
)

export default router