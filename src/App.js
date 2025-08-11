import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useState } from 'react';

function App() {
  const [capturedImage, setCapturedImage] = useState('');
  
  // Replace this with a stored image URL from your DB or server
  const storedImageUrl = 'https://res.cloudinary.com/dpwdruptp/image/upload/v123456789/group_photos/filename.jpg
';
  return (
    <>
    <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={<Dashboard />} />
        </Routes>
      </Router></>
  );
}

export default App;