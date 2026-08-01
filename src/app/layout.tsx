import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScheduleX — FET-powered University Timetable Generator",
  description:
    "Build conflict-free university timetables with the FET engine. Define teachers, subjects, rooms and constraints through a guided wizard, generate, then fine-tune by hand.",
  keywords: [
    "timetable",
    "university",
    "scheduling",
    "FET",
    "Free Timetabling Software",
    "React",
    "Next.js",
  ],
  authors: [{ name: "ScheduleX" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ScheduleX",
    description: "FET-powered university timetable generator",
    siteName: "ScheduleX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScheduleX",
    description: "FET-powered university timetable generator",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
