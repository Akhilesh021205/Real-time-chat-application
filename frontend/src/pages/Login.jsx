import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

function Login({ onSwitchToRegister, onLoggedIn }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(false); // ✅ NEW

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email.trim(), password);
      navigate("/home");
      onLoggedIn?.();
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleResetPassword = () => {
    if (!email) {
      setResetMessage("Please enter your email first.");
      return;
    }

    setResetMessage("Password reset link sent to your email.");
  };

  // ✅ UPDATED Google Login
  const handleSocialLogin = () => {
    setLoading(true);
    window.location.href = "http://localhost:4000/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-workspace relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] mix-blend-screen -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] mix-blend-screen -z-10" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Login
        </h2>

        {/* ✅ Google Login Button */}
        <button
          type="button"
          onClick={handleSocialLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 
                     bg-white text-[#3c4043] border border-[#dadce0] rounded-md 
                     shadow-sm hover:bg-[#f7f8f8] transition text-sm font-medium
                     disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <img
            src="https://image.similarpng.com/file/similarpng/very-thumbnail/2020/06/Logo-google-icon-PNG.png"
            alt="google"
            className="w-5 h-5 object-contain"
          />
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-sm text-slate-500 my-6">
          <span className="h-px flex-1 bg-slate-700" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <label className="flex flex-col gap-2 text-slate-200">
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg backdrop-blur-md px-4 py-3 text-white focus:border-accent/60 focus:ring-1 focus:ring-accent/50 outline-none transition-all duration-200"
            />
          </label>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Password */}
          {!showForgot && (
            <label className="flex flex-col gap-2 text-slate-200">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-lg backdrop-blur-md px-4 py-3 pr-16 text-white focus:border-accent/60 focus:ring-1 focus:ring-accent/50 outline-none transition-all duration-200"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          )}

          {/* Forgot Password */}
          {!showForgot && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Forgot Password Section */}
          {showForgot && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResetPassword}
                className="w-full bg-purple-600 py-3 rounded text-white hover:bg-purple-700"
              >
                Send Reset Link
              </button>

              {resetMessage && (
                <p className="text-green-400 text-sm">{resetMessage}</p>
              )}

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Login Button */}
          {!showForgot && (
            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95 border border-accent/50"
            >
              Continue
            </button>
          )}

        </form>

        <p className="mt-8 text-sm text-slate-400 text-center">
          New here?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-pink-400 font-semibold hover:text-pink-300"
          >
            Create an account
          </button>
        </p>

      </div>
    </div>
  );
}

export default Login;