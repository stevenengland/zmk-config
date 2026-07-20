import { useEffect, useMemo, useState } from "react";
import { serialize, type KeymapDocument } from "../model/schema";

const UNTITLED_FILE_NAME = "Untitled";

export interface FileSession {
  filename: string;
  isDirty: boolean;
  markOpened: (document: KeymapDocument, filename: string) => void;
  markSaved: (document: KeymapDocument) => void;
}

export function useFileSession(document: KeymapDocument): FileSession {
  const [filename, setFilename] = useState(UNTITLED_FILE_NAME);
  const [savedFingerprint, setSavedFingerprint] = useState(() => serialize(document));
  const currentFingerprint = useMemo(() => serialize(document), [document]);
  const isDirty = currentFingerprint !== savedFingerprint;

  useEffect(() => {
    if (!isDirty) return;
    const protectUnsavedDocument = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedDocument);
    return () => window.removeEventListener("beforeunload", protectUnsavedDocument);
  }, [isDirty]);

  return {
    filename,
    isDirty,
    markOpened(openedDocument, openedFilename) {
      setFilename(openedFilename);
      setSavedFingerprint(serialize(openedDocument));
    },
    markSaved(savedDocument) {
      if (filename === UNTITLED_FILE_NAME) setFilename("keymap.json");
      setSavedFingerprint(serialize(savedDocument));
    },
  };
}
