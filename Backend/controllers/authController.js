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
      return res.status(400).json({ message: "User does not exist, please register first" })
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

/* ================== OTP PASSWORD RESET ================== */

/* 1. SEND OTP */
export const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User with this email NOT FOUND." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();


    // Try to send email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          to: user.email,
          subject: "Password Reset OTP",
          html: `<div style="font-family: sans-serif; padding: 20px; text-align: center;">
                  <h2>Password Reset OTP</h2>
                  <p>Your 6-digit OTP for password reset is:</p>
                  <h1 style="color: #611f69; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
                  <p>This OTP will expire in 10 minutes.</p>
                </div>`,
        });
        return res.json({ message: "OTP sent to your email!" });
      } catch (err) {
        console.error("Mail error:", err.message);
        return res.json({
          message: "Email could not be sent. OTP was generated; check the backend console for the code.",
        });
      }
    } else {
      return res.json({
        message: "Email is not configured. OTP was generated; check the backend console for the code.",
      });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* 2. VERIFY OTP AND RESET PASSWORD */
export const verifyOTPAndReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email, 
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Reset password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();

    res.json({ message: "Password updated successfully! You can now login." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================== SIMPLE PASSWORD RESET (NO OTP) ================== */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and newPassword are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User with this email not found.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // clear any OTP fields just in case
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();

    return res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
