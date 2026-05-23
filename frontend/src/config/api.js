const LOCAL_API_URL = "http://localhost:4000";

const cleanUrl = (value) => String(value || "").replace(/\/$/, "");

export const API_URL = cleanUrl(import.meta.env.VITE_API_URL) || LOCAL_API_URL;
export const SOCKET_URL = cleanUrl(import.meta.env.VITE_SOCKET_URL) || API_URL;

export const hasProductionApiUrl = () =>
  Boolean(cleanUrl(import.meta.env.VITE_API_URL)) || window.location.hostname === "localhost";

export const requireProductionApiUrl = () => {
  if (hasProductionApiUrl()) return true;
  alert(
    "Production API URL is missing. Set VITE_API_URL in Vercel to your deployed backend URL, then redeploy."
  );
  return false;
};
