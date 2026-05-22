import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await register(username, email, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleSocialLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-workspace relative overflow-hidden text-slate-100 font-sans cursor-default pt-12 pb-8 px-6">
      {/* Background Orbs to keep the premium dark feel */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] mix-blend-screen -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[150px] mix-blend-screen -z-10 pointer-events-none" />

      {/* TOP LOGO (Mock Slack Logo) */}
      <div className="flex items-center justify-center gap-2 mb-10 w-full">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
          <path fill="#E01E5A" d="M9 3C9 1.343 7.657 0 6 0C4.343 0 3 1.343 3 3V6C3 7.657 4.343 9 6 9H9V3Z" />
          <path fill="#36C5F0" d="M21 9C22.657 9 24 7.657 24 6C24 4.343 22.657 3 21 3H18C16.343 3 15 4.343 15 6V9H21Z" />
          <path fill="#2EB67D" d="M15 21C15 22.657 16.343 24 18 24C19.657 24 21 22.657 21 21V18C21 16.343 19.657 15 18 15H15V21Z" />
          <path fill="#ECB22E" d="M3 15C1.343 15 0 16.343 0 18C0 19.657 1.343 21 3 21H6C7.657 21 9 19.657 9 18V15H3Z" />
          <path fill="#E01E5A" d="M13.5 3C13.5 1.343 12.157 0 10.5 0C8.843 0 7.5 1.343 7.5 3V6H13.5V3Z" />
          <path fill="#36C5F0" d="M21 10.5C22.657 10.5 24 9.157 24 7.5C24 5.843 22.657 4.5 21 4.5H18V10.5H21Z" />
          <path fill="#2EB67D" d="M10.5 21C10.5 22.657 12.157 24 13.5 24C15.157 24 16.5 22.657 16.5 21V18H10.5V21Z" />
          <path fill="#ECB22E" d="M3 13.5C1.343 13.5 0 12.157 0 10.5C0 8.843 1.343 7.5 3 7.5H6V13.5H3Z" />
        </svg>
        <span className="text-2xl font-bold tracking-tight text-white mb-0.5">slack</span>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center">
        {/* BIG HEADING */}
        <h1 className="text-4xl md:text-[42px] font-bold text-white mb-3 text-center tracking-tight leading-tight">
          First, enter your details
        </h1>
        <p className="text-[15px] font-medium text-slate-300 mb-8 text-center max-w-sm">
          We suggest using the <span className="font-semibold text-white">email address you use at work.</span>
        </p>

        {/* MAIN FORM */}
        <div className="w-full sm:w-[400px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Full name"
              required
              className="w-full bg-transparent border-2 border-slate-600 rounded-[4px] px-3.5 py-3 text-[18px] text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder-slate-500 font-medium"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@work-email.com"
              required
              className="w-full bg-transparent border-2 border-slate-600 rounded-[4px] px-3.5 py-3 text-[18px] text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder-slate-500 font-medium"
            />
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-transparent border-2 border-slate-600 rounded-[4px] px-3.5 py-3 pr-16 text-[18px] text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder-slate-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#541554] hover:bg-[#4a124a] text-white font-bold text-[18px] py-3 rounded-[4px] transition-colors mt-2"
            >
              Continue
            </button>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </form>

          {/* OR DIVIDER */}
          <div className="flex items-center gap-3 w-full my-6 opacity-60">
            <div className="flex-1 h-px bg-slate-500"></div>
            <span className="text-[13px] font-bold text-slate-300">OR</span>
            <div className="flex-1 h-px bg-slate-500"></div>
          </div>

          {/* SOCIAL LOGIN */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              type="button"
              onClick={handleSocialLogin}
              className="flex-1 flex items-center justify-center gap-3 border-2 border-slate-600 rounded-[4px] py-2.5 hover:bg-white/5 transition-colors font-bold text-white px-6"
            >
              <img src="https://image.similarpng.com/file/similarpng/very-thumbnail/2020/06/Logo-google-icon-PNG.png" alt="Google" className="w-5 h-5 object-contain" />
              Google
            </button>
          </div>

          {/* LEGAL TEXT */}
          <p className="text-center text-[13px] text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
            By continuing, you're agreeing to our Main Services Agreement, User Terms of Service, and Slack Supplemental Terms. Additional disclosures are available in our Privacy Policy and Cookie Policy.
          </p>

          <p className="text-center text-[15px] font-medium text-slate-300">
            Already using Slack? <button onClick={() => navigate('/login')} className="text-blue-400 hover:underline">Sign in to an existing workspace</button>
          </p>
        </div>
      </div>

      {/* FOOTER LINKS */}
      <div className="mt-auto pt-10 text-[13px] text-slate-500 font-medium flex gap-5">
        <a href="#" className="hover:underline">Privacy & Terms</a>
        <a href="#" className="hover:underline">Contact Us</a>
        <a href="#" className="hover:underline flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          Change region
        </a>
      </div>
    </div>
  );
}

export default Register;
