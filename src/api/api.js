import axios from "axios";

function normalizeBaseUrl(url) {
  if (!url) return url;
  // Ensure trailing /api
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const envBase = process.env.REACT_APP_API_URL;
const defaultBase = process.env.NODE_ENV === "production"
  ? "https://be-face-verification-app.onrender.com/api"
  : "http://localhost:5000/api";

const API = axios.create({
  baseURL: normalizeBaseUrl(envBase) || defaultBase,
  withCredentials: false,
  timeout: 30000
});

API.interceptors.request.use((config) => {
  // Auth disabled; no Authorization header needed
  return config;
});

export default API;
