import { createContext, type Dispatch } from "react";
import type { DocumentHistoryAction, DocumentHistoryState } from "./documentReducer";

export interface DocumentStore {
  state: DocumentHistoryState;
  dispatch: Dispatch<DocumentHistoryAction>;
}

/** Document state + dispatch shared with descendant components. */
export const DocumentContext = createContext<DocumentStore | null>(null);
