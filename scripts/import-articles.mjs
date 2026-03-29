#!/usr/bin/env node
import fs from "node:fs/promises";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [,, inputPath] = process.argv;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

if (!inputPath) {
  console.error("Usage: node scripts/import-articles.mjs <articles.json>");
  process.exit(1);
}

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeKeywords = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

const request = async (path, method = "GET", body) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const ensureUniqueSlug = async (base) => {
  let candidate = base;
  let suffix = 2;

  while (true) {
    const rows = await request(`news_posts?select=id&slug=eq.${encodeURIComponent(candidate)}&limit=1`);
    if (!rows?.length) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 1000) throw new Error(`Could not generate unique slug for ${base}`);
  }
};

const raw = await fs.readFile(inputPath, "utf8");
const parsed = JSON.parse(raw);
const articles = Array.isArray(parsed) ? parsed : parsed?.articles;

if (!Array.isArray(articles) || articles.length === 0) {
  throw new Error("Input must be a JSON array or an object with { articles: [] }.");
}

let inserted = 0;
let skipped = 0;

for (let i = 0; i < articles.length; i += 1) {
  const item = articles[i] || {};
  const title = String(item.title || "").trim();
  const content = String(item.content || "").trim();
  const baseSlug = String(item.slug || slugify(title)).trim();

  if (!title || !content || !baseSlug) {
    skipped += 1;
    console.warn(`skip row ${i + 1}: title/content/slug missing`);
    continue;
  }

  const cover = item.cover_image_url ? String(item.cover_image_url).trim() : null;
  const video = item.video_url ? String(item.video_url).trim() : null;
  if (!cover && !video) {
    skipped += 1;
    console.warn(`skip row ${i + 1}: media missing`);
    continue;
  }

  const slug = await ensureUniqueSlug(baseSlug);
  const excerpt = String(item.excerpt || content.slice(0, 220)).trim();
  const isPublished = item.is_published ?? true;

  const payload = {
    title,
    slug,
    category: String(item.category || "உள்ளூர்").trim(),
    excerpt,
    content,
    cover_image_url: cover,
    video_url: video,
    meta_title: String(item.meta_title || title).trim().slice(0, 60),
    meta_description: String(item.meta_description || excerpt).trim().slice(0, 160),
    meta_keywords: normalizeKeywords(item.meta_keywords),
    is_published: !!isPublished,
    published_at: isPublished ? new Date(item.published_at || Date.now()).toISOString() : null,
  };

  await request("news_posts", "POST", payload);
  inserted += 1;
}

console.log(JSON.stringify({ inserted, skipped, total: articles.length }, null, 2));
