package ir.dena.student;

import org.junit.Test;
import java.net.URI;
import static org.junit.Assert.*;

public class AppAddressTest {
    @Test public void missingHostFailsClosed() {
        assertNull(AppAddress.validatedStart(""));
        assertNull(AppAddress.validatedStart(null));
    }

    @Test public void acceptsOnlyHttpsStudentEntry() {
        URI uri = AppAddress.validatedStart("https://stage.edu-example.org/student/demo");
        URI showcase = AppAddress.validatedStart("https://dena-student-demo.onrender.com/student-demo");
        assertEquals("/student-demo", showcase.getPath());
        assertEquals("/student/demo", uri.getPath());
        assertTrue(AppAddress.sameOrigin(uri, "https://stage.edu-example.org/api/student/demo"));
        assertTrue(AppAddress.sameOrigin(uri, "https://stage.edu-example.org/login"));
        assertTrue(AppAddress.sameOrigin(uri, "https://STAGE.edu-example.org:443/student"));
    }

    @Test public void deniesCrossOriginAndNonHttps() {
        URI uri = AppAddress.validatedStart("https://stage.edu-example.org/student");
        assertFalse(AppAddress.sameOrigin(uri, "https://untrusted.example.org/student"));
        assertFalse(AppAddress.sameOrigin(uri, "http://stage.edu-example.org/student"));
        assertFalse(AppAddress.sameOrigin(uri, "javascript:alert(1)"));
        assertFalse(AppAddress.sameOrigin(uri, "https://stage.edu-example.org.evil.example.org/student"));
        assertFalse(AppAddress.sameOrigin(uri, "https://attacker@stage.edu-example.org/student"));
    }

    @Test public void rejectsUnsafeConfiguration() {
        for (String candidate : new String[]{
            "http://stage.edu-example.org/student",
            "https://stage.edu-example.org/admin",
            "https://stage.edu-example.org/student?token=123",
            "https://user:pass@stage.edu-example.org/student",
            "https://localhost/student",
            "https://dena.invalid/student",
            "https://stage.edu-example.org:8443/student",
            "https://stage.edu-example.org/student#fragment",
            "https://10.0.0.1/student",
            "https://192.168.1.1/student",
            "https://169.254.169.254/student",
            "https://8.8.8.8/student",
            "https://dev.internal/student",
            "https://device.local/student",
            "https://demo.localhost/student"
        }) {
            try {
                AppAddress.validatedStart(candidate);
                fail("Expected invalid configuration to be rejected: " + candidate);
            } catch (IllegalArgumentException expected) {
                // Intentionally fail closed.
            }
        }
    }
}
