import NewsCard from "./NewsCard";
import strayDogs from "@/assets/stray-dogs-uraiyur.png";

const newsItems = [
  {
    category: "Civic",
    title: "Uraiyur Stray Dog Threat Leaves Residents Demanding Urgent Action",
    excerpt: "Residents allege delayed municipal response while repeated attacks raise safety concerns in Uraiyur streets.",
    time: "3 hours ago",
    views: "2.3K",
    imageUrl: strayDogs,
  },
  {
    category: "Political",
    title: "Ward-level Budget Debate Sparks Transparency Questions",
    excerpt: "Council discussions highlight citizen requests for clearer spending data and project timelines.",
    time: "5 hours ago",
    views: "1.8K",
  },
  {
    category: "Viral",
    title: "Bus Stand Street Interview Gains Momentum Online",
    excerpt: "Youth voices from Trichy’s new bus stand dominate social feeds after candid civic interview clips.",
    time: "8 hours ago",
    views: "4.7K",
  },
  {
    category: "Business",
    title: "Local Textile Cluster Sees Export Uptick This Quarter",
    excerpt: "Small manufacturers report stronger order books amid renewed regional demand.",
    time: "1 day ago",
    views: "1.2K",
  },
  {
    category: "Civic",
    title: "Monsoon Drain Works Begin in Key Low-Lying Areas",
    excerpt: "Corporation teams begin phased desilting and drain restoration across vulnerable neighborhoods.",
    time: "1 day ago",
    views: "980",
  },
  {
    category: "Political",
    title: "Ground Survey on Water Complaints Submitted to Officials",
    excerpt: "Citizen volunteers submit compiled issue maps requesting faster resolution timelines.",
    time: "2 days ago",
    views: "860",
  },
];

const LatestNews = () => {
  const featured = newsItems.slice(0, 2);
  const sidebar = newsItems.slice(2);

  return (
    <section id="latest" className="container py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-primary" />
        <h2 className="font-heading text-3xl uppercase">Latest News</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {featured.map((item, i) => (
            <NewsCard key={i} {...item} featured />
          ))}
        </div>

        <div className="bg-card border border-border p-4">
          <h3 className="font-heading uppercase text-sm tracking-wider text-primary mb-2 border-b border-border pb-2">More Stories</h3>
          {sidebar.map((item, i) => (
            <NewsCard key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestNews;
