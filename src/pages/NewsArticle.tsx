import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Tags } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type NewsPost = Tables<"news_posts"> & {
  video_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string[] | null;
};

const ensureMetaTag = (attr: "name" | "property", key: string, value: string) => {
  let tag = document.head.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = value;
};

const ensureCanonical = (url: string) => {
  let link = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
};

const COMMUNITY_ALERT_LINES = [
  "சாமானியனின் குரல் – உண்மையின் வெளிச்சம்",
  "உங்கள் பகுதியில் நடைபெறும் அநீதி, ஊழல் அல்லது சட்டவிரோத செயல்கள் குறித்து ஆதாரத்துடன் எங்களுக்கு தகவல் அனுப்புங்கள்.",
  "✔ தகவல்கள் முழுமையாக சரிபார்க்கப்பட்ட பிறகே செய்தியாக வெளியிடப்படும்.",
  "✔ தகவல் அளிப்பவரின் பெயர் மற்றும் தொடர்பு விபரங்கள் ரகசியமாக பாதுகாக்கப்படும்.",
];

const NewsArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const loadPostAndRelated = async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "செய்தி கிடைக்கவில்லை", description: error?.message || "Invalid article slug", variant: "destructive" });
        navigate("/", { replace: true });
        setLoading(false);
        return;
      }

      const currentPost = data as NewsPost;
      setPost(currentPost);

      const { data: relatedData } = await supabase
        .from("news_posts")
        .select("*")
        .eq("is_published", true)
        .eq("category", currentPost.category)
        .neq("id", currentPost.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3);

      setRelatedPosts((relatedData as NewsPost[]) || []);
      setLoading(false);
    };

    const trackView = async () => {
      await supabase.from("page_view_events").insert({
        path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
        viewer_id: user?.id ?? null,
      });
    };

    void Promise.all([loadPostAndRelated(), trackView()]);
  }, [slug, navigate, toast, user?.id]);

  useEffect(() => {
    if (!post) return;

    const pageTitle = post.meta_title?.trim() || post.title;
    const pageDescription = post.meta_description?.trim() || post.excerpt || post.title;
    const canonical = `${window.location.origin}/news/${post.slug}`;
    const keywords = post.meta_keywords?.length ? post.meta_keywords.join(", ") : `${post.category}, Trichy Insight`;

    document.title = pageTitle;
    ensureMetaTag("name", "description", pageDescription.slice(0, 160));
    ensureMetaTag("name", "keywords", keywords);
    ensureMetaTag("property", "og:title", pageTitle);
    ensureMetaTag("property", "og:description", pageDescription.slice(0, 160));
    ensureMetaTag("property", "og:type", "article");
    if (post.cover_image_url) {
      ensureMetaTag("property", "og:image", post.cover_image_url);
    }
    ensureCanonical(canonical);
  }, [post]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">செய்தி ஏற்றப்படுகிறது...</p>
      </main>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> முகப்புக்கு திரும்ப
        </Button>

        <article className="mt-6 space-y-6">
          <header className="space-y-3">
            <p className="text-primary text-sm font-heading uppercase tracking-wider">{post.category}</p>
            <h1 className="font-heading text-3xl md:text-4xl uppercase leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.published_at || post.created_at).toLocaleString("ta-IN")}</span>
              <span className="inline-flex items-center gap-1"><Tags className="h-4 w-4" /> {(post.meta_keywords || []).slice(0, 3).join(", ") || "Trichy"}</span>
            </div>
          </header>

          <Card>
            <CardContent className="p-0">
              {post.video_url ? (
                <video src={post.video_url} controls className="w-full max-h-[480px] object-cover" preload="metadata" />
              ) : (
                <img src={post.cover_image_url || "/placeholder.svg"} alt={post.title} className="w-full max-h-[480px] object-cover" loading="lazy" />
              )}
            </CardContent>
          </Card>

          <section className="space-y-4">
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            {post.content.split("\n").filter(Boolean).map((paragraph, index) => (
              <p key={index} className="text-base leading-8 text-foreground">
                {paragraph}
              </p>
            ))}

            <Card className="border-primary/30 bg-muted/40">
              <CardContent className="space-y-2 p-4">
                {COMMUNITY_ALERT_LINES.map((line, index) => (
                  <p
                    key={index}
                    className={index === 0 ? "font-heading text-base uppercase text-primary" : "text-sm leading-7 text-foreground"}
                  >
                    {line}
                  </p>
                ))}
              </CardContent>
            </Card>
          </section>
        </article>

        {relatedPosts.length > 0 && (
          <section className="mt-10">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase">Related Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedPosts.map((item) => (
                  <Link
                    key={item.id}
                    to={`/news/${item.slug}`}
                    className="block border border-border rounded-md p-4 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-primary font-heading uppercase tracking-wider">{item.category}</p>
                    <h3 className="font-heading text-base uppercase mt-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.excerpt || "சுருக்கம் இல்லை"}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NewsArticle;
