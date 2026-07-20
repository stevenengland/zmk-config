import { createContext, useContext } from "react";

export interface FeedbackActions {
  success: (text: string) => void;
  error: (text: string) => void;
  clear: () => void;
}

export const FeedbackContext = createContext<FeedbackActions | null>(null);

export function useFeedback(): FeedbackActions {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("useFeedback must be used within FeedbackProvider");
  return feedback;
}
