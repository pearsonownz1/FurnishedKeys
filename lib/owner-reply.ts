import { z } from "zod";

export const replySchema = z.object({
  inquiryId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
});

export type ReplyActionState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
};

export const REPLY_SIGN_IN = "Sign in again.";
export const REPLY_BODY = "Write a reply between 1 and 8000 characters.";
export const REPLY_MISSING = "That inquiry is not on your board.";

export function replyFormError(error: z.ZodError): string {
  const path = error.issues[0]?.path[0];
  return path === "body" ? REPLY_BODY : REPLY_MISSING;
}
