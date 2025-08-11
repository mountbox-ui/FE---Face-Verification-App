import axios from "axios";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://be-face-verification-app.onrender.com/api"
      : "http://localhost:5000/api"),
  withCredentials: false,
  timeout: 30000
});

API.interceptors.request.use((config) => {
  // Auth disabled; no Authorization header needed
  return config;
});

export default API;
