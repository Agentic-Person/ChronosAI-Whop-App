import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ConditionalNavigation } from "@/components/layout/ConditionalNavigation";
import { ClientProviders } from "@/components/providers/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChronosAI - AI-Powered Learning Platform",
  description: "Transform passive video courses into interactive, personalized learning experiences",
  icons: {
    icon: "/images/logo_brand/chronos_FAV.png",
    shortcut: "/images/logo_brand/chronos_FAV.png",
    apple: "/images/logo_brand/chronos_FAV.png",
  },
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-app text-text-primary antialiased min-h-screen`}>
        <ClientProviders>
          {/* Global Navigation - appears on all pages except landing */}
          <ConditionalNavigation user={user} />

          {children}
          <Toaster position="top-right" />
        </ClientProviders>
      </body>
    </html>
  );
}
