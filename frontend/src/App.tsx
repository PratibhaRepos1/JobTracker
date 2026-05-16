import { Link, NavLink, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import NewApplication from "./pages/NewApplication";
import ReviewApplication from "./pages/ReviewApplication";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              New application
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
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
