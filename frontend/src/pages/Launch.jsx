import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function Launch() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/chat");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  const username = user?.username || "User";
  const firstLetter = username.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">

      {/* Avatar Circle */}
      <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center text-white text-2xl mb-6">
        {firstLetter}
      </div>

      {/* Text */}
      <h1 className="text-2xl font-semibold mb-2 text-gray-900">
        Launching {username}
      </h1>

      <p className="text-gray-900 text-center">
        Click "Open Slack" to launch the desktop app. <br />
        Not working? You can also use Slack in your browser.
      </p>

      {/* Loader */}
      <div className="mt-8">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}