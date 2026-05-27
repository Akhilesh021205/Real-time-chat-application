import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "../Models/user.js";
import { Workspace } from "../Models/workspace.js";

dotenv.config();

const getGoogleCallbackUrl = () => {
  if (process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI;
  }

  const backendUrl = process.env.BACKEND_URL || process.env.API_URL;
  if (backendUrl) {
    return `${backendUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  }

  return "http://localhost:4000/api/auth/google/callback";
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getGoogleCallbackUrl(),
    },

    async (accessToken, refreshToken, profile, done) => {
      try {

        const email = profile.emails[0].value;
        const googlePhoto = profile.photos && profile.photos[0] ? profile.photos[0].value : "";

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            username: profile.displayName,
            email: email,
            profilePic: googlePhoto,
            googleId: profile.id,
          });

          // Create default workspace
          await Workspace.create({
            name: `${profile.displayName}'s Workspace`,
            owner: user._id,
            members: [user._id],
          });
        } else {
          const updates = {};
          if (!user.googleId) {
            updates.googleId = profile.id;
          }
          if (!user.profilePic || user.profilePic.includes("googleusercontent.com")) {
            updates.profilePic = googlePhoto;
          }
          if (Object.keys(updates).length > 0) {
            user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
          }
        }

        return done(null, user);

      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;
