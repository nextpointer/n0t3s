import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen w-full justify-center items-center flex-col gap-2">
        <h1>Next Notes</h1>
        <Button>Get Starred</Button>
      </main>
    </>
  );
}
