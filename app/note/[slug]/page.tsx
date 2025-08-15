"use client";

import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { deleteNote, getNotes, updateNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@/components/ui/loader";
import {
  ArrowLeft,
  Trash2,
  WandSparkles,
  FileText,
  PenLine,
  SpellCheck2,
  Maximize2,
  BookOpenCheck,
  Sparkles,
  Undo2,
  Redo2,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

const showToast = {
  saved: () => toast.success("Note saved successfully", { id: "saved" }),
  deleted: () => toast.success("Note deleted successfully", { id: "deleted" }),
  error: (msg: string) => toast.error(msg, { id: "error" }),
  aiSuccess: (action: string) =>
    toast.success(`AI ${action} applied successfully`),
};

type AIAction =
  | "summarize"
  | "rewrite"
  | "grammar"
  | "expand"
  | "simplify"
  | "ask";

export default function Page() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [unsaved, setUnsaved] = useState<boolean>(false);
  const [lastSavedNote, setLastSavedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [askDialogOpen, setAskDialogOpen] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>("");
  const [askLoading, setAskLoading] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [showSavePrompt, setShowSavePrompt] = useState<boolean>(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  useEffect(() => {
    const savedAutoSave = localStorage.getItem("autoSave");
    if (savedAutoSave !== null) {
      setAutoSave(savedAutoSave === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("autoSave", autoSave.toString());
  }, [autoSave]);

  useEffect(() => {
    if (autoSave && unsaved) {
      const timer = setTimeout(() => {
        handleSave(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [title, content, tags, autoSave, unsaved]);

  // Load note data
  useEffect(() => {
    if (!id) return;
    setPageLoading(true);
    const data = getNotes();
    const findingNote = data.find((note) => note.id === id);
    if (findingNote) {
      setNote(findingNote);
      setLastSavedNote(findingNote);
      setTitle(findingNote.title);
      setContent(findingNote.content);
      setTags(findingNote.tags || []);
    }
    setAllTags(Array.from(new Set(data.flatMap((note) => note.tags || []))));
    setPageLoading(false);
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsaved && !autoSave) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [unsaved, autoSave]);

  // Handle navigation away with unsaved changes
  const handleNavigation = (path: string) => {
    if (unsaved && !autoSave) {
      setNavigationTarget(path);
      setShowSavePrompt(true);
    } else {
      router.push(path);
    }
  };

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

  const handleSave = (isAutoSave = false) => {
    if (!note) return;
    setLoading(true);
    try {
      const updated = { ...note, title, content, tags, updatedAt: Date.now() };
      updateNote(updated);
      setNote(updated);
      setLastSavedNote(updated);
      setUnsaved(false);
      if (!isAutoSave) {
        showToast.saved();
      }
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
      setDeleteDialogOpen(false);
      router.push("/");
      showToast.deleted();
    } catch {
      showToast.error("Failed to delete note");
    }
  };

  const handleAIAction = async (action: AIAction, customQuestion?: string) => {
    if (!content.trim() && action !== "ask") {
      showToast.error("Note content is empty");
      return;
    }

    const actionType = action === "ask" ? "ask" : action;
    setAiLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content:
            action === "ask"
              ? `${content}\n\nQuestion: ${customQuestion || question}`
              : content,
          action: actionType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI request failed");
      }

      const { result } = await response.json();

      if (action === "ask") {
        setAnswer(result);
      } else {
        setContent(result);
        checkIfUnsaved(title, result, tags);
        showToast.aiSuccess(action);
      }
    } catch (
      error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
      console.error("AI Error:", error);
      showToast.error(error.message || "Failed to process AI action");
    } finally {
      setAiLoading(false);
      setAskLoading(false);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      showToast.error("Please enter a question");
      return;
    }
    setAskLoading(true);
    handleAIAction("ask");
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    checkIfUnsaved(title, newContent, tags);

    // Add to history if not the same as current content
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      checkIfUnsaved(title, history[newIndex], tags);
      toast.success("Undo successful", { id: "undo" });
    } else {
      toast.error("Nothing to undo", { id: "undo" });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      checkIfUnsaved(title, history[newIndex], tags);
      toast.success("Redo successful", { id: "redo" });
    } else {
      toast.error("Nothing to redo", { id: "redo" });
    }
  };

  const handleSaveAndNavigate = () => {
    handleSave();
    if (navigationTarget) {
      router.push(navigationTarget);
    }
    setShowSavePrompt(false);
  };

  const handleDiscardAndNavigate = () => {
    setShowSavePrompt(false);
    if (navigationTarget) {
      router.push(navigationTarget);
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
              <Button
                variant="ghost"
                size={"icon"}
                onClick={() => handleNavigation("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              {unsaved && (
                <span className="h-3 w-3 bg-violet-500 rounded-full animate-pulse"></span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 pr-2"
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader className="w-4 h-4" />
                    ) : (
                      <>
                        <WandSparkles className="w-4 h-4 text-yellow-500" />
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
                    <FileText className="w-4 h-4 mr-2" />
                    Summarize
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("rewrite")}
                    disabled={aiLoading}
                  >
                    <PenLine className="w-4 h-4 mr-2" />
                    Rewrite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("grammar")}
                    disabled={aiLoading}
                  >
                    <SpellCheck2 className="w-4 h-4 mr-2" />
                    Fix Grammar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("expand")}
                    disabled={aiLoading}
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Expand
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAIAction("simplify")}
                    disabled={aiLoading}
                  >
                    <BookOpenCheck className="w-4 h-4 mr-2" />
                    Simplify
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 pr-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 shadow" align="end">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <Label htmlFor="auto-save" className="text-sm">
                      Auto Save
                    </Label>
                    <Switch
                      id="auto-save"
                      checked={autoSave}
                      onCheckedChange={setAutoSave}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/*ask dialog*/}
              <Dialog open={askDialogOpen} onOpenChange={setAskDialogOpen}>
                <DialogContent className="sm:max-w-[425px] p-0 border-0 bg-transparent shadow-none">
                  <div className="bg-background rounded-xl border p-6 space-y-4">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-medium">
                        Ask AI
                      </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAskSubmit} className="space-y-4">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask anything about this note..."
                        className="border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50"
                        disabled={askLoading}
                      />

                      {answer && (
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                          <p className="text-sm text-foreground/90">{answer}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={askLoading}
                        className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-sm"
                      >
                        {askLoading ? (
                          <>
                            <Loader className="text-white" />
                            Processing...
                          </>
                        ) : (
                          <span className="bg-gradient-to-r from-white/90 to-white/70 bg-clip-text text-transparent">
                            Ask AI
                          </span>
                        )}
                      </Button>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>

              {/*delete dialog*/}
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Note</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this note? This action
                    cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      className="shadow-none rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="shadow-none rounded-2xl"
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Save prompt dialog */}
          <Dialog open={showSavePrompt} onOpenChange={setShowSavePrompt}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                You have unsaved changes. Do you want to save before leaving?
              </p>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleDiscardAndNavigate}
                  className="shadow-none rounded-2xl"
                >
                  Discard
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowSavePrompt(false)}
                  className="shadow-none rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAndNavigate}
                  className="shadow-none rounded-2xl"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <input
            className="text-xl sm:text-2xl font-semibold w-full p-0 focus-visible:outline-none border-none"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title..."
          />

          <TagInput
            onChange={(tag) => {
              setTags(tag);
              checkIfUnsaved(title, content, tag);
            }}
            value={tags}
            suggestions={allTags}
          />

          <div className="flex-1 w-full rounded-md relative overflow-y-auto">
            <Textarea
              ref={textareaRef}
              className="h-auto min-h-[calc(100vh-460px)] w-full flex-1 rounded-ele border-none bg-transparent p-0 px-0 py-2 text-base shadow-none focus:outline-none md:min-h-[calc(100dvh-320px)] pb-[calc(100vh-460px)]"
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
                handleContentChange(e.target.value);
              }}
              onBlur={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex flex-row h-10 gap-0 mt-10 items-center relative">
            <Dialog open={askDialogOpen} onOpenChange={setAskDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="absolute left-0 h-full min-w-[100px] px-2 text-xs sm:text-sm"
                  style={{
                    borderRadius: 0,
                    clipPath:
                      "path('M100 6.83375C100 8.49902 99.3404 10.0754 98.4528 11.4843C96.8991 13.9503 96 16.8701 96 20C96 23.1296 96.8992 26.0488 98.4527 28.5145C99.3404 29.9236 100 31.5 100 33.1654V33.1654C100 36.9401 96.9401 40 93.1654 40H20C8.9543 40 0 31.0457 0 20V20C0 8.95431 8.95431 0 20 0H93.1662C96.9404 0 100 3.05957 100 6.83375V6.83375Z')",
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Ask
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button
              className="min-h-[calc(100%-5px)] min-w-[calc(100%-100px)] text-xs sm:text-sm rounded-full ml-auto"
              onClick={() => handleSave(false)}
              disabled={!unsaved || loading}
            >
              {loading ? (
                <>
                  <Loader className="text-background mr-2" /> Saving...
                </>
              ) : autoSave ? (
                "Auto Save On"
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
