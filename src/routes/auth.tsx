import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Crown,
  Sparkles,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - PrimKeet" },
      {
        name: "description",
        content:
          "Sign in or create your PrimKeet account to play English games and grow your skills.",
      },
      { property: "og:title", content: "Sign in - PrimKeet" },
      { property: "og:description", content: "Sign in or create a PrimKeet account." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

const signUpSchema = signInSchema.extend({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(24)
    .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscores"),
});

const authInputClass =
  "h-[3.25rem] rounded-[1rem] border-[#DCE4F2] bg-white px-4 text-[0.95rem] font-semibold text-[#10204A] shadow-[inset_0_1px_0_rgba(16,32,74,0.03)] placeholder:text-[#98A2B3] focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const primaryButtonClass =
  "h-[3.25rem] rounded-[1rem] bg-[linear-gradient(100deg,#FF3B8D,#A653ED)] text-base font-black text-white shadow-[0_18px_34px_rgba(255,59,141,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(166,83,237,0.28)] focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const googleButtonClass =
  "h-[3.25rem] rounded-[1rem] border-[#DCE4F2] bg-white text-base font-black text-[#24324F] shadow-[0_10px_24px_rgba(16,32,74,0.06)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F8FAFF] focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type AuthMode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/hub", replace: true });
    });
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth/callback",
    });

    if (result.error) {
      setIsGoogleLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBFDFF] text-[#10204A]">
      <AuthMotionStyles />
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <img
            src="/primkeet-logo.png"
            alt="PrimKeet"
            width={176}
            height={60}
            className="h-14 w-auto rounded-lg bg-white/80 object-contain p-1.5 shadow-[0_16px_36px_rgba(49,64,106,0.12)] sm:h-16"
          />
          <div className="hidden items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-black text-[#667085] shadow-[0_14px_32px_rgba(49,64,106,0.1)] backdrop-blur sm:inline-flex">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ECFBFA] text-[#08AAA7]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            Safe, friendly learning for ESL students
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 md:gap-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,0.9fr)] lg:py-10 xl:gap-14">
          <AuthBrandPanel />

          <div className="relative mx-auto w-full max-w-[560px] lg:mx-0">
            <AuthMascotScene />
            <AuthCard
              mode={mode}
              setMode={setMode}
              isGoogleLoading={isGoogleLoading}
              onGoogleSignIn={handleGoogleSignIn}
              onSignInSuccess={async () => {
                await router.invalidate();
                navigate({ to: "/hub", replace: true });
              }}
            />
          </div>
        </section>

        <p className="mx-auto rounded-full border border-[#E8ECF4] bg-white/80 px-4 py-2 text-center text-xs font-black text-[#75829A] shadow-[0_10px_24px_rgba(49,64,106,0.07)]">
          Play | Practice | Grow with PrimKeet
        </p>
      </div>
    </main>
  );
}

