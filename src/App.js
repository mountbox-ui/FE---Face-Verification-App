import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import { useState } from 'react';

function App() {
  const [capturedImage, setCapturedImage] = useState('');
  
  // Replace this with a stored image URL from your DB or server
  const storedImageUrl = `${process.env.REACT_APP_API_BASE_URL}/uploads/user1.jpg`;
  return (
    <>
    <Router>
      <Header />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router></>
  );
}

export default App;