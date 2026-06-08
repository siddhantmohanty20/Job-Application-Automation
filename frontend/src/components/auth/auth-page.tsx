import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Zap, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (mode === "signup" && password !== confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Sign in failed", { description: error });
      } else {
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        toast.error("Sign up failed", { description: error });
      } else {
        toast.success("Account created!", {
          description: "You are now signed in.",
        });
        navigate({ to: "/" });
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#141414] border-r border-border p-12">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="size-6 text-white" fill="currentColor" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">AutoApply</p>
            <p className="text-xs text-muted-foreground">Job Automation</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              Automate your entire
              <br />
              <span className="text-primary">job search.</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-base leading-relaxed">
              Scrape jobs, match with your profile, auto-apply, find recruiters,
              and send personalised cold emails — all on autopilot.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { stat: "20–40", label: "Applications per day" },
              { stat: "100%", label: "Free tier infrastructure" },
              { stat: "AI", label: "Powered resume tailoring" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-xl bg-background/60 border border-border px-5 py-4"
              >
                <span className="text-2xl font-bold text-primary">{item.stat}</span>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Built for personal use. Your data stays in your own Supabase instance.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="size-5 text-white" fill="currentColor" />
            </div>
            <span className="text-base font-semibold text-foreground">AutoApply</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your AutoApply dashboard"
                : "Start automating your job search today"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}); }}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-medium transition-all",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "pl-10 bg-muted border-border",
                    errors.email && "border-destructive"
                  )}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "pl-10 pr-10 bg-muted border-border",
                    errors.password && "border-destructive"
                  )}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm password (signup only) */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm text-foreground">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      "pl-10 bg-muted border-border",
                      errors.confirmPassword && "border-destructive"
                    )}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium mt-2"
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin mr-2" />
                {mode === "signin" ? "Signing in..." : "Creating account..."}</>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrors({}); }}
              className="text-primary hover:underline font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}