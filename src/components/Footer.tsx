import { Mail, Phone, MapPin, Youtube, Instagram, Facebook, Globe } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Trichy Insight" className="h-12 w-auto" />
              <span className="font-heading text-xl uppercase font-bold">
                Trichy <span className="text-primary">Insight</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              சொல்லப்படாததை சொல்லுவோம்.<br />
              கேட்கப்படாததை கேட்போம்.<br />
              இது Trichy Insight.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://www.youtube.com/trichyinsight/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="https://www.instagram.com/trichyinsight/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://www.facebook.com/trichyinsight/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://www.trichyinsight.online/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-heading uppercase text-sm tracking-wider mb-4 text-primary">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#latest" className="hover:text-primary transition-colors">Latest News</a></li>
              <li><a href="#civic" className="hover:text-primary transition-colors">Civic Issues</a></li>
              <li><a href="#political" className="hover:text-primary transition-colors">Political Analysis</a></li>
              <li><a href="#viral" className="hover:text-primary transition-colors">Viral Content</a></li>
              <li><a href="#advertise" className="hover:text-primary transition-colors">Advertise With Us</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading uppercase text-sm tracking-wider mb-4 text-primary">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                Tiruchirappalli, Tamil Nadu
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                contact@trichyinsight.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                +91 98765 43210
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-muted-foreground/20">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          © 2026 Trichy Insight. All rights reserved. | Digital Investigative Media – Tiruchirappalli
        </div>
      </div>
    </footer>
  );
};

export default Footer;
