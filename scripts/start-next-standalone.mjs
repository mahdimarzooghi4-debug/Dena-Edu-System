// Render injects an internal HOSTNAME value; Next must bind to all interfaces.
process.env.HOSTNAME = "0.0.0.0";
await import("../.next/standalone/server.js");
