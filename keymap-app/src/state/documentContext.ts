import { createContext, type Dispatch } from "react";
import type { DocumentAction, DocumentState } from "./documentReducer";

export interface DocumentStore {
  state: DocumentState;
  dispatch: Dispatch<DocumentAction>;
}

/** Document state + dispatch shared with descendant components. */
export const DocumentContext = createContext<DocumentStore | null>(null);
