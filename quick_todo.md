# Quick TODO
Just a few notes to keep track of tasks and ideas, quick todo notes. 
**DO NOT DELETE**


## Priority Tasks
1. Make sure profiles in the `profiles` folder are loaded in the `profiles-index.json` on startup and add a test to the test files to test this.
2. Make sure all data for a profile is stored in a folder named after the profile's ID inside the `profiles` folder. Do not store any profile data in the root `data` folder except for `profiles-index.json` and other global data files.
3. Implement a way to export and import profiles (including all their data) to/from a single file (e.g., ZIP or JSON).
4. Add a feature to allow users to set a default profile that is automatically loaded on app startup.
5. Implement a profile deletion feature that removes a profile and all its associated data from the filesystem.
6. Add validation to ensure that profile IDs are unique when creating or importing profiles.
7. Create a backup and restore feature for profiles to prevent data loss.
8. Implement a profile renaming feature that updates the profile ID and all associated data accordingly.
9. Add logging for profile-related operations (creation, deletion, loading) to help with debugging and auditing.
10. Write comprehensive tests for all profile management functionalities to ensure reliability.

## Low Priority Tasks
1. Create a login system upon first startup and a "Remember Me" feature. For now it will just create a username and password and store it in a local file in the user's data directory.
2. Implement user roles (e.g., admin, user) with different permissions for accessing certain features.
3. Add a feature to allow users to change their password.
4. Add a bare base UI for the profile menu for user to customize profiles.
5. Implement session management and  timing.
6. Create a `users` folder to store user data separately from profiles.
7. Add a field in a profile config file to link it to a specific user.
8. When users login, only profiles associated with that user should be accessible.
9. Create an developer login system with elevated permissions for debugging and testing purposes as well as accessing all profiles.
10. Create a "Pal Creation" menu to customize and create new AI pals with detailed settings and customization options. If a user is a developer, allow a checkbox to make a pal a "developer pal" with access to advanced features.
11. Implement a feature to allow users to share profiles with other users, possibly through exporting and importing.

### Note for Contributors
Please ensure that any changes related to profile management are thoroughly tested and documented. Follow best practices for file I/O operations to prevent data corruption, especially when dealing with multiple profiles.

When a task is completed, please mark it off the list to help keep track of progress. Thank you for your contributions!