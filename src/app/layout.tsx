import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TAKUTO SUZUKI — Photographer",
  description: "Photography portfolio of Takuto Suzuki.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${ebGaramond.variable} h-full antialiased`}>
      <body className={`min-h-full bg-white ${ebGaramond.className}`}>
        <Nav />
        <div className="md:pl-[40vw] pt-14 md:pt-0">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
