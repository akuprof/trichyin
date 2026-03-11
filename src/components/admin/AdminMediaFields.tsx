import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminMediaFieldsProps {
  userId: string;
  imageUrl: string;
  videoUrl: string;
  onImageUrlChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
}

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "");

const AdminMediaFields = ({ userId, imageUrl, videoUrl, onImageUrlChange, onVideoUrlChange }: AdminMediaFieldsProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "படம் மட்டும் upload செய்யவும்", variant: "destructive" });
      return;
    }

    setUploading(true);

    const safeName = sanitizeFileName(file.name) || `media-${Date.now()}.jpg`;
    const filePath = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("news-media").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      toast({ title: "Image upload தோல்வி", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("news-media").getPublicUrl(filePath);
    onImageUrlChange(publicData.publicUrl);
    toast({ title: "படம் upload ஆனது" });
    setUploading(false);
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cover">Cover Image URL</Label>
        <Input id="cover" value={imageUrl} onChange={(e) => onImageUrlChange(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-upload">Image Upload</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="max-w-sm" />
          <Button type="button" variant="secondary" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          placeholder="https://.../clip.mp4 அல்லது embed URL"
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">ஒவ்வொரு செய்திக்கும் image அல்லது video அவசியம்.</p>
    </div>
  );
};

export default AdminMediaFields;
