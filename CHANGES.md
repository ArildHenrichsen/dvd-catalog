# Existing cover analysis

- Visual cover analysis can now use the already stored cover when editing an existing DVD.
- A newly selected cover file takes priority over the stored cover.
- The server resolves the cover path from the release ID and downloads it from the private Supabase Storage bucket.
- No database migration or new environment variable is required.
