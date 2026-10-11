import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigitalToolWala Client Portal",
  description: "Create customer activation links that refresh automatically on opening, or refresh a TXT batch.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
