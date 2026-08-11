# ScribeCat — Privacy Policy

**Effective Date:** April 8, 2026
**Version:** 1.0

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

### Data Collected Automatically
- **Account data** — email address and authentication tokens (managed by Clerk)
- **Session metadata** — recording duration, timestamps, note type selections
- **Study statistics** — study time, session counts, goal tracking, achievement progress
- **Presence data** — online/offline status for social features

## 3. Third-Party Services

ScribeCat uses the following third-party services that receive your data:

| Service | Data Received | Purpose |
|---------|--------------|---------|
| **AssemblyAI** | Audio data (streamed or uploaded) | Real-time and batch transcription |
| **Anthropic (Claude AI)** | Transcription text, notes, chat messages (no audio) | AI note generation, study tools, chat |
| **Clerk** | Email, authentication tokens | User authentication and session management |
| **Convex** | All application data | Backend database, real-time sync |
| **Cloudflare R2** | Audio recordings, uploaded documents/images | File storage |
| **Vercel** | Web traffic | Application hosting and delivery |

Audio data is sent to AssemblyAI's servers for transcription processing. Only the resulting text transcript is retained in ScribeCat — AssemblyAI does not store your audio after processing.

Anthropic receives only text data (transcripts and notes), never audio files.

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
