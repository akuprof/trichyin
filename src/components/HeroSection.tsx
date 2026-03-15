import heroBanner from "@/assets/hero-banner.jpg";
import { Play, TrendingUp } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <img src={heroBanner} alt="திருச்சி இன்சைட் டிஜிட்டல் செய்திகள்" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/70 to-transparent" />

      <div className="relative container h-full flex flex-col justify-end pb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-heading uppercase tracking-widest font-bold">
            விசாரணை சிறப்பறிக்கை
          </span>
          <span className="text-news-highlight text-xs font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> டிரெண்டிங்
          </span>
        </div>

        <h2 className="text-secondary-foreground font-heading text-4xl md:text-6xl leading-none max-w-3xl uppercase">
          சாமானியனின் குரல் – உண்மையின் வெளிச்சம்
        </h2>

        <p className="text-muted-foreground mt-4 max-w-3xl text-lg leading-relaxed">
          உங்கள் பகுதியில் நடைபெறும் அநீதி, ஊழல் அல்லது சட்டவிரோத செயல்கள் குறித்து ஆதாரத்துடன் எங்களுக்கு தகவல் அனுப்புங்கள்.
        </p>
        <div className="text-muted-foreground mt-3 max-w-3xl space-y-1 text-sm md:text-base">
          <p>✔ தகவல்கள் முழுமையாக சரிபார்க்கப்பட்ட பிறகே செய்தியாக வெளியிடப்படும்.</p>
          <p>✔ தகவல் அளிப்பவரின் பெயர் மற்றும் தொடர்பு விபரங்கள் ரகசியமாக பாதுகாக்கப்படும்.</p>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 font-heading uppercase tracking-wider text-sm font-bold flex items-center gap-2 transition-colors">
            <Play className="h-4 w-4" /> சமீபத்தியதை பார்க்க
          </button>
          <button className="border border-muted-foreground/30 text-secondary-foreground hover:border-primary px-6 py-3 font-heading uppercase tracking-wider text-sm font-bold transition-colors">
            பதிவு செய்ய
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
