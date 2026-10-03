import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "./lib/session";

const LOGO =
  "https://gotbluff.com/cdn/shop/files/BLUFF_LOGO_White.png?v=1787179258&width=600";

export const metadata: Metadata = {
  title: "Got Bluff · Confirm your address",
  description: "Confirm or update your shipping address so we can get your Bluff order on the way.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="app-frame">
            <header className="site-header">
              <div className="brand">
                <img src={LOGO} alt="Got Bluff" />
                <span className="brand-tag">Address</span>
              </div>
            </header>
            {children}
            <footer className="site-footer">
              <div className="foot-inner">
                <strong>Got Bluff</strong>
                Questions? Email <a href="mailto:info@gotbluff.com">info@gotbluff.com</a>
              </div>
            </footer>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
