import { useLocation } from "react-router-dom";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

interface HeaderProps {
  autoRefresh: boolean;
  onAutoRefreshToggle: (enabled: boolean) => void;
  lastUpdated: Date;
}

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/sessions": "Sessions",
  "/projects": "Projects",
};

export function Header({
  autoRefresh,
  onAutoRefreshToggle,
  lastUpdated,
}: HeaderProps) {
  const location = useLocation();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    check();
    const timer = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const title =
    titles[location.pathname] ||
    (location.pathname.startsWith("/sessions/") ? "Session Detail" : "");

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <div className="md:hidden w-10" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              <span className="hidden sm:inline">Disconnected</span>
            </>
          )}
        </div>

        {/* Auto-refresh toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAutoRefreshToggle(!autoRefresh)}
          className={cn(
            "gap-1.5 text-xs",
            autoRefresh ? "text-emerald-500" : "text-muted-foreground"
          )}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", autoRefresh && "animate-spin")}
            style={autoRefresh ? { animationDuration: "3s" } : undefined}
          />
          <span className="hidden sm:inline">
            {autoRefresh ? "Live" : "Paused"}
          </span>
        </Button>

        <span className="text-xs text-muted-foreground hidden lg:inline">
          {lastUpdated.toLocaleTimeString()}
        </span>
      </div>
    </header>
  );
}
