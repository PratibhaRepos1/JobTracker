import { Link, NavLink, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import NewApplication from "./pages/NewApplication";
import ReviewApplication from "./pages/ReviewApplication";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-3xl">✨</span>
            <span className="text-2xl font-bold tracking-tight text-white group-hover:text-indigo-100 transition">
              Job Tracker
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-base">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? "bg-white text-indigo-700 shadow-md"
                    : "text-white/90 hover:bg-white/15"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? "bg-white text-indigo-700 shadow-md"
                    : "text-white/90 hover:bg-white/15"
                }`
              }
            >
              + New application
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewApplication />} />
          <Route path="/review" element={<ReviewApplication />} />
          <Route path="/applications/:id" element={<ReviewApplication />} />
        </Routes>
      </main>
    </div>
  );
}
