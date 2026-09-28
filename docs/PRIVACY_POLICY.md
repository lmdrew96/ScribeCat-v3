# ScribeCat — Privacy Policy

**Effective Date:** September 27, 2026
**Version:** 1.1

---

## 1. Overview

ScribeCat ("the Service") is operated by ADHDesigns. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your data.

## 2. Data We Collect

### Data You Provide
- **Audio recordings** — captured from your device's microphone during recording sessions
- **Transcription text** — generated from your audio recordings
- **Notes and study content** — notes you write or that AI generates on your behalf
- **Study tool outputs** — flashcards, quizzes, summaries, concept maps, and other generated content
- **Chat messages** — messages sent to the AI chat assistant and in study room chats
- **Profile information** — display name, username, and avatar (via Clerk authentication)
- **Course information** — course names you add to your account
- **Uploaded documents** — photos, PDFs, and handwriting you upload for text extraction
- **Bug reports** — the title and description you write, plus your display name, browser details, app version, and the page you were on

### Data Collected Automatically
- **Account data** — email address and authentication tokens (managed by Clerk)
- **Session metadata** — recording duration, timestamps, note type selections
- **Study statistics** — study time, session counts, goal tracking, achievement progress
- **Presence data** — online/offline status for social features
- **Web traffic data** — your IP address and request details, seen by our hosting provider when your browser loads the app

### Data Stored on Your Device
- **Recording backup** — while you record, audio is kept temporarily in your browser's storage so it can be recovered if the tab crashes or closes. Each piece is cleared from your browser once it has been uploaded.
- **Preferences** — things like your chosen microphone and which "What's New" entries you've seen are stored in your browser only and never sent to us.

## 3. Third-Party Services

ScribeCat uses the following third-party services that receive your data:

| Service | Data Received | Purpose |
|---------|--------------|---------|
| **AssemblyAI** | Audio data (streamed or uploaded) | Real-time and batch transcription |
| **Anthropic (Claude AI)** | Transcription text, notes, chat messages, uploaded documents and images (no audio) | AI note generation, study tools, chat, document text extraction |
| **Clerk** | Email, authentication tokens | User authentication and session management |
| **Convex** | All application data | Backend database, real-time sync |
| **Cloudflare** | Audio recordings and uploaded documents/images (R2 storage); web traffic | File storage; application hosting, delivery, and bot protection |
| **GitHub** | Bug reports you submit | Bug tracking |
| **Google Fonts** | Your IP address and browser details, when fonts load | Serving the app's typefaces |

Audio data is sent to AssemblyAI's servers for transcription processing. Only the resulting text transcript is retained in ScribeCat — AssemblyAI does not store your audio after processing.

Anthropic never receives audio. It receives text (transcripts, notes, and chat messages), plus any documents or images you upload so their text can be extracted.

**Bug reports are public.** A report you send from the app is filed as an issue in ScribeCat's public GitHub repository, where anyone can read it. It includes your display name, browser details, and the page you were on, so don't put anything private in the description.

## 4. How We Use Your Data

We use your data to:

- Provide recording, transcription, and note-taking functionality
- Generate AI-powered study tools and chat responses
- Track your study progress, goals, and achievements
- Enable social features (friends, messaging, study rooms)
- Improve the Service

## 5. Data Storage

- **Application data** is stored in Convex's cloud infrastructure
- **Audio files** are stored in Cloudflare R2 as WebM blobs
- **Authentication data** is managed by Clerk's infrastructure
- All data is associated with your authenticated account

## 6. Data Retention

- **Audio recordings** are automatically deleted after your configured retention period (default: 6 months). You will be notified 7 days before automatic deletion.
- **Text content** (transcripts, notes, summaries) persists until you manually delete it
- **Deleted sessions** are moved to trash and permanently removed after 30 days
- **Account data** persists until you delete your account

## 7. Data Sharing

- We **do not sell** your data to third parties
- We **do not share** your data for advertising purposes
- Third-party services receive only the minimum data necessary for their function (see Section 3)
- Study room content is visible to room participants
- Sessions you share are visible to the people you share them with
- **AI assistant connections.** If you create an API key in Settings and connect an AI assistant (such as Claude) to the ScribeCat MCP server, that assistant can read your sessions, transcripts, notes, and course list. What it does with that data is governed by that assistant's own privacy policy. You can revoke a key at any time in Settings, which cuts off access immediately.

## 8. Your Rights

You have the right to:

- **Access** your data through the application interface
- **Delete** your recordings, notes, and sessions at any time
- **Export** your data (notes can be copied; audio can be played back)
- **Delete your account** by contacting us at nae@adhdesigns.dev

## 9. Children's Privacy

ScribeCat is not intended for children under 13 years of age. We do not knowingly collect data from children under 13 (COPPA compliance).

## 10. Security

We use industry-standard security practices including:

- Authenticated API access via Clerk JWT tokens
- HTTPS encryption for all data in transit
- Access controls ensuring users can only access their own data

## 11. Changes to This Policy

We may update this Privacy Policy periodically. Material changes will be communicated through the application. Continued use after changes constitutes acceptance.

## 12. Contact

For privacy questions or data requests, contact: **nae@adhdesigns.dev**
