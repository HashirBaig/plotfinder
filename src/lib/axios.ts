import axios from "axios";
import config from "@/config/environment";

const api = axios.create({
  baseURL: `${config?.API_URL}`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Attach auth token, if present
  const authRaw = localStorage.getItem("auth-storage");
  const token = authRaw ? JSON.parse(authRaw)?.state?.token : null;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  // Attach guest user id, if present
  const guestRaw = localStorage.getItem("guest-user-storage");
  const guestUserId = guestRaw ? JSON.parse(guestRaw)?.state?.userId : null;

  if (guestUserId) {
    config.headers.set("X-Guest-Id", guestUserId);
  }

  return config;
});

export default api;
