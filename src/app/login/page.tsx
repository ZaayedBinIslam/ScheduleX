"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarClock, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else if (res?.ok) {
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
              <span>Timetabling Redefined</span>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tight xl:text-5xl leading-[1.1]">
              Automate Class Schedules in Seconds.
            </h2>
            <p className="text-base text-zinc-400 max-w-[45ch] leading-relaxed">
              Define constraints, assign resources, and trigger our high-speed scheduler. The perfect timetable is one click away.
            </p>
          </motion.div>

          {/* Interactive Scheduling Grid mock */}
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">Conflict Matrix Simulator</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <motion.div 
                animate={{ 
                  y: [0, -4, 0],
                  scale: [1, 1.02, 1] 
                }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs"
              >
                <div className="font-semibold text-emerald-400 mb-0.5">Algorithms 101</div>
                <div className="text-[10px] text-zinc-400">Dr. Smith • Room 402</div>
              </motion.div>

              <motion.div 
                animate={{ 
                  y: [0, 4, 0],
                  scale: [1, 0.98, 1] 
                }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-xs opacity-70"
              >
                <div className="font-semibold text-zinc-300 mb-0.5">Physics Lab</div>
                <div className="text-[10px] text-zinc-500">Prof. Brown • Lab 2</div>
              </motion.div>

              <motion.div 
                animate={{ 
                  y: [0, -3, 0],
                  scale: [1, 1.01, 1] 
                }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs"
              >
                <div className="font-semibold text-sky-400 mb-0.5">Database Sys</div>
                <div className="text-[10px] text-zinc-400">Dr. Jones • Room 101</div>
              </motion.div>
            </div>

            {/* Float overlays */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute -right-4 -bottom-4 bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg shadow-xl flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>0 Conflicts Detected</span>
            </motion.div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-zinc-500 font-medium">
          ScheduleX is trusted by academic schedulers worldwide.
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
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your university timetables
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field */}
              <div className="space-y-2">
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
                    className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Password
                  </label>
                </div>
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
                    className="flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-10 py-1.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>

            </form>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
