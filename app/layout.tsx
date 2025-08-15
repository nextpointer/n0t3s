import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Next Notes",
  description: "simple open source ai integrated notes app",
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
