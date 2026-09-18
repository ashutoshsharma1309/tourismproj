/** What a console action returns to its form. Messages are already translated. */
export interface ConsoleState {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string>;
}

export const IDLE_CONSOLE_STATE: ConsoleState = { status: "idle" };
