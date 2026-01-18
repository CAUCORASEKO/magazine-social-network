export interface Magazine {
  id: string;
  title: string;
  description: string | null;
  primary_topic_id: string;
  primary_language_id: string;
  owner_user_id: string;
  status: "active" | "archived";
  created_at: string;
}
