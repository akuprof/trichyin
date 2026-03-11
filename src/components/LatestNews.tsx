import NewsCard from "./NewsCard";
import strayDogs from "@/assets/stray-dogs-uraiyur.png";

const newsItems = [
  {
    category: "குடிமை",
    title: "உறையூர் தெருநாய் அச்சுறுத்தல்: உடனடி நடவடிக்கை கோரி குடியிருப்போர் வலியுறுத்தல்",
    excerpt: "மீண்டும் மீண்டும் நடக்கும் தாக்குதல்களுக்கு மத்தியிலும் மாநகராட்சி பதில் தாமதமாகிறது என மக்கள் குற்றச்சாட்டு எழுப்புகின்றனர்.",
    time: "3 மணி நேரம் முன்பு",
    views: "2.3K",
    imageUrl: strayDogs,
  },
  {
    category: "அரசியல்",
    title: "வார்டு நிலை பட்ஜெட் விவாதம்: வெளிப்படைத் தன்மை குறித்து கேள்விகள்",
    excerpt: "செலவுத்திட்ட விவரங்களும் திட்ட கால அட்டவணையும் தெளிவாக வெளியிட வேண்டும் என குடிமக்கள் கோரிக்கை வைத்தனர்.",
    time: "5 மணி நேரம் முன்பு",
    views: "1.8K",
  },
  {
    category: "வைரல்",
    title: "பேருந்து நிலைய தெரு பேட்டி இணையத்தில் வேகமாக பரவி வருகிறது",
    excerpt: "திருச்சி புதிய பேருந்து நிலையத்தில் பதிவான இளைஞர் குரல்கள் சமூக வலைதளங்களில் கவனம் ஈர்த்துள்ளன.",
    time: "8 மணி நேரம் முன்பு",
    views: "4.7K",
  },
  {
    category: "வணிகம்",
    title: "உள்ளூர் நெசவு தொழில் ஏற்றுமதியில் இந்த காலாண்டில் முன்னேற்றம்",
    excerpt: "பிராந்திய தேவைகள் உயர்வால் சிறு உற்பத்தியாளர்களுக்கு புதிய ஆர்டர்கள் அதிகரித்துள்ளன.",
    time: "1 நாள் முன்பு",
    views: "1.2K",
  },
  {
    category: "குடிமை",
    title: "மழைக்கால வடிகால் பணிகள் தாழ்வான பகுதிகளில் தொடக்கம்",
    excerpt: "அபாயப்பகுதிகளில் கட்டம் கட்டமாக சீரமைப்பு மற்றும் கழிவு அகற்றும் பணிகளை மாநகராட்சி தொடங்கியுள்ளது.",
    time: "1 நாள் முன்பு",
    views: "980",
  },
  {
    category: "அரசியல்",
    title: "தண்ணீர் புகார் நிலவர வரைபடம் அதிகாரிகளிடம் சமர்ப்பிப்பு",
    excerpt: "பிரச்சனைகள் விரைவில் தீர வேண்டும் என குடிமக்கள் தன்னார்வ குழுக்கள் ஒருங்கிணைந்த அறிக்கையை வழங்கின.",
    time: "2 நாட்கள் முன்பு",
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
        <h2 className="font-heading text-3xl uppercase">சமீபத்திய செய்திகள்</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {featured.map((item, i) => (
            <NewsCard key={i} {...item} featured />
          ))}
        </div>

        <div className="bg-card border border-border p-4">
          <h3 className="font-heading uppercase text-sm tracking-wider text-primary mb-2 border-b border-border pb-2">மேலும் செய்திகள்</h3>
          {sidebar.map((item, i) => (
            <NewsCard key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestNews;
