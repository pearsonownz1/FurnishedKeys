/** Shown only after a database insert fails. Success is a separate state. */
export const SEND_FAILURE = "We couldn't send this. Please try again.";

export function logInsertError(
  table: "owner_leads" | "inquiries",
  error: { message: string; code?: string },
): string {
  console.error(`${table} insert failed`, error.code ?? "error", error.message);
  return SEND_FAILURE;
}
