# RLS Association — Supabase setup

This directory contains the first database/security migration for the RLS Association membership system.

## What this migration creates
- Seven membership categories: student, graduate, faculty, researcher, translator, culture, honorary.
- Membership states: pending, approved, rejected, suspended.
- Private member profiles and admin roles.
- A public directory view that exposes only approved profiles explicitly marked public.
- Row Level Security policies for profile access and moderation.
- A private Storage bucket for member photos and supporting documents.

## Setup required in your Supabase project
1. Create a Supabase project in your own account.
2. Open **SQL Editor** and run `schema.sql`.
3. In **Authentication → URL Configuration**, add the deployed RLS site URL to the allowed redirect URLs.
4. Create the first account through Supabase Auth.
5. Find that account's UUID in **Authentication → Users** and run the admin-promotion SQL at the bottom of `schema.sql`, replacing the placeholder UUID.
6. Keep the project URL and publishable/anon key in client-side configuration only. Never put the service_role/secret key in GitHub.
7. Configure SMTP/email confirmation before public launch.

## Important security notes
- New profiles are pending and private by default.
- Only administrators can approve/reject/suspend accounts or make profiles public.
- The public directory view omits email, evidence links, moderation notes and other private fields.
- Member uploads are in a private bucket; the application should use short-lived signed URLs after authorization.
- Admin role assignment is intentionally manual and must never be self-service.
- Review the policies in a staging project before production use.

## Not yet connected
This migration does not create a Supabase project, configure credentials, or activate the website registration/login forms. The next implementation step is the client integration and a protected admin dashboard after the project URL and publishable key are supplied through a secure configuration process.
