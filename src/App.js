import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useState } from 'react';

function App() {
  const [capturedImage, setCapturedImage] = useState('');
  
  // Replace this with a stored image URL from your DB or server
  const storedImageUrl = process.env.NODE_ENV === 'production' 
    ? 'https://be-face-verification-app.onrender.com/uploads/user1.jpg'
    : 'http://localhost:5000/uploads/user1.jpg';
  return (
    <>
    <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router></>
  );
}

export default App;