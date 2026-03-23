-- Restrict stripe billing columns from unauthenticated and authenticated PostgREST access.
--
-- Attack vector: direct GET /rest/v1/handles?select=* against Supabase's PostgREST
-- API bypasses the Next.js app entirely and returns stripe_customer_id for all rows.
--
-- Fix: column-level privileges on both the `anon` and `authenticated` roles.
-- PostgREST handles column-level grants correctly — SELECT * omits restricted columns
-- rather than erroring, so existing app queries are not affected.
--
-- Server-side dashboard reads use createServiceClient() (service_role) which
-- bypasses RLS and column-level grants entirely — no change needed there.

-- Remove table-level SELECT from both roles to enforce column-level control
REVOKE SELECT ON handles FROM anon;
REVOKE SELECT ON handles FROM authenticated;

-- Re-grant SELECT on safe public columns only (excludes stripe_customer_id, subscription_status)
GRANT SELECT (
  id,
  handle,
  user_id,
  github_username,
  display_name,
  location,
  bio,
  avatar_url,
  claude_md,
  cursor_rules,
  use_json,
  copies_this_week,
  copies_this_month,
  copies_total,
  percentile,
  created_at,
  updated_at
) ON handles TO anon;

GRANT SELECT (
  id,
  handle,
  user_id,
  github_username,
  display_name,
  location,
  bio,
  avatar_url,
  claude_md,
  cursor_rules,
  use_json,
  copies_this_week,
  copies_this_month,
  copies_total,
  percentile,
  created_at,
  updated_at
) ON handles TO authenticated;
