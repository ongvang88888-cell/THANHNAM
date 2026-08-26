"use client";

type FileDropProps = {
  accept: string;
  disabled?: boolean;
  label: string;
  hint: string;
  multiple?: boolean;
  onFile: (file: File) => void;
  onFiles?: (files: File[]) => void;
};

export function FileDrop({ accept, disabled, label, hint, multiple, onFile, onFiles }: FileDropProps) {
  return (
    <label className={`file-drop${disabled ? " is-disabled" : ""}`}>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          const list = event.target.files;
          const files = list ? Array.from(list) : [];
          event.target.value = "";
          if (files.length === 0) return;
          if (multiple && onFiles) {
            onFiles(files);
            return;
          }
          const first = files[0];
          if (first) onFile(first);
        }}
      />
      <strong>{label}</strong>
      <span className="muted">{hint}</span>
    </label>
  );
}
