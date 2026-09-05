// /app/layout.jsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Connected – Secure Asymmetric Social Platform (CSE447)",
  description: "End-to-End Dual Asymmetric Encryption (RSA & ECC), Key Management Module, 2FA, RBAC, HMAC Data Integrity, and Real-Time Messaging.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-slate-950 text-slate-100`}
      >
        <Providers>
          <Navbar />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}