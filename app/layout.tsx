import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { TopNavigation } from "@/components/layout/TopNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChronosAI - AI-Powered Learning Platform",
  description: "Transform passive video courses into interactive, personalized learning experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO: Implement proper auth context to pass real user data
  // For now, TopNavigation will show "Sign In with Whop" button
  const user = undefined;

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Global Navigation - appears on all pages */}
        <TopNavigation user={user} />

        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
