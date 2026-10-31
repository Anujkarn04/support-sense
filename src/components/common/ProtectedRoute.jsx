import { Navigate, Outlet } from "react-router-dom";
import { homeFor, useAuth } from "../../context/AuthContext.jsx";
import { Spinner } from "./states.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Signing you in" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
