import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AppearanceSync } from "@/components/AppearanceSync";

export const metadata: Metadata = {
  title: "LatentCraft — AI Studio",
  description: "Spatial Diffusion Engine & Professional Creative Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Source+Sans+3:wght@400;500;600;700&family=Syne:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AppearanceSync />
        <AuthProvider>
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
