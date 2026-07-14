import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarabut People Hub",
  description: "Internal People Portal — prototype",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="prototype-banner">
          Prototype. Fictional data only. Not a production system of record.
        </div>
        {children}
      </body>
    </html>
  );
}
