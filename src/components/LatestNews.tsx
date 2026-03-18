import { useEffect, useMemo, useState } from "react";
import NewsCard from "./NewsCard";
import strayDogs from "@/assets/stray-dogs-uraiyur.png";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type NewsPost = Tables<"news_posts"> & { video_url?: string | null };

const PAGE_SIZE = 6;

const formatTimeAgoTa = (dateString: string) => {
  const publishedDate = new Date(dateString);
  const diffMs = Date.now() - publishedDate.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins} நிமிடம் முன்பு`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} மணி நேரம் முன்பு`;
  }

  const days = Math.floor(diffMs / day);
  return `${days} நாள் முன்பு`;
};

const LatestNews = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPublishedPosts = async ({ offset, append }: { offset: number; append: boolean }) => {
    const { data, error } = await supabase
      .from("news_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      toast({ title: "செய்திகள் ஏற்ற முடியவில்லை", description: error.message, variant: "destructive" });
      return;
    }

    const nextPosts = (data as NewsPost[]) || [];
    setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
    setHasMore(nextPosts.length === PAGE_SIZE);
  };

  useEffect(() => {
    const loadInitialPosts = async () => {
      await fetchPublishedPosts({ offset: 0, append: false });
      setLoading(false);
    };

    void loadInitialPosts();
  }, [toast]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    await fetchPublishedPosts({ offset: posts.length, append: true });
    setLoadingMore(false);
  };

  const mappedItems = useMemo(
    () =>
      posts.map((post, index) => ({
        category: post.category,
        title: post.title,
        excerpt: post.excerpt || "சுருக்கம் இல்லை",
        time: formatTimeAgoTa(post.published_at || post.created_at),
        views: "—",
        imageUrl: post.cover_image_url || (!post.video_url && index === 0 ? strayDogs : undefined),
        videoUrl: post.video_url || undefined,
        link: `/news/${post.slug}`,
      })),
    [posts],
  );

  const featured = mappedItems.slice(0, 2);
  const sidebar = mappedItems.slice(2);

  return (
    <section id="latest" className="container py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 bg-primary" />
        <h2 className="font-heading text-3xl uppercase">சமீபத்திய செய்திகள்</h2>
      </div>

      {loading ? (
        <div className="border border-border bg-card p-6 text-sm text-muted-foreground">செய்திகள் ஏற்றப்படுகிறது...</div>
      ) : mappedItems.length === 0 ? (
        <div className="border border-border bg-card p-6 text-sm text-muted-foreground">வெளியிடப்பட்ட செய்திகள் இன்னும் இல்லை.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2">
              {featured.map((item, i) => (
                <NewsCard key={i} {...item} featured />
              ))}
            </div>

            <div className="border border-border bg-card p-4">
              <h3 className="mb-2 border-b border-border pb-2 font-heading text-sm uppercase tracking-wider text-primary">மேலும் செய்திகள்</h3>
              {sidebar.map((item, i) => (
                <NewsCard key={i} {...item} />
              ))}
            </div>
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? "ஏற்றுகிறது..." : "மேலும் செய்திகள்"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default LatestNews;
