import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Admin from "./components/admin/Admin";
import Student from "./components/student/Student";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate
              to={user.role === "admin" ? "/admin" : "/student"}
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Auth />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Admin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <Student />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
