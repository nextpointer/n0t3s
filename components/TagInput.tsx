import { X } from "lucide-react";
import { useState, useRef, type KeyboardEvent, type FocusEvent } from "react";

export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // for add a tag
  function addTag(tag: string) {
    const newTag = tag.trim();
    if (!newTag) return;
    onChange([...value, newTag]);
    setInput("");
  }

  // for remove a tag
  function removeTag(index: number) {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  }

  // for update tag
  function updateTag(index: number, newTag: string) {
    const newTags = [...value];
    newTags[index] = newTag;
    onChange(newTags);
  }

  // for writing any new tag
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }

    // backspace key for delete corressponding last tags
    if (e.key === "Backspace" && input.trim() === "") {
      if (value.length > 0) {
        const newTags = [...value];
        newTags.pop();
        onChange(newTags);
      }
    }
  }

  // fires when user double click any tag and edit that
  function handleEditKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditedTag(index);
    }
  }

  // save the tag
  function saveEditedTag(index: number) {
    const newTag = value[index].trim();
    // if there is no new tag the tag removed
    if (!newTag) {
      removeTag(index);
      return;
    }
    updateTag(index, newTag);
    setEditingIndex(null);
  }

  // for autofocus the input
  function handleContainerClick() {
    inputRef.current?.focus();
  }

  function handleFocus() {
    setFocused(true);
  }

  // for handling if the focus of the container loses
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    // if the focus set to any child of that container then the focus never loses
    if (
      e.relatedTarget &&
      (e.currentTarget as Node).contains(e.relatedTarget as Node)
    ) {
      return;
    }
    setFocused(false);
  }

  return (
    <div
      className="min-w-full flex flex-wrap gap-2 cursor-text items-start text-[12px] border p-2 rounded-xl "
      onClick={handleContainerClick}
      onBlur={handleBlur}
      tabIndex={-1}
    >
      {value.map((tag, index) => (
        <span
          key={index}
          className="flex items-center bg-border px-2 py-1 rounded-full"
        >
          {editingIndex === index ? (
            <input
              className="outline-none border-none bg-transparent"
              value={tag}
              autoFocus
              onFocus={handleFocus}
              onChange={(e) => updateTag(index, e.target.value)}
              onKeyDown={(e) => handleEditKeyDown(e, index)}
              onBlur={() => saveEditedTag(index)}
            />
          ) : (
            <span
              className="select-none"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingIndex(index);
              }}
            >
              {tag}
            </span>
          )}
          {focused && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                removeTag(index);
              }}
              className="ml-1 transition-opacity cursor-pointer rounded-full bg-foreground text-background p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}

      <input
        ref={inputRef}
        className="border-none p-0 w-auto flex-shrink outline-none py-1 border"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      />
    </div>
  );
}
