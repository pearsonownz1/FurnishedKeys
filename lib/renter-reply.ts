export type RenterReplyState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
};

export const RENTER_EXPIRED = "This link has expired. Open the newest email from the owner.";
export const RENTER_BODY = "Write a reply between 1 and 8000 characters.";
export const RENTER_LIMIT = "Please wait before sending another message.";
export const RENTER_SEND = "We couldn't send this. Please try again.";
