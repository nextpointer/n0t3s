import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "N0T3S",
  description: "A simple, fast and minimal note-taking app",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#71717b",
};

const sg = Space_Grotesk({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <main
            className={`flex h-[100dvh] w-full justify-center items-center flex-col gap-2 p-2 overflow-hidden ${sg.className}`}
          >
            {children}
            <Toaster
              toastOptions={{
                className: "text-sm",
              }}
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
