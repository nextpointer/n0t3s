import Link from "next/link";
import { Button } from "@/components/ui/button";

// The navigation fallback the service worker serves when neither the
// network nor a cached copy of the requested page exists. Precached at
// install time, so it is always reachable from the cold-offline state.
export default function OfflinePage() {
  return (
    <div className="md:w-3xl w-full h-screen flex flex-col justify-start items-start p-4 pt-8 md:border-l-1 md:border-r-1 md:border-dashed select-none">
      <h1 className="mb-4 text-3xl font-thin leading-tight tracking-tight text-foreground md:text-5xl text-balance mt-16 text-center w-full">
        You&apos;re{" "}
        <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
          offline
        </span>
      </h1>
      <p className="mx-auto max-w-md text-muted-foreground text-center text-sm mt-2">
        This page was never opened on this device, so there is nothing saved
        to show. Notes you have visited before are still available — go{" "}
        <span className="text-foreground font-medium">home</span> and open
        them from there.
      </p>
      <div className="mx-auto mt-8">
        <Button asChild variant="outline" className="shadow-none">
          <Link href="/">← Back to notes</Link>
        </Button>
      </div>
    </div>
  );
}
