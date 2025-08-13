import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  
  // Check if token exists and has a valid format
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    console.log('ProtectedRoute: No valid token found, redirecting to login');
    return <Navigate to="/" replace />;
  }
  
  // Additional validation: check if token looks like a valid JWT format
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    console.log('ProtectedRoute: Invalid token format, redirecting to login');
    localStorage.removeItem('token'); // Clean up invalid token
    return <Navigate to="/" replace />;
  }
  
  return children;
}