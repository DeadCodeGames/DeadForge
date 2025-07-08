# Privacy Policy
**Last updated: [July 08, 2025]** <!-- 2025-07-08T11:27:53.140Z -->

**DEADFORGE**, developed by **DEADCODEGAMES**, respects your privacy. This app is designed with privacy in mind and does **not collect, track, or store any Personal Data, User Data, or App Data externally**. This means your data never leaves your device unless you choose to share it manually (_see **Manual Action**_).

## Jurisdiction
DEADCODEGAMES is an informal student developer group based in Slovakia, a member country of the European Union. This Privacy Policy is governed by Slovak and EU law.
As an EU-based project, this Privacy Policy complies with the General Data Protection Regulation (GDPR) (EU) 2016/679. Under GDPR, data protection rights apply to any individual whose data is processed in the EU, regardless of their country of residence. Therefore, this policy applies to all users.

## Definitions
- **Personal Data**, **Personal Information**, or **Personally Identifiable Information**: Any information that can identify an individual, such as a name, email, IP address, or device ID.
- **Manual Action**: A deliberate user action such as clicking a submit button, sending an email, or uploading a file.
- **User Data**: Information created or imported by the user, such as collections, preferences, and software database entries. While DEADFORGE does not request or collect personal information, users may choose to manually edit files containing User Data to also include Personal Data. This data remains stored locally unless shared manually.
- **App Data**: Information created by the app automatically as part of its regular function. This data contains no Personal Data and is not transmitted externally.
- **Developer/Community Data**: Articles, warnings, and notes maintained by developers or the community, not tied to individual users.
- **Third-Party Services**: External APIs or services DEADFORGE interacts with, such as GitHub or Discord.
- **Planned** or **Future Feature**: A functionality, or part of the app's functionality, which is not yet implemented, but is planned to be implemented in the foreseeable future.
- **DEADFORGE Store** or **Store**: A storefront for software created by **DEADCODEGAMES** and other associated parties, available publicly on the web, or DEADFORGE, section Store.

## Your Rights

As an individual whose data may be processed within the European Union, you are entitled under the General Data Protection Regulation (GDPR) to the following rights:

- **Right of Access** – You can view all data stored by DEADFORGE through the export function or by manually browsing the local files on your device. (_More in the **Data Storage** section._)
- **Right to Erasure** – You can delete all your data using the in-app reset function or by manually deleting the local files stored on your device. (_More in the **Data Storage** section._)
- **Right to Rectification** – If you believe any stored data is inaccurate or outdated, you may edit it directly using the app or your local file manager.
- **Right to Restrict Processing** – As DEADFORGE does not process your data externally or automatically, this right is inherently respected by design.
- **Right to Data Portability** – You may export your data at any time in a readable format (such as JSON or SQLite).
- **Right to Object** – DEADFORGE does not process data for marketing, profiling, or analytics, so this right does not typically apply, but you may contact us with any concerns.
- **Right to Withdraw Consent** – Any future features involving external processing (such as private key validation) will require your explicit consent. You may revoke this at any time before using those features.
- **Right to Lodge a Complaint** – If you believe your rights under GDPR have been violated, you have the right to lodge a complaint with your local data protection authority. In Slovakia, this is the Office for Personal Data Protection (Úrad na ochranu osobných údajov).

If you have any questions or concerns regarding your data or privacy rights, please contact us at [404@mail.deadcode.is-a.dev](mailto:404@mail.deadcode.is-a.dev), and we will do our best to assist you.

_These rights apply to all users, regardless of their country of residence, in accordance with EU law._

## What DEADFORGE Does

DEADFORGE is designed to operate primarily offline and locally, minimizing data collection and external communication. The following describes the app’s current and planned data-related functionality:

### ✅ Local Data Storage

All settings and user-created content are stored locally on your device:

- **User Preferences & Collections**: Saved in `preferences.json` and `collections.json` files respectively within the app's data directory. These are not sent over the internet. (_More in the **Data Storage** section._)
- **User Software Database Entries**: Stored in a local SQLite database, located at `db/user.sqlite3`. This includes user-added software metadata and preferences. (_More in the **Data Storage** section._)
- **Window State**: The last known window position and size are stored in `window-state.json`. This file does not contain any Personal Data or User Data, and is created automatically by the program.
- **Developer & Community Content**: Articles, warnings, and notes are downloaded as part of the app experience, but are not tied to individual users and are not considered Personal Data.
- **Missing Asset Info**: If software entries are missing artwork, this information is stored locally (e.g., which image is missing for a given store ID). You may choose to submit this information manually via a GitHub issue. No sensitive or personal data is included. This info is stored in `missingAssetsReport[TIMESTAMP].txt` files in the app's data directory.

