/**
 * Conservative check for dangerous literal service destinations. Keep private
 * RFC1918 addresses ALLOWED: a real private media origin can legitimately
 * live on an internal network. This is not DNS resolution, egress policy,
 * hostname allowlisting or DNS-rebinding protection.
 */
export function unsafeServiceHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") ||
    host === "::1" || host === "::" || host.startsWith("::ffff:") ||
    // IPv6 link-local fe80::/10
    /^fe[89ab][0-9a-f]:/.test(host) ||
    host === "0.0.0.0" ||
    /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(host);
}
