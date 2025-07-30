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
        <main className="flex min-h-screen w-full justify-center items-center flex-col gap-2 p-2">
          {children}
        </main>
      </body>
    </html>
  );
}
