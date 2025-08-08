import { X } from "lucide-react";
import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

// props type
interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

// Tag input component with suggestions and inline editing support(main component)
export function TagInput({ value, onChange, suggestions }: Props) {
  const [input, setInput] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and existing tags
  const filteredSuggestions = suggestions.filter(
    (sug) =>
      input.length > 0 &&
      sug.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(sug),
  );

  // Add a new tag
  function addTag(tag: string) {
    const newTag = tag.trim();
    if (!newTag) return;
    onChange([...value, newTag]);
    setInput("");
    setHighlightedIndex(-1);
    setShowSuggestions(false);
  }

  // Remove a tag by index
  function removeTag(index: number) {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  }

  // Update an existing tag
  function updateTag(index: number, newTag: string) {
    const newTags = [...value];
    newTags[index] = newTag;
    onChange(newTags);
  }

  // Handle key events inside the input
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const hasSuggestions = filteredSuggestions.length > 0;

    if ((e.key === "Enter" || e.key === ",") && input.trim() !== "") {
      e.preventDefault();
      if (highlightedIndex >= 0 && hasSuggestions) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(input);
      }
    }

    // Navigate suggestions
    if (e.key === "ArrowDown" && hasSuggestions) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
      );
    }

    if (e.key === "ArrowUp" && hasSuggestions) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
      );
    }

    // Delete last tag on backspace if input is empty
    if (e.key === "Backspace" && input.trim() === "") {
      if (value.length > 0) {
        const newTags = [...value];
        newTags.pop();
        onChange(newTags);
      }
    }
  }

  // Save tag when editing and press Enter
  function handleEditKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditedTag(index);
    }
  }

  // Finalize edited tag
  function saveEditedTag(index: number) {
    const newTag = value[index].trim();
    if (!newTag) {
      removeTag(index);
      return;
    }
    updateTag(index, newTag);
    setEditingIndex(null);
  }

  // Focus input when container is clicked
  function handleContainerClick() {
    inputRef.current?.focus();
  }

  function handleFocus() {
    setFocused(true);
  }

  // Handle blur to close suggestions
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (
      e.relatedTarget &&
      (e.currentTarget as Node).contains(e.relatedTarget as Node)
    ) {
      return;
    }
    setFocused(false);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }

  // Toggle suggestions when input changes
  useEffect(() => {
    if (input.trim() !== "") {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input]);

  return (
    <div
      className="relative flex flex-wrap gap-2 cursor-text items-start text-[12px] rounded-xl w-full border border-border p-2"
      onClick={handleContainerClick}
      onBlur={handleBlur}
      tabIndex={-1}
    >
      {/* Render tags */}
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
          {/* Remove tag button */}
          {focused && (
            <button
              type="button"
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

      {/* Input field */}
      <div className="relative flex-grow min-w-[100px]">
        <input
          enterKeyHint="done"
          ref={inputRef}
          className="outline-none border-none py-1 w-full bg-transparent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          name="tags"
          id="tag-input"
          autoComplete="off"
        />

        {/* Suggestion dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto text-popover-foreground">
            {filteredSuggestions.map((sug, i) => (
              <div
                key={sug}
                className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                  i === highlightedIndex
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(sug);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {sug}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
