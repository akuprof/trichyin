import heroBanner from "@/assets/hero-banner.jpg";
import { Play, TrendingUp } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <img src={heroBanner} alt="Trichy Insight - Digital News" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/70 to-transparent" />

      <div className="relative container h-full flex flex-col justify-end pb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-heading uppercase tracking-widest font-bold">
            Investigative Report
          </span>
          <span className="text-news-highlight text-xs font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Trending
          </span>
        </div>

        <h2 className="text-secondary-foreground font-heading text-4xl md:text-6xl leading-none max-w-3xl uppercase">
          உண்மையை நேராக கேட்கும் திருச்சி டிஜிட்டல் குரல்
        </h2>

        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          Investigative tone. Youth speed. Analytical clarity. Your city's digital voice for truth.
        </p>

        <div className="flex items-center gap-4 mt-6">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 font-heading uppercase tracking-wider text-sm font-bold flex items-center gap-2 transition-colors">
            <Play className="h-4 w-4" /> Watch Latest
          </button>
          <button className="border border-muted-foreground/30 text-secondary-foreground hover:border-primary px-6 py-3 font-heading uppercase tracking-wider text-sm font-bold transition-colors">
            Subscribe
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
