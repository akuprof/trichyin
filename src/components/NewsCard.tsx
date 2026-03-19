import { Clock, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface NewsCardProps {
  category: string;
  title: string;
  excerpt: string;
  time: string;
  views: string;
  featured?: boolean;
  link?: string;
  imageUrl?: string;
  videoUrl?: string;
}

const NewsCard = ({ category, title, excerpt, time, views, featured, link, imageUrl, videoUrl }: NewsCardProps) => {
  const Wrapper = link ? Link : "div";
  const wrapperProps = link ? { to: link } : {};
  const hasVideo = Boolean(videoUrl);

  if (featured) {
    return (
      <Wrapper {...(wrapperProps as any)} className="block">
        <article className="group cursor-pointer bg-card border border-border hover:border-primary/50 transition-all">
          <div className="aspect-video bg-secondary relative overflow-hidden">
            {hasVideo ? (
              <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              imageUrl && <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            {(hasVideo || imageUrl) && (
              <img
                src={logo}
                alt="Copyright watermark"
                className="absolute bottom-2 right-2 w-14 h-auto pointer-events-none select-none"
                style={{ opacity: 0.15 }}
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="inline-block max-w-[85%] truncate rounded bg-primary/95 px-2 py-0.5 text-xs font-heading font-bold uppercase tracking-wider text-primary-foreground" title={category}>
                {category}
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-heading text-xl uppercase leading-tight group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{excerpt}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {time}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {views}
              </span>
            </div>
          </div>
        </article>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...(wrapperProps as any)} className="block">
      <article className="group cursor-pointer flex gap-4 py-4 border-b border-border last:border-0 hover:bg-muted/50 px-2 transition-colors">
        <div className="w-24 h-16 bg-secondary shrink-0 relative overflow-hidden">
          {hasVideo ? (
            <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            imageUrl && <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          )}
          {(hasVideo || imageUrl) && (
            <img
              src={logo}
              alt="Copyright watermark"
              className="absolute bottom-1 right-1 w-6 h-auto pointer-events-none select-none"
              style={{ opacity: 0.15 }}
              loading="lazy"
            />
          )}
          <span
            className="absolute top-1 left-1 inline-block max-w-[90%] truncate rounded bg-primary/95 px-1 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider text-primary-foreground"
            title={category}
          >
            {category}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-sm uppercase leading-tight group-hover:text-primary transition-colors line-clamp-2">{title}</h4>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {time}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {views}
            </span>
          </div>
        </div>
      </article>
    </Wrapper>
  );
};

export default NewsCard;
