import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const ProtectedRoute: React.FC<{ redirectTo?: string }> = ({ redirectTo }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const target = redirectTo || "/signin";

  if (loading) {
    return <div style={{ padding: 24 }}>Checking authentication…</div>;
  }

  if (!user) {
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
