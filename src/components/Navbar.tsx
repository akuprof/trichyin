import { useState } from "react";
import { MapPin, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { label: "சமீபத்திய செய்திகள்", href: "#latest" },
  { label: "குடிமை பிரச்சனைகள்", href: "#civic" },
  { label: "அரசியல்", href: "#political" },
  { label: "வைரல்", href: "#viral" },
  { label: "வணிகம்", href: "#business" },
  { label: "விளம்பரம்", href: "#advertise" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({ title: "வெற்றிகரமாக வெளியேறினீர்கள்" });
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground">
      <div className="bg-primary text-primary-foreground py-1 overflow-hidden">
        <div className="flex items-center gap-3 px-4">
          <span className="breaking-pulse font-heading text-sm font-bold uppercase tracking-wider shrink-0">● அவசர செய்தி</span>
          <div className="overflow-hidden whitespace-nowrap">
            <span className="news-ticker inline-block text-sm">
              திருச்சி மாநகராட்சி சாலை பணிகள் தொடக்கம் &nbsp;|&nbsp; புதிய பேருந்து நிலையம் திறப்பு விழா &nbsp;|&nbsp; தண்ணீர் பிரச்சனை: மக்கள் போராட்டம் &nbsp;|&nbsp; உள்ளாட்சி தேர்தல் அறிவிப்பு எதிர்பார்ப்பு
            </span>
          </div>
        </div>
      </div>

      <nav className="container flex items-center justify-between py-3 gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="திருச்சி இன்சைட்" className="h-10 w-auto" />
          <div>
            <h1 className="font-heading text-xl font-bold leading-none tracking-wide uppercase">
              Trichy <span className="text-primary">Insight</span>
            </h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">உள்ளூர் செய்தி தளம்</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-heading uppercase tracking-wider">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-primary transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>திருச்சிராப்பள்ளி</span>
          </div>
          {user ? (
            <button onClick={handleLogout} className="text-primary hover:text-primary/80 transition-colors font-medium">
              வெளியேறு
            </button>
          ) : (
            <Link to="/auth" className="text-primary hover:text-primary/80 transition-colors font-medium">
              உள்நுழைவு
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 hover:text-primary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="மெனு மாற்று"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-muted-foreground/20 bg-secondary">
          <div className="container py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-heading uppercase tracking-wider text-sm py-2 border-b border-muted-foreground/10 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-2 text-muted-foreground text-xs pt-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>திருச்சிராப்பள்ளி</span>
            </div>
            {user ? (
              <button
                onClick={handleLogout}
                className="font-heading uppercase tracking-wider text-sm py-2 border-t border-muted-foreground/10 text-primary text-left"
              >
                வெளியேறு
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="font-heading uppercase tracking-wider text-sm py-2 border-t border-muted-foreground/10 text-primary"
              >
                உள்நுழைவு
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
