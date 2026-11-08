# Dena-hosted APK download relay

The public download page `/download/android` uses the same-origin endpoint
`/download/android/apk` instead of navigating visitors to GitHub Releases.
The server fetches one **fixed and immutable** pre-release asset from the
existing official GitHub release. No user-controlled URL is ever used.

Before sending anything to visitors, the route checks HTTP status, exact
file size and pinned SHA-256 digest, then returns the bytes with Android
APK content type and download disposition. On failure it returns 503,
never a redirect or potentially corrupt APK. Requests may be retried.

The checksum is available under `/download/android/checksum`. GitHub
is only a fallback in the page, not the primary user-facing route.
The Android app remains a network-dependent synthetic preview.
This relay does not change authentication or enable production release.
