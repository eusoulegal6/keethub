import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Ensure Lovable Auth initializes and processes OAuth callback params in the URL.
// createLovableAuth() runs at module init and exchanges the callback code for
// tokens, which Supabase then picks up.
import "@/integrations/lovable/index";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      if (event === "SIGNED_IN" || session) {
        navigate({ to: "/hub", replace: true });
      }
    });

    let attempts = 0;
    let pollTimer: ReturnType<typeof setTimeout>;

    const poll = () => {
      if (!mountedRef.current) return;
      supabase.auth.getSession().then(({ data }) => {
        if (!mountedRef.current) return;
        if (data.session) {
          navigate({ to: "/hub", replace: true });
          return;
        }
        attempts++;
        if (attempts < 30) {
          pollTimer = setTimeout(poll, 300);
        } else {
          navigate({ to: "/auth", replace: true });
        }
      });
    };

    // Brief initial delay to let Lovable Auth process callback params
    pollTimer = setTimeout(poll, 200);

    return () => {
      mountedRef.current = false;
      clearTimeout(pollTimer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
      Signing you in…
    </div>
  );
}
