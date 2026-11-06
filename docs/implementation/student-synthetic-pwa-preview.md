# Dena student mobile app — synthetic backend preview

## Scope

The existing authenticated student app continues using PostgreSQL, role and enrollment checks. The synthetic preview is separate and does not bypass identity or entitlement guards.

## Local preview

Set DENA_DEMO_MODE=enabled and run npm run dev, then open /student/demo.

Available screens: home, courses, assessments, growth. Other entries intentionally explain their unavailable operational contract. The demo can be enabled on a production-mode server only if BOTH DENA_DEMO_MODE=enabled and DENA_DEMO_ALLOW_PRODUCTION=enabled are explicitly present. Never enable them on the live student service.

GET /api/student/demo returns synthetic preview content, without correct answers. POST /api/student/demo/practice grades two synthetic practice questions in server code and returns stored=false. Neither writes to PostgreSQL nor claims formal learning progress. No SMS, payment, membership, provider payout or real content is simulated.

## Mobile installation

Next.js provides /manifest.webmanifest, and the StudentShell registers a student-scoped service worker on secure origins. It does not cache private HTML, API data or tokens; offline pages show a generic retry message. App installation and browser visuals still require a real-device acceptance pass.

## Next product steps

Continue backend-backed student learning flows using synthetic PostgreSQL fixtures isolated from real data. Implement missing Figma member/elite-club and educational-support contracts before claiming those screens connected. Keep real payment, SMS, CDN and LiveKit disabled until providers exist.
