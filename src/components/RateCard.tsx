import { Check, Phone, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const packages = [
  {
    name: "கடை விளம்பரம்",
    price: "₹3,000",
    period: "/மாதம்",
    features: ["வீடியோ பிரமோஷன்", "சமூக ஊடக பதிவு", "சேனல் குறிப்பிடல்", "1 மாத காட்சிப்படுத்தல்"],
    highlight: false,
  },
  {
    name: "நேர்காணல் பேக்கேஜ்",
    price: "₹5,000",
    period: "/வீடியோ",
    features: ["தொழில்முறை நேர்காணல்", "YouTube வெளியீடு", "சமூக ஊடக பிரமோஷன்", "நிரந்தர பட்டியல்"],
    highlight: true,
  },
  {
    name: "நிகழ்வு கவரேஜ்",
    price: "₹10,000",
    period: "முதல்",
    features: ["முழு நிகழ்வு செய்திக்கவனம்", "பல தள வெளியீடு", "ஹைலைட் ரீல்", "லைவ் ஸ்ட்ரீமிங் விருப்பம்"],
    highlight: false,
  },
  {
    name: "டிஜிட்டல் பண்டில்",
    price: "₹20,000",
    period: "/மாதம்",
    features: ["முழுமையான காட்சியளிப்பு", "இணையதள பேனர்", "வீடியோ + சமூக ஊடகம்", "முன்னுரிமை கவனம்", "அனலிட்டிக்ஸ் அறிக்கை"],
    highlight: false,
  },
];

const PHONE = "9600210429";

const RateCard = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", business: "", package: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.business.trim()) {
      toast({ title: "தகவல் தேவை", description: "பெயர், தொலைபேசி எண், மற்றும் வணிகப் பெயர் அவசியம்.", variant: "destructive" });
      return;
    }

    const text = encodeURIComponent(
      `வணக்கம் Trichy Insight!\n\nபெயர்: ${form.name.trim()}\nதொலைபேசி: ${form.phone.trim()}\nவணிகம்: ${form.business.trim()}\nபேக்கேஜ்: ${form.package || "குறிப்பிடவில்லை"}\nசெய்தி: ${form.message.trim() || "—"}`,
    );
    window.open(`https://wa.me/91${PHONE}?text=${text}`, "_blank");
    toast({ title: "WhatsApp திறக்கப்பட்டது!", description: "உங்கள் விவரங்கள் WhatsApp வழியாக அனுப்பப்படும்." });
    setForm({ name: "", phone: "", business: "", package: "", message: "" });
  };

  return (
    <section id="advertise" className="container py-16">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-0.5 bg-primary" />
          <span className="font-heading text-sm uppercase tracking-widest text-primary">எங்களுடன் விளம்பரம் செய்யுங்கள்</span>
          <div className="w-12 h-0.5 bg-primary" />
        </div>
        <h2 className="font-heading text-4xl uppercase">விளம்பர கட்டண அட்டை</h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          திருச்சி வணிகங்களுக்கு மலிவு டிஜிட்டல் காட்சியளிப்பு. ஆயிரக்கணக்கான உள்ளூர் பார்வையாளர்களை எளிதில் அடையுங்கள்.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.name} className={`border p-6 flex flex-col ${pkg.highlight ? "border-primary bg-primary/5 relative" : "border-border bg-card"}`}>
            {pkg.highlight && (
              <span className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-heading uppercase tracking-wider font-bold">
                அதிகம் தேர்வு செய்யப்பட்டது
              </span>
            )}
            <h3 className="font-heading text-lg uppercase">{pkg.name}</h3>
            <div className="mt-3 mb-4">
              <span className="text-3xl font-heading font-bold">{pkg.price}</span>
              <span className="text-muted-foreground text-sm">{pkg.period}</span>
            </div>
            <ul className="space-y-2 flex-1">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setForm((prev) => ({ ...prev, package: pkg.name }))}
              className={`mt-6 py-2.5 font-heading uppercase tracking-wider text-sm font-bold transition-colors ${pkg.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              தொடங்குங்கள்
            </button>
          </div>
        ))}
      </div>

      <div id="contact" className="mt-16 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5 bg-primary" />
            <span className="font-heading text-sm uppercase tracking-widest text-primary">தொடர்புகொள்ள</span>
            <div className="w-12 h-0.5 bg-primary" />
          </div>
          <h3 className="font-heading text-3xl uppercase">விளம்பரம் செய்ய தொடர்புகொள்ளுங்கள்</h3>
          <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
            <Phone className="h-4 w-4 text-primary" />
            <a href={`tel:+91${PHONE}`} className="hover:text-primary transition-colors font-medium">+91 {PHONE}</a>
            <span className="mx-1">|</span>
            <MessageCircle className="h-4 w-4 text-primary" />
            <a href={`https://wa.me/91${PHONE}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">
              WhatsApp
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">பெயர் *</label>
              <Input placeholder="உங்கள் பெயர்" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">தொலைபேசி எண் *</label>
              <Input placeholder="98765 43210" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={15} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">வணிகப் பெயர் *</label>
              <Input placeholder="உங்கள் வணிகப் பெயர்" value={form.business} onChange={(e) => setForm((p) => ({ ...p, business: e.target.value }))} maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">பேக்கேஜ்</label>
              <select
                value={form.package}
                onChange={(e) => setForm((p) => ({ ...p, package: e.target.value }))}
                className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">தேர்வு செய்யவும்</option>
                {packages.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} — {p.price}{p.period}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">செய்தி</label>
            <Textarea
              placeholder="உங்கள் தேவைகளை இங்கே எழுதுங்கள்..."
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full font-heading uppercase tracking-wider">
            <Send className="h-4 w-4 mr-2" />
            WhatsApp வழியாக அனுப்பு
          </Button>
        </form>
      </div>
    </section>
  );
};

export default RateCard;
