import { Clock, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface NewsCardProps {
  category: string;
  title: string;
  excerpt: string;
  time: string;
  views: string;
  featured?: boolean;
  link?: string;
  imageUrl?: string;
}

const NewsCard = ({ category, title, excerpt, time, views, featured, link, imageUrl }: NewsCardProps) => {
  const Wrapper = link ? Link : "div";
  const wrapperProps = link ? { to: link } : {};

  if (featured) {
    return (
      <Wrapper {...(wrapperProps as any)} className="block">
        <article className="group cursor-pointer bg-card border border-border hover:border-primary/50 transition-all">
          <div className="aspect-video bg-secondary relative overflow-hidden">
            {imageUrl && <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="bg-primary text-primary-foreground px-2 py-0.5 text-xs font-heading uppercase tracking-wider font-bold">
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
          {imageUrl && <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />}
          <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground px-1 py-0.5 text-[10px] font-heading uppercase tracking-wider font-bold">
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
