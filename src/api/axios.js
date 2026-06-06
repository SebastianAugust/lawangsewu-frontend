import axios from "axios";

// Local dev points to the Laravel server via VITE_API_URL (.env.local);
// production builds fall back to the deployed Hostinger backend.
export const BASE_URL =
  import.meta.env.VITE_API_URL ??
  "https://midnightblue-hedgehog-803207.hostingersite.com";
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
