import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}