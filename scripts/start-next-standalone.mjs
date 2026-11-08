// Render expects a web process listening on its assigned PORT and 0.0.0.0.
// Next's standalone server reads HOSTNAME and PORT from process.env.
// In Docker, Dockerfile still launches server.js directly with the same HOSTNAME.
process.env.HOSTNAME = "0.0.0.0";
await import("../.next/standalone/server.js");
