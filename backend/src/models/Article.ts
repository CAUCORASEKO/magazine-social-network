export interface Article {
  id: string;
  magazine_id: string;
  author_user_id: string;
  language_id: string;
  topic_id: string;
  status: "draft" | "submitted" | "published" | "rejected" | "archived";
  created_at: string;
  published_at: string | null;
  title: string;
  body: string;
}
