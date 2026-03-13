
Goal
Add automatic social distribution so every time a news post is published, it is sent to your automation webhook, which then posts to Facebook Page, Instagram, and WhatsApp channel/business.

What I will build

1) Add admin webhook settings (one place to configure automation URL)
- Create a new database table for social publish settings (webhook URL, enabled flag, optional secret header/token, timestamps, created_by).
- Restrict read/write to admins only via RLS.
- Add a small “Social Auto Post Settings” card in Admin to save/update this URL.

2) Create a backend function to deliver social payload
- New backend function (e.g., `post-news-to-social`) that:
  - Validates admin auth (or supports secure server-side call)
  - Accepts `postId`
  - Loads published post details from database
  - Loads active webhook setting
  - Sends a POST request to your Zapier/Make webhook
  - Returns success/failure details
- Include robust CORS + clear error responses.

3) Trigger social posting from all publish entry points
- Chat auto-publish flow: after successful insert with `is_published=true`, invoke `post-news-to-social`.
- Manual form publish flow: when saving with `is_published=true`, invoke `post-news-to-social`.
- Draft → Publish toggle: when switching to published, invoke `post-news-to-social`.
- Do not trigger when unpublishing.

4) Standardize webhook payload for Zapier/Make
- Send a clean payload such as:
  - post id, title, slug, category, excerpt
  - content (or trimmed summary)
  - cover image URL, video URL
  - published_at
  - public article URL
  - source (`chat`, `manual-form`, `toggle-publish`)
- This lets one Zap/Make scenario fan out to FB + IG + WhatsApp.

5) UX + reliability behavior
- Publishing should still succeed even if webhook fails (non-blocking social delivery).
- Show toast/chat status:
  - “Published successfully”
  - “Published, but social push failed” (with reason)
- Add optional retry action in Admin list for failed social push (small future-safe hook in code structure).

6) Validation and safeguards
- Only send social payload for already-published records.
- Prevent empty/invalid webhook URL save.
- Keep webhook URL hidden from non-admin users.
- Log function errors for debugging.

Technical details
- New table: `social_publish_settings`
  - columns: `id`, `webhook_url`, `enabled`, `secret_token` (optional), `created_by`, `created_at`, `updated_at`
  - RLS: admin-only SELECT/INSERT/UPDATE/DELETE using `has_role(auth.uid(), 'admin')`
- New function: `supabase/functions/post-news-to-social/index.ts`
  - Uses service/client reads for post + settings
  - Calls webhook with JSON payload
  - CORS headers + OPTIONS handler
- Frontend updates:
  - `src/pages/Admin.tsx`: settings UI + save handler + invoke after publish actions
  - `src/components/admin/AdminNewsChatComposer.tsx`: invoke social function after successful insert
- Bug fix included during implementation:
  - `supabase/functions/generate-news-article/index.ts` currently has a malformed prompt template string; fix this first so AI publish flow remains stable before adding social posting.

End-to-end checks
1. Save webhook in Admin settings.
2. Publish via Chat → verify webhook receives payload and social channels get post.
3. Publish via Manual form → verify same.
4. Toggle Draft → Publish → verify same.
5. Simulate webhook failure → verify article still publishes and admin sees social-failed warning.
