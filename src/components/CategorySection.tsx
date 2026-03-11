import { Building, Landmark, Flame, Store, ArrowRight } from "lucide-react";

const categories = [
  {
    icon: Building,
    title: "Civic Issues",
    id: "civic",
    description: "Road conditions, water supply, infrastructure failures — ground-level investigative reports.",
    count: "24 Reports",
  },
  {
    icon: Landmark,
    title: "Political Analysis",
    id: "political",
    description: "Fact-checks, statement analysis, election coverage with investigative depth.",
    count: "18 Reports",
  },
  {
    icon: Flame,
    title: "Viral",
    id: "viral",
    description: "Trending stories, street reactions, youth pulse — the content Trichy shares most.",
    count: "32 Videos",
  },
  {
    icon: Store,
    title: "Business Spotlight",
    id: "business",
    description: "Local business features, market insights, and economic analysis for Trichy.",
    count: "12 Features",
  },
];

const CategorySection = () => {
  return (
    <section className="bg-secondary text-secondary-foreground py-16">
      <div className="container">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-primary" />
          <h2 className="font-heading text-3xl uppercase">Our Coverage</h2>
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
