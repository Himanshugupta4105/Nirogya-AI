# Nirogya AI Node.js backend

Express API for authenticated health-record upload, server-side image OCR, PDF text extraction, and private Supabase storage.

## What it supports

- JPG and PNG: extracts text with Tesseract.js.
- Text-based PDFs: extracts selectable text with PDF.js.
- Scanned PDFs: saves the PDF and reports `no_text_layer`; rendering PDF pages into images for OCR is not part of this scaffold.
- Supabase Postgres: stores file metadata and extracted text in `health_records`.
- Supabase Storage: stores source files in a private `health-records` bucket.
- Supabase Auth: every record API route requires a valid user access token.

Extracted text is health information. Treat it as sensitive and verify it against the original file; OCR and PDF extraction may be incomplete or incorrect.

## Setup

### 1. Create the Supabase schema and private bucket

1. Open your Supabase project’s **SQL Editor**.
2. Run [`supabase-schema.sql`](./supabase-schema.sql), then [`supabase-auth-care-schema.sql`](./supabase-auth-care-schema.sql).
3. Enable email/password and phone authentication in **Authentication → Providers**, configure email and SMS delivery, and allow the React app’s redirect URLs.

The SQL creates a private Storage bucket and enables row-level security on the records table. The Node API verifies the supplied access token and scopes all service-role database queries by the authenticated user ID.

### 2. Configure environment variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

- `SUPABASE_URL`: Project URL from **Project Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service-role/secret key from the Supabase project.
- `CORS_ORIGINS`: exact comma-separated origins for your frontend, such as `http://localhost:5500`.

Never put the service-role key in browser JavaScript, commit `.env`, or share it with Antigravity prompts. If the key was exposed, rotate it in Supabase.

### 3. Install and run

Use Node.js 22 or newer.

```powershell
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. `GET /api/health` checks that the server is running; it does not check Supabase credentials or bucket setup.

## API

All routes except `/api/health` and `/api/auth/username-login` require:

```http
Authorization: Bearer <Supabase user access token>
```

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/auth/username-login` | Resolve a username and return a standard Supabase Auth session |
| `POST` | `/api/records/upload` | Upload one image or PDF using multipart field `file`; optional `recordType` is `report`, `prescription`, `visit_note`, or `other` |
| `GET` | `/api/records` | List the signed-in user’s latest 100 records and extracted text |
| `GET` | `/api/records/:id/file` | Create a 60-second signed download link for an owned record |
| `DELETE` | `/api/records/:id` | Delete the user’s source file and its database row |

Upload limit: 10 MB, one file per request. Accepted file contents are PDF, JPEG, or PNG; the server checks the file signature as well as the extension/MIME type.

Example browser upload after the user has signed in with Supabase:

```js
const { data: { session } } = await supabase.auth.getSession();
const body = new FormData();
body.append('file', selectedFile);
body.append('recordType', 'report');

const response = await fetch('http://localhost:4000/api/records/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || 'Upload failed');
console.log(result.record, result.message);
```

Do not manually set the multipart `Content-Type` header; the browser adds its boundary.

## Connect the existing Nirogya AI frontend

The current frontend is a demo and does not have a Supabase sign-in flow yet. To use these protected routes, configure a Supabase browser client with the **publishable/anon key only**, add sign-in, and pass the active user’s `session.access_token` as shown above. The server refuses unauthenticated requests by design.

The React account, women’s care, and video-call feature app is documented in [`../react-app/README.md`](../react-app/README.md). It uses the username-login route and supplemental auth/care schema.

The requested React account, women’s care, and video-call feature app is in [`../react-app/README.md`](../react-app/README.md). It uses the username-login endpoint and the supplemental auth/care SQL schema.

The UI’s existing `tesseract.js` file runs OCR locally in the browser. This API runs Tesseract.js again on uploaded image files on the server so extracted text can be stored with the record. Choose one OCR path in the finished frontend to avoid duplicate work. PDF.js extraction currently handles selectable PDF text; scanned PDFs require rendering each page and sending the rendered image through OCR.

## Important prototype limits

- This is a hackathon scaffold, not a production-ready medical-record service.
- Uploaded documents and extracted text are sensitive. Do not use real patient records until authentication, consent, security, retention/deletion, monitoring, and applicable privacy/legal requirements have been reviewed.
- The service-role key bypasses Supabase RLS. Keep it server-side; the API verifies the user token and applies `user_id` ownership filters itself.
- OCR can misread names, medicines, units, and values. The API does not diagnose, prescribe, or validate clinical meaning.
- The OCR worker downloads language data on first use and needs outbound internet access.
- Default rate limits are in-memory and reset when the process restarts; use shared rate-limit storage if deploying multiple server instances.
