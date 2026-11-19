# Manuscript Admin Worker: custom-domain route

## Route to add in Cloudflare
- Zone: `rlsj.ir`
- Route pattern: `rlsj.ir/worker-api/*`
- Worker service: `rls-manuscript-admin`

This is a Worker Route (not a Custom Domain). It intercepts only the `/worker-api/*` path and leaves the static site and all other paths unchanged.

## After adding the route
Test in a browser:
`https://rlsj.ir/worker-api/admin-api/health`

Expected JSON: `ok: true`, with configuration booleans. The endpoint intentionally does not expose secret values.

The admin panel and certificate verification pages now use `https://rlsj.ir/worker-api` as the API base. Existing session-stored `workers.dev` API addresses are migrated to the custom-domain base when the admin page loads.

## Worker source
`workers/manuscript-admin.js` accepts both direct Worker URLs and the `/worker-api/` prefix, normalizing the prefix before routing API requests.
