import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ConfigResponse = {
  enabled?: boolean;
  tokenConfigured?: boolean;
  tokenHint?: string | null;
  updatedAt?: string | null;
  token?: string;
};

const AdminCustomGptPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [tokenName, setTokenName] = useState("main");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigResponse>({});

  const endpoint = useMemo(() => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-gpt-publish-article`, []);

  const loadStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-custom-gpt-config", {
      body: { action: "status" },
    });

    if (error) {
      toast({ title: "Custom GPT status load failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setConfig((data || {}) as ConfigResponse);
    setLoading(false);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const rotateToken = async () => {
    setRotating(true);
    const { data, error } = await supabase.functions.invoke("admin-custom-gpt-config", {
      body: { action: "rotate", name: tokenName.trim() || "main" },
    });

    if (error) {
      toast({ title: "Token rotation failed", description: error.message, variant: "destructive" });
      setRotating(false);
      return;
    }

    const payload = (data || {}) as ConfigResponse;
    setConfig(payload);
    setNewToken(payload.token || null);
    toast({ title: "Custom GPT token regenerated" });
    setRotating(false);
  };

  const disableToken = async () => {
    setRotating(true);
    const { data, error } = await supabase.functions.invoke("admin-custom-gpt-config", {
      body: { action: "disable" },
    });

    if (error) {
      toast({ title: "Disable failed", description: error.message, variant: "destructive" });
      setRotating(false);
      return;
    }

    setConfig((data || {}) as ConfigResponse);
    setNewToken(null);
    toast({ title: "Custom GPT publish disabled" });
    setRotating(false);
  };

  const copyValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl uppercase">Custom GPT Integration</CardTitle>
        <CardDescription>Custom GPT-இலிருந்து நேரடியாக article publish செய்ய secure token setup.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={loadStatus} disabled={loading || rotating}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh Status
          </Button>
          <p className="text-sm text-muted-foreground">
            {config.tokenConfigured ? `Configured (${config.tokenHint || "token"})` : "Not configured"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-gpt-token-name">Token Label</Label>
          <Input
            id="custom-gpt-token-name"
            value={tokenName}
            onChange={(event) => setTokenName(event.target.value)}
            placeholder="main"
            disabled={rotating}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={rotateToken} disabled={rotating || loading}>
            {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate / Rotate Token
          </Button>
          <Button type="button" variant="secondary" onClick={disableToken} disabled={rotating || loading || !config.tokenConfigured}>
            Disable
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Publish Endpoint</Label>
          <div className="flex gap-2">
            <Input readOnly value={endpoint} />
            <Button type="button" variant="outline" onClick={() => copyValue(endpoint, "Endpoint")}> 
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {newToken ? (
          <div className="space-y-2">
            <Label>New Token (showing once)</Label>
            <div className="flex gap-2">
              <Input readOnly value={newToken} />
              <Button type="button" variant="outline" onClick={() => copyValue(newToken, "Token")}> 
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">இந்த token மறுபடியும் காட்டப்படாது. உடனே Custom GPT action header-ல் சேமிக்கவும்.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AdminCustomGptPanel;