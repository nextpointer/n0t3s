"use client";

import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteNote, getNotes, updateNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

// toast helper func
const showToast = {
  saved: () => toast.success("Note saved successfully", { id: "saved" }),
  deleted: () => toast.success("Note deleted successfully", { id: "deleted" }),
  error: (msg: string) => toast.error(msg, { id: "error" }),
};

export default function Page() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTag] = useState<string[]>([]);
  const [allTag, setAllTag] = useState<string[]>([]);
  const [unsaved, setUnsaved] = useState<boolean>(false);

  // const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const data = getNotes();
    const findingNote = data.find((note) => note.id === id);
    if (findingNote) {
      setNote(findingNote);
      setTitle(findingNote.title);
      setContent(findingNote.content);
      setTag(findingNote.tags || []);
    }
    setAllTag(Array.from(new Set(data.flatMap((note) => note.tags || []))));
    setLoading(false);
  }, [id]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setUnsaved(true);
  }

  const handleSave = () => {
    if (!note) return;
    try {
      const updated = { ...note, title, content, tags, updatedAt: Date.now() };
      updateNote(updated);
      setNote(updated);
      setUnsaved(false);
      showToast.saved();
    } catch {
      showToast.error("Failed to save");
    }
  };

  const handleDelete = () => {
    if (!note) return;
    try {
      deleteNote(id);
      router.push("/");
    } catch {
      showToast.deleted();
    }
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] md:w-2xl flex flex-col p-4 gap-4 overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          {/* Title */}
          <nav className="flex gap-2 items-center md:absolute right-12">
            <Button variant="ghost" size={"icon"} asChild>
              <Link href={`/`}>
                <ArrowLeft />
              </Link>
            </Button>
            {unsaved && (
              <span className="h-3 w-3 bg-violet-500 rounded-full"></span>
            )}
            <Button
              variant="ghost"
              size={"icon"}
              onClick={handleDelete}
              className="ml-auto"
              aria-label="Delete note"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </Button>
          </nav>
          <input
            className="text-xl sm:text-2xl font-semibold w-full p-0 focus-visible:outline-none border-none"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title..."
          />

          {/* Tags */}
          <TagInput
            onChange={(tag) => {
              setTag(tag);
              setUnsaved(true);
            }}
            value={tags}
            suggestions={allTag}
          />

          {/* Scrollable Textarea */}
          <div className="flex-1 w-full overflow-y-auto rounded-md">
            <Textarea
              ref={textareaRef}
              className="w-full h-full bg-transparent text-base sm:text-lg focus:outline-none border-none shadow-none p-2"
              style={{
                resize: "none",
                minHeight: "100%",
                height: "100%",
              }}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setUnsaved(true);
              }}
              onBlur={(e) => setContent(e.target.value)}
            />
          </div>
          {/* Save Button */}
          <Button
            className="w-full text-base sm:text-lg"
            onClick={handleSave}
            disabled={!unsaved}
          >
            Save
          </Button>
        </>
      )}
    </div>
  );
}
