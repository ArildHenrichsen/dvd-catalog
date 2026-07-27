# Save timeout and cancellation

- Adds a 45-second timeout for save operations and 60 seconds for cover uploads.
- Shows operation status and errors beside the save/create button.
- Adds an **Avbryt** button while a request is active.
- Keeps all form values after timeout, failure, or cancellation.
- Handles empty or invalid server responses without leaving the button stuck.

Note: aborting a browser request cannot guarantee that the server did not finish the operation. The UI therefore asks the user to verify whether the change was saved before retrying.
