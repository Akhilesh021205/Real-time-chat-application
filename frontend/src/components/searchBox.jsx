import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router"
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function SearchBox({ onSelectArea }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE}/api/users/search?query=${value}`,
        { withCredentials: true }
      );

      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserClick = async (userId) => {
    // ❌ prevent self chat
    if (userId === user?._id) {
      alert("You cannot message yourself");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/dm/create`,
        { userId },
        { withCredentials: true }
      );

      navigate(`/dms/${userId}`);
      onSelectArea("chat");

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl mt-10">

        {/* 🔍 Search Input */}
        <div className="bg-[#1d1c1d] border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
          <input
            value={query}
            onChange={handleSearch}
            placeholder="Search people..."
            className="w-full bg-transparent outline-none text-white text-lg placeholder-gray-400"
          />
        </div>

        {/* 👇 Results */}
        {users.length > 0 && (
          <div className="mt-2 bg-[#1d1c1d] border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {users
              .filter((u) => u._id !== user?._id)
              .map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleUserClick(u._id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#2c2d30] cursor-pointer transition"
                >
                  <div className="w-9 h-9 rounded-md bg-purple-600 flex items-center justify-center font-bold text-white">
                    {u.username.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-white font-medium">
                      {u.username}
                    </span>
                    <span className="text-xs text-gray-400">
                      Direct message
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ❌ No results */}
        {query && users.filter((u) => u._id !== user?._id).length === 0 && (
          <div className="mt-3 text-gray-400 text-sm text-center">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchBox;
