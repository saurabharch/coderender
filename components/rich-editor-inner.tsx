"use client";

import { useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { ClassicEditor } from "ckeditor5";
import "ckeditor5/ckeditor5.css";

export function RichEditorInner({ value, onChange, placeholder, onFail }: {
  value: string; onChange: (html: string) => void; placeholder?: string; onFail: () => void;
}) {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    return () => {};
  }, []);
  try {
    return (
      <CKEditor
        editor={ClassicEditor as never}
        data={value}
        config={{
          toolbar: ["bold", "italic", "underline", "|", "bulletedList", "numberedList", "|", "link", "|", "undo", "redo"],
          placeholder: placeholder ?? "Write…",
        }}
        onError={() => onFail()}
        onChange={(_e: unknown, editor: { getData: () => string }) => {
          ref.current(editor.getData());
        }}
      />
    );
  } catch {
    onFail();
    return null;
  }
}
