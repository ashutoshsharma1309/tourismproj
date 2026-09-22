/** What a booking action returns to its form. Messages are already translated. */
export interface BookingFormState {
  status: "idle" | "ok" | "error";
  message?: string;
}

export const IDLE_BOOKING_STATE: BookingFormState = { status: "idle" };
