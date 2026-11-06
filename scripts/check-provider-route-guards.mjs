// Run against a local build without DATABASE_URL/Better Auth configuration.
// This checks unauthenticated HTTP guards, not browser behavior or signed-in flows.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3101');
if (!['127.0.0.1','localhost','[::1]'].includes(base.hostname)) throw new Error('Use a local test server');
const id = '00000000-0000-4000-8000-000000000001';
const paths = ['/provider','/provider/profile','/provider/collaborations',`/provider/collaborations/${id}`,
  '/provider/services','/provider/revenue','/provider/notifications','/provider/courses',`/provider/courses/${id}`,
  '/provider/assessments','/provider/learning','/provider/supervision',`/provider/courses/${id}/media`,
  `/provider/courses/${id}/practice`,`/provider/courses/${id}/assessments`];
const checks = await Promise.all(paths.map(async (path) => {
  const response = await fetch(new URL(path,base), { redirect:'manual', signal:AbortSignal.timeout(20000) });
  const location = response.headers.get('location');
  return { path,status:response.status,passed:[303,307,308].includes(response.status) && location !== null && new URL(location,base).pathname === '/login' };
}));
for (const check of checks) console.log(`${check.passed?'PASS':'FAIL'} ${check.status} ${check.path}`);
if (checks.some((check) => !check.passed)) process.exitCode = 1;
