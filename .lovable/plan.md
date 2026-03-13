
Goal
Build an admin-only “chat-style news sender” where you can send text + optional image, and the system automatically creates a new news post and publishes it.

Confirmed requirements
- Placement: Admin page only
- Behavior: Create new post (no updating existing posts)
- Publish: Auto publish immediately

Implementation plan

1) Add a chat-style composer in Admin
- Create a new component (ex: `AdminNewsChatComposer`) with:
  - Message textarea (“news update” input)
  - Optional image upload
  - Send button
  - Lightweight chat feed showing user message + system result (success/failure)
- Keep it simple and newsroom-friendly (Tamil labels like current UI).

2) Reuse media upload flow for chat image
- Reuse/extract existing `news-media` upload logic (currently duplicated in media components) into a shared helper.
- On send, if image is attached:
  - Upload to `news-media`
  - Keep returned public URL as preferred `cover_image_url`.

3) Extend AI article generation input (optional image context)
- Update `generate-news-article` function payload to accept optional `imageUrl`.
- Include `imageUrl` in prompt context so AI can better align article tone/context.
- Keep current admin auth + role checks unchanged (already secure).

4) Auto-create and auto-publish post after AI response
- In Admin send handler:
  - Invoke AI generator with chat text (+ optional image URL)
  - Build insert payload for `news_posts`
  - Force auto publish:
    - `is_published = true`
    - `published_at = now()`
  - `cover_image_url` priority:
    1) Uploaded chat image
    2) AI returned image
    3) null (only if video exists; otherwise block per media rule)

5) Handle slug collisions safely
- Add a small client-side slug conflict strategy for auto posts:
  - If slug exists, append numeric suffix (`-2`, `-3`, ...)
- Prevent failed auto-publish due to duplicate slug.

6) Refresh admin/news views immediately
- After successful insert:
  - Refresh admin list/analytics (`fetchAdminState`)
  - Add success message in chat feed with created title/slug
- This ensures homepage/article pages reflect the new published post right away.

7) Error and guardrails
- Validate message is not empty before send.
- Respect current media requirement trigger (image/video required).
- Show clear Tamil error toasts for:
  - AI failure
  - Upload failure
  - Insert/publish failure
- Keep operation admin-only via existing route + RLS policies.

Files expected to change
- `src/pages/Admin.tsx` (integrate chat composer + auto-create flow)
- `src/components/admin/AdminNewsChatComposer.tsx` (new)
- `src/components/admin/AdminAIAssistant.tsx` (optional: keep separate or merge UX)
- `supabase/functions/generate-news-article/index.ts` (optional image context support)
- Optional shared utility:
  - `src/lib/news-media.ts` (upload helper extraction)

Database/RLS impact
- No schema changes required for this version.
- Existing roles, policies, and media validation already support secure admin-only creation.

Technical flow
```text
Admin chat message (+ optional image)
        |
        v
Upload image to news-media (optional)
        |
        v
Invoke generate-news-article (text + optional imageUrl)
        |
        v
Compose final post payload (auto-publish true)
        |
        v
Insert into news_posts
        |
        v
Refresh admin list + visible on site
```

QA checklist (end-to-end)
- Send text-only chat message → post auto-publishes.
- Send text + image → same image appears as card cover.
- Duplicate headline scenario → slug suffix works.
- Failure paths show clean toast and no partial broken state.
- Confirm new post appears on homepage cards and article page on mobile + desktop.
