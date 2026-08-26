"use client";

type FileDropProps = {
  accept: string;
  disabled?: boolean;
  label: string;
  hint: string;
  onFile: (file: File) => void;
};

export function FileDrop({ accept, disabled, label, hint, onFile }: FileDropProps) {
  return (
    <label className={`file-drop${disabled ? " is-disabled" : ""}`}>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <strong>{label}</strong>
      <span className="muted">{hint}</span>
    </label>
  );
}
