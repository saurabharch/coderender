// API version contract (plan §81): single versioned surface. Clients send
// nothing; every /api/* response carries x-api-version. Breaking changes ship
// as v2 alongside v1 (never in place) — see /api/version.
export const API_VERSION = 1;
