/**
 * The curator sign-in form's action state.
 *
 * Separate from actions.ts for the same reason as the contribute form's state:
 * a `"use server"` module may export only async functions. See
 * src/app/archive/contribute/state.ts.
 */
export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

export const LOGIN_INITIAL: LoginState = { status: "idle" };
