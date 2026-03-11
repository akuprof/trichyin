import { Building, Landmark, Flame, Store, ArrowRight } from "lucide-react";

const categories = [
  {
    icon: Building,
    title: "குடிமை பிரச்சனைகள்",
    id: "civic",
    description: "சாலை நிலை, தண்ணீர் விநியோகம், உட்கட்டமைப்பு குறைபாடுகள் — தரை மட்ட விசாரணை அறிக்கைகள்.",
    count: "24 அறிக்கைகள்",
  },
  {
    icon: Landmark,
    title: "அரசியல் பகுப்பாய்வு",
    id: "political",
    description: "உண்மைச் சரிபார்ப்பு, அறிக்கை ஆய்வு, தேர்தல் செய்தி — ஆழமான விசாரணையுடன்.",
    count: "18 அறிக்கைகள்",
  },
  {
    icon: Flame,
    title: "வைரல்",
    id: "viral",
    description: "டிரெண்டாகும் கதைகள், தெரு எதிர்வினைகள், இளைஞர் துடிப்பு — திருச்சி அதிகம் பகிரும் உள்ளடக்கம்.",
    count: "32 வீடியோக்கள்",
  },
  {
    icon: Store,
    title: "வணிக சிறப்புப் பதிவு",
    id: "business",
    description: "திருச்சிக்கான உள்ளூர் வணிகக் கதைகள், சந்தை பார்வைகள் மற்றும் பொருளாதார ஆய்வுகள்.",
    count: "12 சிறப்புகள்",
  },
];

const CategorySection = () => {
  return (
    <section className="bg-secondary text-secondary-foreground py-16">
      <div className="container">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-primary" />
          <h2 className="font-heading text-3xl uppercase">எங்கள் செய்தி கவனம்</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <a key={cat.id} href={`#${cat.id}`} className="group border border-muted-foreground/20 p-6 hover:border-primary transition-all bg-secondary">
              <cat.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-heading text-xl uppercase mb-2">{cat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{cat.description}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-muted-foreground/20">
                <span className="text-xs text-muted-foreground">{cat.count}</span>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
