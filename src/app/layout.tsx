import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebSharkSocial – Connect with Builders & Creatives",
  description:
    "A social media platform for WebShark.AI users, creatives and builders to connect and foster community together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200 bg-white mt-8">
          © {new Date().getFullYear()} WebSharkSocial · Built for the WebShark.AI community
        </footer>
      </body>
    </html>
  );
}
