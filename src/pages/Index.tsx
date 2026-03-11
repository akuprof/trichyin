import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LatestNews from "@/components/LatestNews";
import CategorySection from "@/components/CategorySection";
import RateCard from "@/components/RateCard";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <LatestNews />
      <CategorySection />
      <RateCard />
      <Footer />
    </div>
  );
};

export default Index;
