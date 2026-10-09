# RLS article view counter (Cloudflare Workers + D1)

This folder contains an independent article-view counter for https://rlsj.ir.
The same slug is shared by the Persian, English and Russian versions of an article.

## 1. Create the D1 database

In Cloudflare Dashboard, open **Workers & Pages → D1 SQL Database** and create a database named `rls-article-counter`.
Open its SQL console and run all statements from `schema.sql`.

## 2. Create the Worker

Create a Worker named `rls-article-counter` and paste the contents of `worker.js`.

In the Worker settings, add a D1 database binding:
- Variable name: `RLS_COUNTER_DB`
- Database: `rls-article-counter`

Deploy the Worker. Keep its `workers.dev` address; the website integration will need it.

## 3. Test the API

Replace `YOUR-WORKER` with the deployed Worker hostname.

Read a count:
`https://YOUR-WORKER/api/count?article=role-of-context-russian-verbal-aspect`

Increment a count (POST JSON):
`curl -X POST 'https://YOUR-WORKER/api/view' -H 'Content-Type: application/json' --data '{"article":"role-of-context-russian-verbal-aspect"}'`

Both should return JSON containing `article` and `views`.

## Notes

- The allowlist currently contains the four published article slugs.
- The counter is shared across languages when the same slug is used.
- The public POST endpoint can be abused by automated clients. This starter version does not store visitor IP addresses and does not claim to count unique people. Before relying on the numbers for formal reporting, add rate limiting or a Cloudflare Turnstile check.
- Do not replace the site's existing counter UI until the API tests succeed.
