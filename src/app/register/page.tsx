"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { 
  CalendarClock, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  User,
  Building2,
  GraduationCap,
  BookOpen,
  Settings,
  ShieldCheck
} from "lucide-react";

type RoleType = "scheduler" | "admin" | "faculty" | "student";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<RoleType | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "Empty", color: "bg-zinc-800" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1: return { score: 25, label: "Weak", color: "bg-red-500" };
      case 2: return { score: 50, label: "Fair", color: "bg-orange-500" };
      case 3: return { score: 75, label: "Good", color: "bg-yellow-500" };
      case 4: return { score: 100, label: "Strong", color: "bg-emerald-500" };
      default: return { score: 0, label: "Empty", color: "bg-zinc-800" };
    }
  };

  const strength = getPasswordStrength();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Keep in step with RegisterSchema in /api/auth/register, which rejects
    // anything shorter regardless of what the form allows through.
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("Please select your academic role");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name, 
          email, 
          password,
          organization: organization || undefined,
          role: role || undefined
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "A profile with this email already exists");
        setLoading(false);
        return;
      }

      // Automatically sign in the user after successful registration
      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });

      if (loginRes?.error) {
        router.push("/login?registered=true");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An unexpected connection error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:grid-cols-12 overflow-hidden bg-background font-sans">
      {/* Background blobs for mobile/tablet where hero is hidden */}
      <div className="absolute inset-0 -z-10 block lg:hidden overflow-hidden">
        <div className="absolute -top-[40%] -left-[40%] h-[80%] w-[80%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[40%] h-[80%] w-[80%] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      {/* Hero Left Column (Desktop) */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white">
        {/* Glow meshes */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-sky-600/20 blur-[120px] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#09090b_90%)]" />
        </div>

        {/* Logo Header */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight w-fit">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <CalendarClock className="h-5 w-5" />
          </span>
          <span className="text-zinc-100 font-bold tracking-tight">ScheduleX</span>
        </Link>

        {/* Dynamic Timetable Visual */}
        <div className="my-auto max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Multi-Resource Constraints</span>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tight xl:text-5xl leading-[1.1]">
              Optimized for University Structures.
            </h2>
            <p className="text-base text-zinc-400 max-w-[45ch] leading-relaxed">
              Register to assign faculty groups, room structures, and activity slots dynamically. Manage departments without gridlocks.
            </p>
          </motion.div>

          {/* Interactive Scheduling Grid mock */}
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">Resource Assignment view</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Teachers</span>
                <div className="flex flex-col gap-1.5">
                  <div className="rounded-lg bg-zinc-800/60 p-2 text-[10px] font-semibold border border-zinc-700/30 flex items-center justify-between">
                    <span>Prof. Alan Turing</span>
                    <span className="bg-primary/20 text-primary border border-primary/30 text-[8px] px-1 rounded">CS</span>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 p-2 text-[10px] font-semibold border border-zinc-700/30 flex items-center justify-between">
                    <span>Dr. Grace Hopper</span>
                    <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[8px] px-1 rounded">Math</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Rooms</span>
                <div className="flex flex-col gap-1.5">
                  <div className="rounded-lg bg-zinc-800/60 p-2 text-[10px] font-semibold border border-zinc-700/30 flex items-center justify-between">
                    <span>Room 501 (Lab)</span>
                    <span className="text-zinc-500 text-[8px]">Cap: 30</span>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 p-2 text-[10px] font-semibold border border-zinc-700/30 flex items-center justify-between">
                    <span>Lecture Hall A</span>
                    <span className="text-zinc-500 text-[8px]">Cap: 150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-zinc-500 font-medium">
          ScheduleX complies with academic security standards.
        </p>
      </div>

      {/* Form Right Column */}
      <div className="flex col-span-1 lg:col-span-6 xl:col-span-5 flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header Mobile / Text */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
            <span className="flex h-10 w-10 lg:hidden items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-2">
              <CalendarClock className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? "Step 1 of 2: Set up your profile" : "Step 2 of 2: Academic context"}
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-xl relative overflow-hidden"
          >
            {/* Step progress line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-zinc-200 dark:bg-zinc-800">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-[0.16, 1, 0.3, 1]"
                style={{ width: `${step === 1 ? 50 : 100}%` }}
              />
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                /* Step 1: Credentials Form */
                <motion.form 
                  key="step-1"
                  initial={{ x: -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 24, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleNextStep} 
                  className="space-y-5"
                >
                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {/* Name field */}
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Full Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.edu"
                        className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1">
                    <label htmlFor="password" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-10 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength indicator */}
                    {password && (
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Password Strength</span>
                          <span className={strength.score === 100 ? "text-emerald-500 font-bold" : ""}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${strength.score}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password field */}
                  <div className="space-y-1">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer pt-3"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </motion.form>
              ) : (
                /* Step 2: Role and Organization */
                <motion.form 
                  key="step-2"
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -24, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleSubmit} 
                  className="space-y-5"
                >
                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {/* University/Organization field */}
                  <div className="space-y-1">
                    <label htmlFor="organization" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      University / Institution
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <input
                        id="organization"
                        type="text"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Harvard University"
                        className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Role Selector Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Your Academic Role
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Scheduler role */}
                      <button
                        type="button"
                        onClick={() => setRole("scheduler")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                          role === "scheduler"
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/80 bg-background/30 hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Settings className="h-5 w-5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">Scheduler</span>
                          <span className="text-[8px] opacity-70">Creates schedules</span>
                        </div>
                      </button>

                      {/* Admin role */}
                      <button
                        type="button"
                        onClick={() => setRole("admin")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                          role === "admin"
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/80 bg-background/30 hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">Admin</span>
                          <span className="text-[8px] opacity-70">Manages platform</span>
                        </div>
                      </button>

                      {/* Faculty role */}
                      <button
                        type="button"
                        onClick={() => setRole("faculty")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                          role === "faculty"
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/80 bg-background/30 hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <GraduationCap className="h-5 w-5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">Faculty</span>
                          <span className="text-[8px] opacity-70">Teaches classes</span>
                        </div>
                      </button>

                      {/* Student role */}
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                          role === "student"
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/80 bg-background/30 hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BookOpen className="h-5 w-5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">Student</span>
                          <span className="text-[8px] opacity-70">Views schedules</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  <div className="flex items-start space-x-2 pt-2">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary bg-background/50 transition-all cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs font-medium text-muted-foreground leading-normal cursor-pointer select-none">
                      I accept the ScheduleX{" "}
                      <Link href="/terms" className="text-primary hover:underline font-semibold">Terms of Service</Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline font-semibold">Privacy Policy</Link>
                    </label>
                  </div>

                  {/* Step Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 w-24 rounded-xl border border-border/80 bg-background/30 text-xs font-semibold hover:bg-accent transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary h-10 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Register</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