function AuthBrandPanel() {
  return (
    <aside className="relative mx-auto w-full max-w-[640px] text-center lg:mx-0 lg:text-left">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        <LetterTile letter="A" className="right-[4.5rem] top-0 bg-[#FF3B8D]" />
        <LetterTile letter="B" className="right-36 top-14 bg-[#08AAA7]" />
        <LetterTile letter="C" className="right-6 top-24 bg-[#FF9418]" />
        <Sparkles className="absolute right-3 top-6 h-6 w-6 fill-[#FFD13B] text-[#FFD13B]" />
      </div>

      <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#FFD2E4] bg-[#FFF1F6] px-4 py-2 text-sm font-black text-[#FF3B8D] shadow-[0_12px_28px_rgba(255,59,141,0.1)] lg:mx-0">
        <Sparkles className="h-4 w-4 fill-[#FFD13B] text-[#FFD13B]" aria-hidden="true" />
        Your English adventure starts here
      </p>

      <h1 className="text-[clamp(2.8rem,7vw,5.45rem)] font-black leading-[0.96] tracking-normal text-[#10204A]">
        Learn, play
        <span className="block bg-[linear-gradient(105deg,#FF3B8D,#8B5CF6_54%,#08AAA7)] bg-clip-text text-transparent">
          and level up.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-[590px] text-lg font-semibold leading-8 text-[#667085] lg:mx-0">
        Sign in to discover colorful games, challenge your classmates, earn points, and build real
        English confidence.
      </p>

      <div className="mt-7 hidden flex-wrap justify-center gap-3 sm:flex lg:justify-start">
        <FeaturePill icon={Star} label="Earn rewards" color="bg-[#FF3B8D]" />
        <FeaturePill icon={TrendingUp} label="Track progress" color="bg-[#08AAA7]" />
        <FeaturePill icon={Crown} label="Climb the ranks" color="bg-[#8B5CF6]" />
      </div>
    </aside>
  );
}

function AuthCard({
  mode,
  setMode,
  isGoogleLoading,
  onGoogleSignIn,
  onSignInSuccess,
}: {
  mode: AuthMode;
  setMode: Dispatch<SetStateAction<AuthMode>>;
  isGoogleLoading: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignInSuccess: () => void;
}) {
  return (
    <section
      aria-labelledby="auth-title"
      className="relative z-10 overflow-hidden rounded-[1.75rem] border border-[#E8ECF4] bg-white/95 p-5 shadow-[0_28px_80px_rgba(16,32,74,0.16)] backdrop-blur sm:p-8"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-[#ECFBFA]" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-56 rounded-full bg-[#F7F1FF]" />

      <div className="relative">
        <div className="mb-7 text-center">
          <p className="auth-bubble mx-auto mb-3 inline-flex rounded-[1rem] bg-white px-4 py-2 text-sm font-black text-[#762A87] shadow-[0_12px_28px_rgba(49,64,106,0.1)]">
            Let's learn through play!
          </p>
          <h2 id="auth-title" className="text-3xl font-black leading-tight text-[#10204A]">
            Welcome to PrimKeet
          </h2>
          <p className="mx-auto mt-2 max-w-[360px] text-sm font-semibold leading-6 text-[#667085]">
            Sign in to play English games, earn points, and grow your skills.
          </p>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 rounded-[1.15rem] bg-[#F2F5FA] p-1 text-[#667085]">
            <TabsTrigger
              value="signin"
              className="min-h-12 rounded-[0.9rem] px-3 text-sm font-black data-[state=active]:bg-white data-[state=active]:text-[#FF3B8D] data-[state=active]:shadow-[0_8px_18px_rgba(16,32,74,0.08)]"
            >
              Sign in
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="min-h-12 rounded-[0.9rem] px-3 text-sm font-black data-[state=active]:bg-white data-[state=active]:text-[#762A87] data-[state=active]:shadow-[0_8px_18px_rgba(16,32,74,0.08)]"
            >
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-0">
            <SignInForm onSuccess={onSignInSuccess} />
          </TabsContent>
          <TabsContent value="signup" className="mt-0">
            <SignUpForm onSwitchToSignIn={() => setMode("signin")} />
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E8ECF4]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#98A2B3]">or</span>
          <div className="h-px flex-1 bg-[#E8ECF4]" />
        </div>

        <Button
          type="button"
          variant="outline"
          className={cn("w-full", googleButtonClass)}
          disabled={isGoogleLoading}
          aria-busy={isGoogleLoading}
          onClick={onGoogleSignIn}
        >
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-full border border-[#D7E3F6] bg-white text-sm font-black text-[#4285F4]"
          >
            G
          </span>
          {isGoogleLoading ? "Connecting..." : "Continue with Google"}
        </Button>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-black text-[#75829A]">
          <Check className="h-4 w-4 text-[#08AAA7]" aria-hidden="true" />
          Safe, fun, and made for English learners.
        </p>
      </div>
    </section>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  const submit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    onSuccess();
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email" className="font-black text-[#24324F]">
          Email
        </Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "signin-email-error" : undefined}
          className={authInputClass}
          {...form.register("email")}
        />
        {emailError && (
          <p id="signin-email-error" role="alert" className="text-xs font-bold text-[#D92D20]">
            {emailError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password" className="font-black text-[#24324F]">
          Password
        </Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "signin-password-error" : undefined}
          className={authInputClass}
          {...form.register("password")}
        />
        {passwordError && (
          <p id="signin-password-error" role="alert" className="text-xs font-bold text-[#D92D20]">
            {passwordError}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className={cn("mt-2 w-full", primaryButtonClass)}
        disabled={form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        {!form.formState.isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}

function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", username: "" },
  });

  const usernameError = form.formState.errors.username?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  const submit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: window.location.origin + "/hub",
        data: { username: values.username },
      },
    });
    if (error) return toast.error(error.message);
    toast.success("Account created - you can sign in now");
    onSwitchToSignIn();
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-username" className="font-black text-[#24324F]">
          Username
        </Label>
        <Input
          id="signup-username"
          placeholder="player_one"
          autoComplete="username"
          aria-invalid={Boolean(usernameError)}
          aria-describedby={usernameError ? "signup-username-error" : undefined}
          className={authInputClass}
          {...form.register("username")}
        />
        {usernameError && (
          <p id="signup-username-error" role="alert" className="text-xs font-bold text-[#D92D20]">
            {usernameError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="font-black text-[#24324F]">
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "signup-email-error" : undefined}
          className={authInputClass}
          {...form.register("email")}
        />
        {emailError && (
          <p id="signup-email-error" role="alert" className="text-xs font-bold text-[#D92D20]">
            {emailError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="font-black text-[#24324F]">
          Password
        </Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "signup-password-error" : undefined}
          className={authInputClass}
          {...form.register("password")}
        />
        {passwordError && (
          <p id="signup-password-error" role="alert" className="text-xs font-bold text-[#D92D20]">
            {passwordError}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className={cn("mt-2 w-full", primaryButtonClass)}
        disabled={form.formState.isSubmitting}
        aria-busy={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creating..." : "Create account"}
        {!form.formState.isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}

function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(112deg,#FFF1F6_0%,#FBFDFF_47%,#EAF7FF_100%)]" />
      <div className="absolute right-[8%] top-[14%] h-72 w-72 rounded-full bg-[#ECFBFA] blur-3xl" />
      <div className="absolute left-[8%] bottom-[10%] h-80 w-80 rounded-full bg-[#FFF1F6] blur-3xl" />
      <div className="absolute bottom-[11%] right-[15%] h-56 w-72 rounded-full bg-[#F7F1FF] blur-3xl" />
      <Cloud className="left-[5%] top-[10%] h-16 w-36" />
      <Cloud className="right-[3%] bottom-[10%] h-20 w-44 opacity-70" />
      <Cloud className="right-[18%] top-[82%] hidden h-10 w-28 opacity-60 md:block" />
      <Sparkles className="absolute left-[7%] top-[30%] h-6 w-6 fill-[#FFD13B] text-[#FFD13B]" />
      <Sparkles className="absolute right-[7%] top-[20%] h-5 w-5 fill-[#FF3B8D] text-[#FF3B8D]" />
      <Sparkles className="absolute left-[58%] top-[25%] hidden h-5 w-5 fill-[#FFD13B] text-[#FFD13B] md:block" />
    </div>
  );
}

function AuthMascotScene() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-0 mx-auto mb-[-20px] h-28 w-52 md:hidden"
      >
        <Cloud className="left-4 top-12 h-12 w-32 opacity-90" />
        <div className="auth-bird-arrive absolute left-16 top-0 h-24 w-24">
          <ParakeetMascot className="auth-bird-float h-full w-full" />
        </div>
        <Sparkles className="auth-sparkle-drift absolute right-6 top-5 h-4 w-4 fill-[#FFD13B] text-[#FFD13B]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[5.5rem] top-[5.5rem] z-0 hidden h-72 w-72 md:block lg:-left-[10.5rem] lg:top-[6.5rem]"
      >
        <div className="absolute left-0 top-12 h-56 w-56 rounded-full border-[6px] border-[#F8B8D7]" />
        <div className="absolute left-10 top-20 h-44 w-44 rounded-full border-[6px] border-[#BEECEF]" />
        <Cloud className="left-3 top-[6.5rem] h-20 w-48 opacity-85" />
        <div className="auth-bird-arrive absolute left-[5.5rem] top-4 h-56 w-56">
          <ParakeetMascot className="auth-bird-float h-full w-full drop-shadow-[0_22px_24px_rgba(16,32,74,0.16)]" />
        </div>
        <Sparkles className="auth-sparkle-drift absolute left-28 top-0 h-6 w-6 fill-[#FFD13B] text-[#FFD13B]" />
        <Sparkles className="auth-sparkle-drift absolute left-24 top-[14.5rem] h-4 w-4 fill-[#FF3B8D] text-[#FF3B8D]" />
      </div>
    </>
  );
}

function FeaturePill({
  icon: Icon,
  label,
  color,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
}) {
  return (
    <div className="inline-flex min-h-12 items-center gap-3 rounded-[1rem] border border-[#E8ECF4] bg-white/90 px-4 py-2 font-black text-[#344054] shadow-[0_12px_26px_rgba(49,64,106,0.08)]">
      <span className={cn("grid h-8 w-8 place-items-center rounded-[0.7rem] text-white", color)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </div>
  );
}

function LetterTile({ letter, className }: { letter: string; className?: string }) {
  return (
    <span
      className={cn(
        "absolute grid h-[3.25rem] w-[3.25rem] rotate-[-10deg] place-items-center rounded-[0.9rem] border-[3px] border-white text-2xl font-black text-white shadow-[0_16px_30px_rgba(49,64,106,0.16)]",
        className,
      )}
    >
      {letter}
    </span>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <div className={cn("absolute", className)}>
      <span className="absolute bottom-0 left-0 h-10 w-full rounded-full border border-[#DCEBFB] bg-white/78 shadow-[0_12px_28px_rgba(49,64,106,0.08)]" />
      <span className="absolute bottom-5 left-[14%] h-12 w-12 rounded-full border border-[#DCEBFB] bg-white/86" />
      <span className="absolute bottom-4 left-[38%] h-14 w-14 rounded-full border border-[#DCEBFB] bg-white/90" />
      <span className="absolute bottom-2 right-[6%] h-10 w-10 rounded-full border border-[#DCEBFB] bg-white/82" />
    </div>
  );
}

function ParakeetMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="authParakeetBody" x1="24" x2="88" y1="22" y2="94">
          <stop stopColor="#08AAA7" />
          <stop offset="1" stopColor="#762A87" />
        </linearGradient>
        <linearGradient id="authParakeetWing" x1="62" x2="102" y1="42" y2="90">
          <stop stopColor="#FF3B8D" />
          <stop offset="1" stopColor="#762A87" />
        </linearGradient>
      </defs>
      <path
        d="M61 14c19 7 31 26 30 47-2 25-19 43-41 42-17-1-31-15-32-33C16 42 35 22 61 14z"
        fill="url(#authParakeetBody)"
      />
      <path
        d="M72 47c18 4 30 17 31 35-14 2-29-3-39-14 0-8 3-15 8-21z"
        fill="url(#authParakeetWing)"
      />
      <path d="M39 16c9-10 20-11 27-6-9 2-15 8-18 18z" fill="#FF3B8D" />
      <path d="M84 30l20 8-19 9c1-6 1-11-1-17z" fill="#FF9418" />
      <circle cx="69" cy="33" r="6" fill="#fff" />
      <circle cx="71" cy="33" r="3" fill="#10204A" />
      <path d="M39 101c-5 7-11 9-18 7 7-7 13-12 20-15z" fill="#762A87" />
      <path d="M48 103c-3 9-8 13-16 13 4-8 9-15 15-20z" fill="#43A8EA" />
      <path
        d="M48 78c8 6 19 6 28-1"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function AuthMotionStyles() {
  return (
    <style>
      {`
        @keyframes auth-bird-arrive {
          from {
            opacity: 0;
            transform: translate3d(48px, 34px, 0) scale(0.86) rotate(-12deg);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1) rotate(-4deg);
          }
        }

        @keyframes auth-bird-float {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(-2deg);
          }
          50% {
            transform: translate3d(5px, -10px, 0) rotate(2deg);
          }
        }

        @keyframes auth-sparkle-drift {
          0%, 100% {
            opacity: 0.72;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-6px) scale(1.08);
          }
        }

        .auth-bird-arrive {
          animation: auth-bird-arrive 760ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .auth-bird-float {
          animation: auth-bird-float 5.2s ease-in-out 820ms infinite;
          transform-origin: center;
        }

        .auth-sparkle-drift {
          animation: auth-sparkle-drift 3.6s ease-in-out infinite;
        }

        .auth-bubble {
          transform: rotate(-2deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-bird-arrive,
          .auth-bird-float,
          .auth-sparkle-drift {
            animation: none;
          }
        }
      `}
    </style>
  );
}
