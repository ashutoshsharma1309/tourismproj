/** The state a partnership request form moves through. Client and server share it. */
export interface ApplyState {
  status: "idle" | "error" | "success";
  message?: string;
  /** Field name → first validation message. */
  errors?: Record<string, string>;
  /** Echoed back so a rejected submission keeps what was typed. */
  values?: Record<string, string>;
}

export const INITIAL_APPLY_STATE: ApplyState = { status: "idle" };
