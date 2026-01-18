export interface User {
  id: string;
  full_name: string;
  email: string;
  professional_background: string;
  ui_language_id: string;
  status: "active" | "suspended";
}