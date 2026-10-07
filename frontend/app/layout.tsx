import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Typeform Clone",
  description: "Build forms, share them with a link, and collect responses.",
};

// Wraps every page: sets the font and mounts the toast notifications once.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-neutral-800 antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { background: "#262626", color: "#ffffff", fontSize: "14px", borderRadius: "8px" },
          }}
        />
      </body>
    </html>
  );
}