### 🔄 Update Checks _(Planned)_

- DEADFORGE will regularly check for updates using the GitHub Releases API. This check will only retrieve info about DEADFORGE's release history, and does **not** transmit any data from your device. It uses standard, anonymous HTTP requests.

### 🖼️ External Image Downloads

- If a user adds software from platforms like itch.io, Steam, or Epic Games, DEADFORGE may download associated artwork (e.g., icons, banners, headers, logos, etc.) from a curated list, created by developers and the community. This list may contain images hosted by Third-Party Services. These Services may log IP addresses as part of standard HTTP delivery. No user-identifiable data is sent from DEADFORGE to these services.

### 🟣 Discord Integration _(Planned)_

- If you choose to enable Discord Rich Presence, DEADFORGE will send basic, non-personal information (such as version number and launch time) to Discord’s API. This feature is entirely optional and disabled by default.  
- **Legal Basis**: This processing is based on your **explicit consent**, in line with GDPR Article 6(1)(a).

### 🔐 Private Software Key Validation _(Planned)_

- Some **hidden** software in the built-in DEADFORGE Store may require a private key to access. These keys are defined and managed by the software’s developers. Most software remains public and key-free.
- If you enter a key, DEADFORGE will:
  - Hash the key locally (for security)
  - Send the **hashed key** and **software ID** to a Vercel-hosted API to validate the license
  - Store the hashed key locally on your device
- No raw keys, usernames, or personal identifiers are transmitted. If your device is compromised, you should treat these stored key hashes as compromised and request revocation via the manager of DEADFORGE Store. (_More in the **Data Security** section._)

- **Legal Basis**: This processing is optional, initiated by your **explicit request and consent**, and only occurs if you choose to use hidden software from the Store.

## What DEADFORGE Doesn't Do

DEADFORGE is built with privacy in mind and is designed to minimize data collection by default. Specifically:

- ❌ It does **not automatically collect, process, or transmit any Personal Data** to DEADCODEGAMES or any third party.
- ❌ It does **not track your activity, usage, or behavior** in the app.
- ❌ It does **not include third-party analytics**, advertising networks, or tracking scripts.
- ❌ It does **not automatically send crash logs, error reports, or telemetry**. If a crash occurs, you may choose to submit a GitHub issue, which requires **Manual Action**.

🛡️ DEADFORGE follows the GDPR principles of:
- **Data minimization** – Only what’s necessary is used
- **Local processing** – Data stays on your device by default
- **Privacy by default and design** – External communications are strictly optional and consent-based

## Third-Party Services

While DEADFORGE does not collect or transmit any Personal Data automatically, certain features rely on third-party services for functionality. These interactions are limited, transparent, and user-controlled.

| Service | Purpose | Data Sent | Legal Basis | Notes |
|--------|---------|-----------|-------------|-------|
| **GitHub API** & **GitHub Pages** | To check for updates (Plannned) and download software | No user-identifying data is sent. Standard HTTP GET requests only. | Legitimate interest (GDPR Art. 6(1)(f)) | GitHub may log your IP address as part of normal server operation |
| **Discord API** _(Planned, optional)_ | To show Rich Presence status if enabled by the user | App version and launch time only (no personal identifiers) | Consent (GDPR Art. 6(1)(a)) | Disabled by default |
| **Vercel API** _(Planned, optional)_ | To validate private software keys entered by the user and download private software | Hashed key + software ID only | Consent (GDPR Art. 6(1)(a)) | Only triggered if user submits a key |
| **External Image Hosting (e.g., itch.io, Steam)** | To download artwork for user-added software | No personal data sent, but your IP address may be logged by the image host | Legitimate interest (GDPR Art. 6(1)(f)) | Standard web requests initiated by the app |

Each of these services has its own Privacy Policy:

