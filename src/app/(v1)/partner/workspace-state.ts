/** What every partner-workspace action returns. Messages are already translated. */
export interface WorkspaceState {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

export const IDLE_WORKSPACE_STATE: WorkspaceState = { status: "idle" };
