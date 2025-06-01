# Privacy Policy

**Last updated: [May 2, 2025]**

**DEADFORGE**, developed by **DEADCODE**, respects your privacy. This app is designed with privacy in mind and does **not collect, track, or store any personal data externally**.

## What DEADFORGE Does:

- **Stores user settings and data locally** on your device
  - User preferences are stored in a JSON file
  - Other user data is stored in a SQLite database
- **Checks for updates** using the GitHub Releases API via `electron-updater`.
- **Downloads static image assets** for user-added software from services like [itch.io] (and potentially Steam or Epic Games).
- **Optionally integrates with Discord Rich Presence**, if enabled in settings.

## What DEADFORGE Doesn’t Do:

- It **does not collect or transmit any personal data** to DEADCODE or third parties.
- It does **not track your behavior**, usage, or activity.
- It does **not include third-party analytics**, ads, or tracking scripts.

## Third-Party Services:

While DEADFORGE itself does not collect data, it interacts with the following external services:

- **GitHub API** – for checking and downloading updates.
- **itch.io** – for fetching image assets.
- **Discord API** (optional) – for displaying Rich Presence if the user enables it.

These services may have their own privacy policies. DEADFORGE does **not** send your personal data to them.

## Data Storage

All user data stays on your device. This includes:

- App settings (stored in a JSON file)
- User-added software information (stored in a SQLite database)

This data can be exported / imported in the settings menu: 
- **Settings** → **App Data & Updates** → **Export**
- **Settings** → **App Data & Updates** → **Import**

This data can be deleted:

- Manually:

  - The data is stored at `%APPDATA%/deadforge`
  - `preferences.json` stores user settings.
  - The `db/` folder contains the `user.sqlite3` file with user-added software info.

- Automatically

  - **Settings** → **App Data & Updates** → **Reset**

## Age Restrictions

DEADFORGE is a general-purpose software launcher. However, user-added software or content available via the DEADFORGE Store may have their own age restrictions. Use responsibly.

## Distribution

DEADFORGE is available via GitHub and the official DEADFORGE website.

- [https://github.com/DeadCodeGames/DeadForge](https://github.com/DeadCodeGames/DeadForge)
- [https://deadcode.is-a.dev/DeadForge](https://deadcode.is-a.dev/DeadForge)

All downloads from the aforementioned sources are direct and transparent. Any downloads from other sources are not controlled by us, and may contain harmful or privacy-invading code. Download responsibly.

---

If you have questions, suggestions, or concerns about privacy, feel free to contact us via:

- The discussions tab in the GitHub Repository - [DeadCodeGames/DeadForge, section Discussions](https://github.com/DeadCodeGames/DeadForge/discussions)
- Our email - [404@mail.deadcode.is-a.dev](mailto:404@mail.deadcode.is-a.dev)