- [GitHub Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)
- [Discord Privacy Policy](https://discord.com/privacy)
- [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)
- Image services may have separate policies depending on the content source.

📌 **Important:** These services only receive data **if required for the specific feature**, and never include your name, email, or other identifying information. All interactions are either **read-only** or require **explicit, manual action by the user**.


## Data Storage

All User Data and App Data is stored **locally on your device** and is never uploaded or shared automatically. You are always in full control of your data. Unless you choose to submit it manually (e.g. via a GitHub issue), your data remains private and offline.

The following data is stored:

| File / Database | Type | Description |
|-----------------|------|-------------|
| `preferences.json` | User Data | App settings and configuration |
| `collections.json` | User Data | Your curated collections of software |
| `db/user.sqlite3` | User Data | User-added software entries and related metadata |
| `window-state.json` | App Data | Last known window size and position (non-personal) |
| Developer/community content | Developer/Community Data | Articles, warnings, and notes included or updated by developers/community (not linked to User Data) |
| Missing asset info | App Data (based on User Data) | Locally stored notes about which artwork (e.g. `icon`, `logo`) is missing for a given software ID from a known storefront (e.g. Steam, itch.io) |

🗂️ You can export or import your data using the in-app settings menu:

- **Settings** → **App Data & Updates** → **Export**
- **Settings** → **App Data & Updates** → **Import**

🗑️ You can delete data:

- **Manually**: Delete files from `%APPDATA%/deadforge`  
- **Automatically** (User Data only):  
  - **Settings** → **App Data & Updates** → **Reset**

## Data Security

DEADFORGE stores all data locally on your device in plaintext formats such as JSON and SQLite. This provides transparency and easy access, but it also means:

- The data is **not encrypted** by default. Anyone with access to your device may be able to read or modify it.
- If you use private keys for software access (planned feature), these keys will be hashed and stored locally. The original key is never stored or transmitted.
- If your device is compromised (e.g., malware, theft), treat your stored private keys as compromised and contact us at [404@mail.deadcode.is-a.dev](mailto:404@mail.deadcode.is-a.dev) to request revocation (if supported by the software developer).
- DEADFORGE does **not send any data externally** unless you explicitly choose to do so (e.g., submitting an issue on GitHub).
- Update checks are done via anonymous HTTP requests with **no custom headers or tracking parameters**.

🔐 While DEADFORGE does not offer encryption or sandboxing, we strongly recommend you protect access to your device using appropriate system-level security (such as user account passwords, encryption, or antivirus software).

## Data Retention

- All data is stored locally on your device and remains there until you choose to delete it.
- You may delete your data at any time using the in-app reset feature or by manually removing files.
- DEADCODEGAMES does **not retain any of your data**, nor do we collect it unless you submit it intentionally (e.g., via GitHub).
- Third-Party Services do not receive or store any of your data except as described in the Third-Party Services section (and only with your consent or Manual Action).

## Age Guidance

DEADFORGE is a general-purpose software launcher and does not target any specific age group. We do not collect age or date of birth, and we do not process any data for age verification purposes.

However, we recommend the following guidance for users and guardians:

- Developer-written articles within DEADFORGE may contain informal or mature language.
- User-imported content (e.g., from Steam, itch.io, or Epic Games) may carry age ratings or mature themes. DEADFORGE does not filter or verify this content. Users are responsible for ensuring that any external software is appropriate for their age.
- **Planned**: DEADFORGE may support display of **PEGI, CERO, and ESRB ratings** for imported software. These ratings are optional, user-submitted, and require proof of the official rating (such as a verified retailer listing). These ratings are displayed for informational purposes only and are not affiliated with the respective rating boards.
- **Planned**: Software published in the DEADFORGE Store may be labeled using an independent, community-defined rating system inspired by PEGI/CERO/ESRB guidelines. These ratings are for guidance only, and are unaffiliated with official rating bodies.

Any selected rating system preference is stored locally and does not contain age information.

## Distribution

DEADFORGE is distributed exclusively through trusted and official sources:

- [DeadCodeGames/DeadForge GitHub Repository](https://github.com/DeadCodeGames/DeadForge)
- [deadcode.is-a.dev/DeadForge](https://deadcode.is-a.dev/DeadForge)

Any other source (e.g., third-party mirrors, file-sharing sites) is **not affiliated with DEADCODEGAMES** and may pose a security or privacy risk.  
🔒 To stay safe, always download DEADFORGE from one of the verified sources above.

## Policy Updates

This Privacy Policy may change over time as the app evolves or as new privacy features are added.

When this happens, users will be notified through:
- An announcement on the DEADFORGE homepage
- The in-app notification system (once implemented)

We encourage users to review this policy periodically to stay informed about how their data is handled.  
The "Last Updated" date at the top of this page reflects the latest revision.

## Contact

If you have any questions, privacy concerns, or requests regarding your data rights under GDPR, please contact us:

- Via the GitHub Discussions tab: [DeadCodeGames/DeadForge – Discussions](https://github.com/DeadCodeGames/DeadForge/discussions)
- By email: [404@mail.deadcode.is-a.dev](mailto:404@mail.deadcode.is-a.dev)

We aim to respond to all privacy-related inquiries within a reasonable timeframe.  
As a student-run project, we appreciate your patience.

If you believe your data protection rights have been violated, you may also contact your local data protection authority. In Slovakia, this is the [Office for Personal Data Protection](https://dataprotection.gov.sk/en) ([Úrad na ochranu osobných údajov](https://dataprotection.gov.sk/sk/)).