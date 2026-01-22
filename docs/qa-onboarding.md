# Onboarding Gate QA Checklist

- Register a new user and confirm they land on `/onboarding` after login.
- While `account_status` is `pending`, `/write` should redirect to `/onboarding`.
- While `account_status` is `pending`, `POST /magazines` returns `403` with `{ "error": "Onboarding required" }`.
- Complete onboarding and confirm the user can access `/write` and create magazines/articles.
