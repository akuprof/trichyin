import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminAIAssistantProps {
  sourceUrl: string;
  sourceText: string;
  generating: boolean;
  onSourceUrlChange: (value: string) => void;
  onSourceTextChange: (value: string) => void;
  onGenerate: () => void;
}

const AdminAIAssistant = ({
  sourceUrl,
  sourceText,
  generating,
  onSourceUrlChange,
  onSourceTextChange,
  onGenerate,
}: AdminAIAssistantProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> AI News Generator
        </CardTitle>
        <CardDescription>
          URL அல்லது முக்கிய குறிப்புகள் கொடுக்கவும் — AI மனிதர் எழுதுவது போல article draft செய்து form-ஐ auto-fill செய்யும்.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-url">Source URL (Optional)</Label>
          <Input
            id="ai-url"
            placeholder="https://example.com/news-story"
            value={sourceUrl}
            onChange={(e) => onSourceUrlChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-text">News Notes / Raw Input</Label>
          <Textarea
            id="ai-text"
            rows={4}
            placeholder="விரைவான குறிப்புகள், facts, quote, location, event details..."
            value={sourceText}
            onChange={(e) => onSourceTextChange(e.target.value)}
          />
        </div>

        <Button type="button" onClick={onGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 
          {generating ? "AI உருவாக்குகிறது..." : "AI Generate / Regenerate"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminAIAssistant;
