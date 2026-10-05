// Where the backend (server.js) lives, shared by everything that talks to it.
//
// REACT_APP_API_URL is baked into the website when it is built. In development
// with nothing set we use the local backend. In a production build with nothing
// set there is NO backend yet: say so plainly instead of sending every visitor's
// browser to localhost, which is their own computer.

const configured = (process.env.REACT_APP_API_URL || "").trim().replace(/\/+$/, "");

export const API_BASE_URL = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export const backendConfigured = () => API_BASE_URL !== "";

export const NO_BACKEND_MESSAGE = "This feature is being set up and will be available soon. Please try again later.";
