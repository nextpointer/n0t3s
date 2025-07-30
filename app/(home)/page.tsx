import { Button } from "@/components/ui/button";
import { Github, NotebookPen } from "lucide-react";

export default function Home() {
  return (
    <>
      <title>Next Notes</title>
      <div className="w-full md:w-2xl h-screen flex flex-col justify-start items-start">
        <div className="flex flex-row justify-end items-center w-full gap-2">
          <h1 className="mr-auto text-2xl font-semibold">Next Notes</h1>
          <Button variant={"outline"}>
            <Github />
          </Button>
          <Button>
            <NotebookPen className="mr-1" /> New Note
          </Button>
        </div>
      </div>
    </>
  );
}
