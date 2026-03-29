import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MigrationStatusResponse = {
  connected?: boolean;
  news_posts_count?: number;
  message?: string;
};

type ImportResponse = {
  inserted?: number;
  skipped?: number;
  errors?: string[];
};

interface AdminMigrationPanelProps {
  onImported: () => Promise<void>;
}

const parseArticlesPayload = (raw: string) => {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { articles?: unknown[] }).articles)) {
    return (parsed as { articles: unknown[] }).articles;
  }
  throw new Error("JSON array அல்லது { articles: [] } format மட்டும் அனுமதி.");
};

const AdminMigrationPanel = ({ onImported }: AdminMigrationPanelProps) => {
  const { toast } = useToast();
  const [statusLoading, setStatusLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [statusText, setStatusText] = useState("Connection check run செய்யவும்.");
  const [articlesJson, setArticlesJson] = useState("");

  const handleCheckConnection = async () => {
    setStatusLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-migration-status", {
      body: {},
    });

    if (error) {
      setStatusText(`❌ Connection failed: ${error.message}`);
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
      setStatusLoading(false);
      return;
    }

    const payload = (data || {}) as MigrationStatusResponse;
    const connectedText = payload.connected ? "✅ Connected" : "❌ Not connected";
    const totalText = typeof payload.news_posts_count === "number" ? ` | Total articles: ${payload.news_posts_count}` : "";
    setStatusText(`${connectedText}${totalText}`);
    toast({ title: "Connection check complete" });
    setStatusLoading(false);
  };

  const handleImport = async () => {
    if (!articlesJson.trim()) {
      toast({ title: "JSON தேவை", description: "Articles JSON paste செய்யவும்.", variant: "destructive" });
      return;
    }

    let articles: unknown[] = [];
    try {
      articles = parseArticlesPayload(articlesJson.trim());
    } catch (error) {
      toast({ title: "Invalid JSON", description: error instanceof Error ? error.message : "JSON parse failed", variant: "destructive" });
      return;
    }

    setImportLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-import-articles", {
      body: { articles },
    });

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      setImportLoading(false);
      return;
    }

    const payload = (data || {}) as ImportResponse;
    toast({
      title: "Import complete",
      description: `Inserted: ${payload.inserted || 0}, Skipped: ${payload.skipped || 0}`,
      variant: (payload.errors?.length || 0) > 0 ? "destructive" : "default",
    });

    if ((payload.errors?.length || 0) > 0) {
      setStatusText(`⚠️ ${payload.errors!.length} row(s) failed. முதல் பிழை: ${payload.errors![0]}`);
    }

    await onImported();
    setImportLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl uppercase">Migration Panel</CardTitle>
        <CardDescription>Database connection check + bulk article import (JSON).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleCheckConnection} disabled={statusLoading || importLoading}>
            {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Check Database Connection
          </Button>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="articles-json-import">Articles JSON</Label>
          <Textarea
            id="articles-json-import"
            rows={10}
            value={articlesJson}
            onChange={(event) => setArticlesJson(event.target.value)}
            placeholder='[{"title":"...","content":"...","category":"...","cover_image_url":"https://..."}]'
            disabled={importLoading}
          />
        </div>

        <Button type="button" onClick={handleImport} disabled={importLoading || statusLoading}>
          {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {importLoading ? "Importing..." : "Import Articles"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminMigrationPanel;