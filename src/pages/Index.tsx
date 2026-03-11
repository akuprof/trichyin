import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LatestNews from "@/components/LatestNews";
import CategorySection from "@/components/CategorySection";
import RateCard from "@/components/RateCard";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const Index = () => {
  const { user } = useAuth();

  useEffect(() => {
    const trackView = async () => {
      await supabase.from("page_view_events").insert({
        path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
        viewer_id: user?.id ?? null,
      });
    };

    void trackView();
  }, [user?.id]);

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
