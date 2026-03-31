import { User } from "../Models/user.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import nodemailer from "nodemailer"
import passport from "passport"
import { Workspace } from "../Models/workspace.js"

/* REGISTER */

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body

    const userExists = await User.findOne({ email })

    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    })

    // 🔥 Create default workspace
    await Workspace.create({
      name: `${username}'s Workspace`,
      owner: user._id,
      members: [user._id],
    })

    res.json({ message: "User registered successfully", user })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/* LOGIN */

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    })

    // Set user as active on login
    user.status = "active";
    await user.save();

    res.json({ user })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/* LOGOUT */

export const logoutUser = async (req, res) => {
  // Set user as offline on logout
  if (req.userId) {
    try {
      await User.findByIdAndUpdate(req.userId, { status: "offline" });
    } catch (e) { /* ignore */ }
  }
  res.clearCookie("token")
  res.json({ message: "Logged out successfully" })
}

/* CURRENT USER */

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.userId).select("-password")
  res.json({ user })
}

/* GOOGLE LOGIN */

export const googleAuthRedirect = passport.authenticate("google", {
  scope: ["profile", "email"]
})

export const googleAuthCallback = [
  passport.authenticate("google", { failureRedirect: "/login" }),

  async (req, res) => {
    try {
      let user = req.user

      // 🔥 Ensure user exists in DB
      let dbUser = await User.findOne({ email: user.email })

      if (!dbUser) {
        dbUser = await User.create({
          username: user.name,
          email: user.email,
          profilePic: user.avatar,
          googleId: user.googleId,
        })
        
        // 🔥 Create default workspace
        await Workspace.create({
          name: `${user.name}'s Workspace`,
          owner: dbUser._id,
          members: [dbUser._id],
        })
      }

      // 🔥 Create JWT
      const token = jwt.sign(
        { userId: dbUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      )

      res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax", 
});

      // 🔥 Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`)

    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login`)
    }
  }
]

/* FORGOT PASSWORD */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")

    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000

    await user.save()

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset",
      html: `<a href="${resetUrl}">Reset Password</a>`,
    })

    res.json({ message: "Reset email sent" })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/* RESET PASSWORD */

export const resetPassword = async (req, res) => {
  try {
    const token = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex")

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid token" })
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10)

    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    res.json({ message: "Password reset successful" })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}