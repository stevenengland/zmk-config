import { createContext, useContext, type Dispatch } from "react";
import type { DocumentAction, DocumentState } from "./documentReducer";

export interface DocumentStore {
  state: DocumentState;
  dispatch: Dispatch<DocumentAction>;
}

export const DocumentContext = createContext<DocumentStore | null>(null);

/** Read the document store from context; throws when used outside its provider. */
export function useDocument(): DocumentStore {
  const store = useContext(DocumentContext);
  if (store === null) {
    throw new Error("useDocument must be used within a DocumentContext provider");
  }
  return store;
}
