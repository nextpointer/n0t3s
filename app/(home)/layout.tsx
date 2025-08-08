import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Next Notes",
  description: "simple open source ai integrated notes app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="flex h-[100dvh] w-full justify-center items-center flex-col gap-2 p-2 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
