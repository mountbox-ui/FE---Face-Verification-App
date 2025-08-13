import axios from "axios";

const API = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://be-face-verification-app.onrender.com/api" // Production backend
      : "http://localhost:5000/api", // Local backend for development
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to handle authentication errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 (Unauthorized) or 403 (Forbidden) error, the token is invalid
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('API: Authentication error, clearing token and redirecting');
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default API;
