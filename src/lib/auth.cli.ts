/**
 * CLI-only entrypoint. Supply DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET
 * via your local environment before running Better Auth schema generation.
 * Never import this file from application routes.
 */
import { getAuth } from "./auth";
export const auth = getAuth();
