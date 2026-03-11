import { useEffect, useMemo, useState } from "react";
import NewsCard from "./NewsCard";
import strayDogs from "@/assets/stray-dogs-uraiyur.png";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type NewsPost = Tables<"news_posts">;

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

  useEffect(() => {
    const loadPublishedPosts = async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6);

      if (error) {
        toast({ title: "செய்திகள் ஏற்ற முடியவில்லை", description: error.message, variant: "destructive" });
        setPosts([]);
      } else {
        setPosts(data || []);
      }

      setLoading(false);
    };

    void loadPublishedPosts();
  }, [toast]);

  const mappedItems = useMemo(
    () =>
      posts.map((post, index) => ({
        category: post.category,
        title: post.title,
        excerpt: post.excerpt || "சுருக்கம் இல்லை",
        time: formatTimeAgoTa(post.published_at || post.created_at),
        views: "—",
        imageUrl: post.cover_image_url || (index === 0 ? strayDogs : undefined),
      })),
    [posts],
  );

  const featured = mappedItems.slice(0, 2);
  const sidebar = mappedItems.slice(2);

  return (
    <section id="latest" className="container py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-primary" />
        <h2 className="font-heading text-3xl uppercase">சமீபத்திய செய்திகள்</h2>
      </div>

      {loading ? (
        <div className="border border-border bg-card p-6 text-muted-foreground text-sm">செய்திகள் ஏற்றப்படுகிறது...</div>
      ) : mappedItems.length === 0 ? (
        <div className="border border-border bg-card p-6 text-muted-foreground text-sm">வெளியிடப்பட்ட செய்திகள் இன்னும் இல்லை.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((item, i) => (
              <NewsCard key={i} {...item} featured />
            ))}
          </div>

          <div className="bg-card border border-border p-4">
            <h3 className="font-heading uppercase text-sm tracking-wider text-primary mb-2 border-b border-border pb-2">மேலும் செய்திகள்</h3>
            {sidebar.map((item, i) => (
              <NewsCard key={i} {...item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default LatestNews;
