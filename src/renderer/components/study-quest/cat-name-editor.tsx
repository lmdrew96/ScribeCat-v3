import { useCallback, useRef, useState } from 'react';

interface CatNameEditorProps {
  name: string;
  onRename: (name: string) => void;
}

export function CatNameEditor({ name, onRename }: CatNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setValue(name);
    }
    setEditing(false);
  }, [value, name, onRename]);

  const startEditing = useCallback(() => {
    setValue(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [name]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setValue(name);
            setEditing(false);
          }
        }}
        maxLength={20}
        className="bg-transparent border-b border-[var(--glass-border-strong)] text-sm font-medium text-foreground outline-none w-24 px-0 py-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[140px]"
      title="Click to rename"
    >
      {name}
    </button>
  );
}
