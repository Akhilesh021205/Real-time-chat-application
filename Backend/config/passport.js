import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "../Models/user.js";

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

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            username: profile.displayName,
            email: email,
            profilePic: profile.photos[0].value,
            googleId: profile.id,
          });
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
