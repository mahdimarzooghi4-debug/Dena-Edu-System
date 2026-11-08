package ir.dena.student;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/**
 * Strict origin pinning for the Android container. This is not an authentication
 * decision: the server remains responsible for sessions, role and entitlements.
 */
public final class AppAddress {
    private AppAddress() { }

    public static URI validatedStart(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) return null;
        try {
            URI uri = new URI(rawUrl.trim());
            String host = uri.getHost();
            String path = uri.getPath();
            if (!"https".equalsIgnoreCase(uri.getScheme()) ||
                host == null || !host.contains(".") ||
                uri.getRawUserInfo() != null || uri.getRawQuery() != null ||
                uri.getRawFragment() != null ||
                !(uri.getPort() == -1 || uri.getPort() == 443) ||
                !(path != null && (path.equals("/student") || path.startsWith("/student/") ||
                    path.equals("/student-demo") || path.startsWith("/student-demo/")))) {
                throw new IllegalArgumentException("Student Android URL must be a clean HTTPS student path");
            }
            String normalized = host.toLowerCase(Locale.ROOT);
            // A configured endpoint must be a DNS name, not an IP literal
            // or a local-only development hostname.
            if (normalized.matches("[0-9.]+") || normalized.contains(":") ||
                normalized.equals("localhost") || normalized.endsWith(".localhost") ||
                normalized.endsWith(".local") || normalized.endsWith(".internal") ||
                normalized.endsWith(".invalid")) {
                throw new IllegalArgumentException("Local and invalid endpoints are not allowed");
            }
            return uri;
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("Invalid student Android URL", ex);
        }
    }

    public static boolean sameOrigin(URI configured, String requestedUrl) {
        if (configured == null || requestedUrl == null) return false;
        try {
            URI requested = new URI(requestedUrl);
            if (!"https".equalsIgnoreCase(requested.getScheme()) ||
                requested.getHost() == null || requested.getRawUserInfo() != null) {
                return false;
            }
            return configured.getHost().equalsIgnoreCase(requested.getHost()) &&
                port(configured) == port(requested);
        } catch (URISyntaxException ex) {
            return false;
        }
    }

    private static int port(URI uri) {
        return uri.getPort() == -1 ? 443 : uri.getPort();
    }
}
