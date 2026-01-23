import { IdentityStatus } from "../constants/verification";

export interface User {
  id: string;
  full_name: string;
  email: string;
  professional_background: string;
  ui_language_id: string;
  country: string | null;
  account_status: "pending" | "active";
  identity_status: IdentityStatus;
  identity_verified_at: string | null;
  identity_score: number | null;
}
