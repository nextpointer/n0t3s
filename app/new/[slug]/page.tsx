"use client";

import { TagInput } from "@/components/TagInput";
import { Input } from "@/components/ui/input";
import { getNotes } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  // fetch the params
  const params = useParams<{ slug: string }>();
  const id = params.slug;

  // states
  const [loading, setLoading] = useState<boolean>(false);
  const [note, setNote] = useState<Note | null>();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTag] = useState<string[]>([]);
  // router
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const data = getNotes();
    const findingNote = data.find((note) => note.id === id);
    if (findingNote) {
      setNote(findingNote);
      setTitle(findingNote.title);
      setContent(findingNote.content);
      setTag(findingNote.tags || []);
    }
  }, [id]);

  // handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <>
      <div className="w-full md:w-2xl h-screen flex flex-col justify-start items-start p-2 pt-8 gap-4">
        <input
          className="text-2xl font-semibold p-0 focus-visible:outline-none focus-visible:ring-0  focus-visible:border-0 border-none focus-visible:shadow-none"
          value={title}
          onChange={handleTitleChange}
          placeholder="title.."
        />
        <TagInput
          onChange={setTag}
          value={tags}
          suggestions={["React", "Next.js", "TypeScript", "Tailwind", "ShadCN"]}
        />
      </div>
    </>
  );
}
