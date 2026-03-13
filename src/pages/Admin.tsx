import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, LogOut, Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import AdminAIAssistant from "@/components/admin/AdminAIAssistant";
import AdminMediaFields from "@/components/admin/AdminMediaFields";
import ArticleMediaUpdater from "@/components/admin/ArticleMediaUpdater";
import AdminNewsChatComposer from "@/components/admin/AdminNewsChatComposer";
import { triggerSocialPublish } from "@/lib/social-publish";

type NewsPost = Tables<"news_posts"> & {
  video_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string[] | null;
};

type SocialPublishSettings = {
  id: string;
  webhook_url: string;
  enabled: boolean;
  secret_token: string | null;
};

interface NewsFormState {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  video_url: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_published: boolean;
}

const emptyForm: NewsFormState = {
  title: "",
  slug: "",
  category: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  video_url: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  is_published: false,
};

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [analytics, setAnalytics] = useState({ totalPosts: 0, publishedPosts: 0, totalViews: 0 });
  const [form, setForm] = useState<NewsFormState>(emptyForm);
  const [aiSourceUrl, setAiSourceUrl] = useState("");
  const [aiSourceText, setAiSourceText] = useState("");
  const [socialSettings, setSocialSettings] = useState<SocialPublishSettings | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [secretTokenInput, setSecretTokenInput] = useState("");
  const [socialEnabled, setSocialEnabled] = useState(true);
  const [savingSocialSettings, setSavingSocialSettings] = useState(false);

  const topCategory = useMemo(() => {
    if (!posts.length) return "—";
    const counts = posts.reduce<Record<string, number>>((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [posts]);

  const fetchAdminState = async (currentUserId: string) => {
    setLoadingPosts(true);

    const [{ data: roles, error: roleError }, { data: postData, error: postsError }, { count: totalViews, error: viewsError }, { data: socialData, error: socialError }] =
      await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", currentUserId).eq("role", "admin").maybeSingle(),
        supabase.from("news_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("page_view_events").select("id", { count: "exact", head: true }),
        (supabase as any)
          .from("social_publish_settings")
          .select("id, webhook_url, enabled, secret_token")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (roleError) {
      toast({ title: "அனுமதி சரிபார்ப்பு தோல்வி", description: roleError.message, variant: "destructive" });
      setCheckingRole(false);
      setLoadingPosts(false);
      return;
    }

    const adminStatus = !!roles;
    setIsAdmin(adminStatus);
    setCheckingRole(false);

    if (!adminStatus) {
      setLoadingPosts(false);
      return;
    }

    if (postsError) {
      toast({ title: "செய்திகள் ஏற்ற முடியவில்லை", description: postsError.message, variant: "destructive" });
    } else {
      const typedPosts = (postData as NewsPost[]) || [];
      setPosts(typedPosts);
      const totalPosts = typedPosts.length;
      const publishedPosts = typedPosts.filter((item) => item.is_published).length;
      setAnalytics({ totalPosts, publishedPosts, totalViews: totalViews || 0 });
    }

    if (viewsError) {
      toast({ title: "Analytics ஏற்ற முடியவில்லை", description: viewsError.message, variant: "destructive" });
    }

    setLoadingPosts(false);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCheckingRole(false);
      setLoadingPosts(false);
      return;
    }

    void fetchAdminState(user.id);
  }, [authLoading, user?.id]);

  const buildSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleAIGenerate = async () => {
    if (!aiSourceUrl.trim() && !aiSourceText.trim()) {
      toast({ title: "Input தேவை", description: "URL அல்லது குறிப்புகள் கொடுக்கவும்.", variant: "destructive" });
      return;
    }

    setGenerating(true);

    const { data, error } = await supabase.functions.invoke("generate-news-article", {
      body: {
        sourceUrl: aiSourceUrl.trim() || null,
        sourceText: aiSourceText.trim() || null,
      },
    });

    if (error) {
      toast({ title: "AI உருவாக்கம் தோல்வி", description: error.message, variant: "destructive" });
      setGenerating(false);
      return;
    }

    const result = (data || {}) as Partial<NewsFormState>;

    setForm((prev) => ({
      ...prev,
      title: result.title || prev.title,
      slug: result.slug || prev.slug,
      category: result.category || prev.category,
      excerpt: result.excerpt || prev.excerpt,
      content: result.content || prev.content,
      cover_image_url: result.cover_image_url || prev.cover_image_url,
      video_url: result.video_url || prev.video_url,
      meta_title: result.meta_title || prev.meta_title,
      meta_description: result.meta_description || prev.meta_description,
      meta_keywords: result.meta_keywords || prev.meta_keywords,
    }));

    toast({ title: "AI draft தயாராக உள்ளது" });
    setGenerating(false);
  };

  const handleBulkGenerateImages = async () => {
    if (!user) return;
    setBulkGenerating(true);

    const { data, error } = await supabase.functions.invoke("bulk-generate-news-thumbnails", {
      body: { limit: 12 },
    });

    if (error) {
      toast({ title: "Auto image generation தோல்வி", description: error.message, variant: "destructive" });
      setBulkGenerating(false);
      return;
    }

    const result = (data || {}) as { processed?: number; updated?: number; failed?: Array<{ reason?: string }> };
    const failedCount = result.failed?.length || 0;

    toast({
      title: "Auto image generation முடிந்தது",
      description: `Processed: ${result.processed || 0}, Updated: ${result.updated || 0}, Failed: ${failedCount}`,
      variant: failedCount > 0 ? "destructive" : "default",
    });

    await fetchAdminState(user.id);
    setBulkGenerating(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.cover_image_url.trim() && !form.video_url.trim()) {
      toast({ title: "Media தேவை", description: "ஒவ்வொரு செய்திக்கும் image அல்லது video அவசியம்.", variant: "destructive" });
      return;
    }

    const finalSlug = form.slug.trim() || buildSlug(form.title);
    if (!finalSlug) {
      toast({ title: "Slug தேவை", description: "Title அல்லது slug ஒன்றையாவது நிரப்பவும்.", variant: "destructive" });
      return;
    }

    const keywordArray = form.meta_keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    setSaving(true);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: finalSlug,
      category: form.category.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      cover_image_url: form.cover_image_url.trim() || null,
      video_url: form.video_url.trim() || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_keywords: keywordArray,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    const { error } = editingId
      ? await supabase.from("news_posts").update(payload as never).eq("id", editingId)
      : await supabase.from("news_posts").insert({ ...(payload as Record<string, unknown>), created_by: user.id } as never);

    if (error) {
      toast({ title: "சேமிக்க முடியவில்லை", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "செய்தி புதுப்பிக்கப்பட்டது" : "செய்தி உருவாக்கப்பட்டது" });
      resetForm();
      await fetchAdminState(user.id);
    }

    setSaving(false);
  };

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image_url: post.cover_image_url || "",
      video_url: post.video_url || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      meta_keywords: (post.meta_keywords || []).join(", "),
      is_published: post.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("news_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "நீக்க முடியவில்லை", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "செய்தி நீக்கப்பட்டது" });
      await fetchAdminState(user.id);
    }
  };

  const handleTogglePublish = async (post: NewsPost) => {
    if (!user) return;
    const nextPublished = !post.is_published;
    const { error } = await supabase
      .from("news_posts")
      .update({ is_published: nextPublished, published_at: nextPublished ? new Date().toISOString() : null })
      .eq("id", post.id);

    if (error) {
      toast({ title: "நிலை மாற்ற முடியவில்லை", description: error.message, variant: "destructive" });
    } else {
      toast({ title: nextPublished ? "செய்தி வெளியிடப்பட்டது" : "வரைவு நிலைக்கு மாற்றப்பட்டது" });
      await fetchAdminState(user.id);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (authLoading || checkingRole) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">சரிபார்க்கப்படுகிறது...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="font-heading text-2xl uppercase">Admin அனுமதி இல்லை</CardTitle>
            <CardDescription>உங்கள் account-க்கு admin role இல்லை; admin dashboard அணுக முடியாது.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cloud Database-ல் user_roles table-இல் உங்கள் user_idக்கு <strong>admin</strong> role சேர்க்க வேண்டும்.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl uppercase">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">செய்திகள் நிர்வகிப்பு மற்றும் analytics பார்வை</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={resetForm}>
              <Plus className="h-4 w-4" /> புதிய பதிவு
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> வெளியேறு
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>மொத்த செய்திகள்</CardDescription>
              <CardTitle className="text-3xl">{analytics.totalPosts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>வெளியிடப்பட்டவை</CardDescription>
              <CardTitle className="text-3xl">{analytics.publishedPosts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>மொத்த பக்க பார்வைகள்</CardDescription>
              <CardTitle className="text-3xl">{analytics.totalViews}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Top Category</CardDescription>
              <CardTitle className="text-xl">{topCategory}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <AdminNewsChatComposer
          userId={user.id}
          onPostCreated={async () => {
            await fetchAdminState(user.id);
          }}
        />

        <AdminAIAssistant
          sourceUrl={aiSourceUrl}
          sourceText={aiSourceText}
          generating={generating}
          onSourceUrlChange={setAiSourceUrl}
          onSourceTextChange={setAiSourceText}
          onGenerate={handleAIGenerate}
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase">{editingId ? "செய்தி திருத்து" : "புதிய செய்தி உருவாக்கு"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">தலைப்பு</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-from-title" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} required />
              </div>

              <AdminMediaFields
                userId={user.id}
                imageUrl={form.cover_image_url}
                videoUrl={form.video_url}
                aiContext={{ title: form.title, category: form.category, excerpt: form.excerpt }}
                onImageUrlChange={(value) => setForm((p) => ({ ...p, cover_image_url: value }))}
                onVideoUrlChange={(value) => setForm((p) => ({ ...p, video_url: value }))}
              />

              <div className="space-y-2">
                <Label htmlFor="excerpt">சுருக்கம்</Label>
                <Textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">உள்ளடக்கம்</Label>
                <Textarea id="content" rows={8} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={form.meta_title}
                  onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))}
                  placeholder="SEO title (recommended < 60 chars)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  rows={3}
                  value={form.meta_description}
                  onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))}
                  placeholder="SEO description (recommended < 160 chars)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-keywords">Meta Keywords</Label>
                <Input
                  id="meta-keywords"
                  value={form.meta_keywords}
                  onChange={(e) => setForm((p) => ({ ...p, meta_keywords: e.target.value }))}
                  placeholder="trichy, local news, civic issues"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                உடனே வெளியிடு
              </label>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "சேமிக்கப்படுகிறது..." : editingId ? "புதுப்பிக்க" : "செய்தி சேமிக்க"}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> செய்தி பட்டியல்
            </CardTitle>
            <CardDescription>{loadingPosts ? "ஏற்றப்படுகிறது..." : `${posts.length} பதிவுகள்`}</CardDescription>
            <div>
              <Button type="button" variant="secondary" onClick={handleBulkGenerateImages} disabled={bulkGenerating || loadingPosts}>
                <Sparkles className="h-4 w-4" /> {bulkGenerating ? "Auto generating..." : "Auto Generate Missing Images"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {posts.map((post) => {
                const hasPlaceholder = (post.cover_image_url || "").includes("/placeholder.svg");

                return (
                  <div key={post.id} className="border border-border rounded-md p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h3 className="font-heading text-lg uppercase">{post.title}</h3>
                      <p className="text-xs text-muted-foreground">{post.category} • {post.slug}</p>
                      <p className="text-xs text-muted-foreground">{post.video_url ? "Video" : "Image"} media attached</p>
                      {hasPlaceholder && <p className="text-xs text-primary">⚠ Placeholder image உள்ளது — production media upload செய்யவும்.</p>}
                      <p className="text-xs text-muted-foreground">SEO: {(post.meta_title || "N/A").slice(0, 60)}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt || "சுருக்கம் இல்லை"}</p>

                      <ArticleMediaUpdater
                        postId={post.id}
                        userId={user.id}
                        currentImageUrl={post.cover_image_url}
                        currentVideoUrl={post.video_url}
                        onUpdated={async () => {
                          await fetchAdminState(user.id);
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant={post.is_published ? "secondary" : "default"} onClick={() => handleTogglePublish(post)}>
                        {post.is_published ? "வரைவு" : "வெளியிடு"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleEdit(post)}>
                        <Pencil className="h-4 w-4" /> திருத்து
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="h-4 w-4" /> நீக்கு
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!loadingPosts && posts.length === 0 && <p className="text-sm text-muted-foreground">பதிவுகள் இல்லை.</p>}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Admin;
