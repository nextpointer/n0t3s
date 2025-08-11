"use client";

import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteNote, getNotes, updateNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@/components/ui/loader";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Sparkles,
  WandSparkles,
  ChevronDown,
  FileText,
  PenLine,
  SpellCheck2,
  Maximize2,
  BookOpenCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// toast helper func
const showToast = {
  saved: () => toast.success("Note saved successfully", { id: "saved" }),
  deleted: () => toast.success("Note deleted successfully", { id: "deleted" }),
  error: (msg: string) => toast.error(msg, { id: "error" }),
};

// AI action types
type AIAction = "summarize" | "rewrite" | "grammar" | "expand" | "simplify";

export default function Page() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;
  const router = useRouter();
  const [pageLoading, setpageLoading] = useState<boolean>(false);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTag] = useState<string[]>([]);
  const [allTag, setAllTag] = useState<string[]>([]);
  const [unsaved, setUnsaved] = useState<boolean>(false);
  const [lastSavedNote, setLastSavedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    setpageLoading(true);
    const data = getNotes();
    const findingNote = data.find((note) => note.id === id);
    if (findingNote) {
      setNote(findingNote);
      setLastSavedNote(findingNote);
      setTitle(findingNote.title);
      setContent(findingNote.content);
      setTag(findingNote.tags || []);
    }
    setAllTag(Array.from(new Set(data.flatMap((note) => note.tags || []))));
    setpageLoading(false);
  }, [id]);

  function checkIfUnsaved(
    updatedTitle: string,
    updatedContent: string,
    updatedTags: string[],
  ) {
    if (!lastSavedNote) return;
    const changed =
      updatedTitle !== lastSavedNote.title ||
      updatedContent !== lastSavedNote.content ||
      JSON.stringify(updatedTags) !== JSON.stringify(lastSavedNote.tags || []);
    setUnsaved(changed);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    checkIfUnsaved(e.target.value, content, tags);
  }

  const handleSave = () => {
    if (!note) return;
    setLoading(true);
    try {
      const updated = { ...note, title, content, tags, updatedAt: Date.now() };
      updateNote(updated);
      setNote(updated);
      setLastSavedNote(updated);
      setUnsaved(false);
      showToast.saved();
    } catch {
      showToast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    try {
      deleteNote(id);
      router.push("/");
      showToast.deleted();
    } catch {
      showToast.deleted();
    }
  };

  const handleAIAction = async (action: AIAction) => {
    if (!content.trim()) {
      showToast.error("Note content is empty");
      return;
    }

    setAiLoading(true);
    try {
      setUnsaved(true);
      toast.success(`AI ${action} applied successfully`);
    } catch {
      showToast.error("Failed to process AI action");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] md:w-2xl flex flex-col p-4 gap-4 overflow-hidden relative">
      {pageLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size={"icon"} asChild>
                <Link href={`/`}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              {unsaved && (
                <span className="h-3 w-3 bg-violet-500 rounded-full animate-pulse"></span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 pr-2 "
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader className="w-4 h-4" />
                    ) : (
                      <>
                        <WandSparkles className="w-4 h-4 text-yellow-500" />
                        {/*<ChevronDown className="w-4 h-4 opacity-50" />*/}
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-36 shadow"
                  align="end"
                  side="bottom"
                  collisionPadding={16}
                >
                  <DropdownMenuItem
                    onClick={() => handleAIAction("summarize")}
                    disabled={aiLoading}
                  >
                    <FileText />
                    Summarize
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("rewrite")}
                    disabled={aiLoading}
                  >
                    <PenLine />
                    Rewrite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("grammar")}
                    disabled={aiLoading}
                  >
                    <SpellCheck2 />
                    Fix Grammar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("expand")}
                    disabled={aiLoading}
                  >
                    <Maximize2 />
                    Expand
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("simplify")}
                    disabled={aiLoading}
                  >
                    <BookOpenCheck />
                    Simplify
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size={"icon"}
                onClick={handleDelete}
                aria-label="Delete note"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Title */}
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
              checkIfUnsaved(title, content, tag);
            }}
            value={tags}
            suggestions={allTag}
          />

          {/* Scrollable Textarea */}
          <div className="flex-1 w-full rounded-md relative overflow-y-auto">
            <Textarea
              ref={textareaRef}
              className="h-auto min-h-[calc(100vh-460px)] w-full flex-1 rounded-ele border-none bg-transparent p-0 px-0 py-2 text-base shadow-none focus:outline-none md:min-h-[calc(100dvh-320px) pb-[calc(100vh-460px)]"
              style={{
                boxShadow: "none",
                border: "none",
                outline: "none",
                overflowY: "auto",
                height: "100%",
                maxHeight: "100%",
                resize: "none",
                background: "transparent",
              }}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                checkIfUnsaved(title, e.target.value, tags);
              }}
              onBlur={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <div className="flex flex-row h-10 gap-0 mt-10 items-center relative">
            <Button
              className="absolute left-0 h-full min-w-[100px] px-2 text-xs sm:text-sm "
              style={{
                borderRadius: 0,
                clipPath:
                  "path('M100 6.83375C100 8.49902 99.3404 10.0754 98.4528 11.4843C96.8991 13.9503 96 16.8701 96 20C96 23.1296 96.8992 26.0488 98.4527 28.5145C99.3404 29.9236 100 31.5 100 33.1654V33.1654C100 36.9401 96.9401 40 93.1654 40H20C8.9543 40 0 31.0457 0 20V20C0 8.95431 8.95431 0 20 0H93.1662C96.9404 0 100 3.05957 100 6.83375V6.83375Z')",
              }}
              onClick={() => handleAIAction("rewrite")}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader className="text-background" /> : "Ask"}
            </Button>
            <Button
              className="min-h-[calc(100%-5px)] min-w-[calc(100%-100px)] text-xs sm:text-sm rounded-full ml-auto"
              onClick={handleSave}
              disabled={!unsaved || loading}
            >
              {loading ? (
                <>
                  <Loader className="text-background mr-2" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
