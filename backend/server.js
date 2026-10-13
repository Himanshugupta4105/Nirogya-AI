import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import { createClient } from '@supabase/supabase-js';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT || 4000);
const MAX_UPLOAD_MB = boundedInt(process.env.MAX_UPLOAD_MB, 10, 1, 25);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const MAX_PDF_PAGES = boundedInt(process.env.MAX_PDF_PAGES, 40, 1, 100);
const MAX_TEXT_CHARS = boundedInt(process.env.MAX_EXTRACTED_TEXT_CHARS, 1_500_000, 1000, 3_000_000);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'health-records';
const OCR_LANGUAGE = process.env.OCR_LANGUAGE || 'eng';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',').map(origin => origin.trim()).filter(Boolean);

function boundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header are non-browser clients; browser origins must be explicitly listed.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, 'This site is not allowed to access the API.'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600
}));
app.use(express.json({ limit: '32kb' }));

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });
const usernameLoginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 8, parts: 10 },
  fileFilter(_request, file, callback) {
    const accepted = new Set(['image/jpeg', 'image/png', 'application/pdf']);
    if (!accepted.has(file.mimetype)) return callback(new ApiError(415, 'Upload a JPG, PNG, or PDF file.'));
    callback(null, true);
  }
});

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function requireUser(request, _response, next) {
  try {
    const authorization = request.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new ApiError(401, 'Sign in first, then send a Supabase access token.');
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) throw new ApiError(401, 'Your session is invalid or expired. Please sign in again.');
    request.user = data.user;
    next();
  } catch (error) { next(error); }
}

function safeOriginalName(name) {
  const base = path.basename(name || 'health-record').normalize('NFKC');
  return base.replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\s+/g, ' ').slice(0, 180) || 'health-record';
}

async function validateFile(file) {
  if (!file?.buffer?.length) throw new ApiError(400, 'Choose a file to upload.');
  const detected = await fileTypeFromBuffer(file.buffer);
  const actualMime = detected?.mime;
  const valid = actualMime === 'application/pdf' || actualMime === 'image/jpeg' || actualMime === 'image/png';
  if (!valid) throw new ApiError(415, 'The file contents do not match a supported PDF, JPG, or PNG file.');
  if (actualMime !== file.mimetype) throw new ApiError(415, 'The file type does not match its contents. Please choose the original file.');
  return actualMime;
}

let ocrWorkerPromise;
async function getOcrWorker() {
  if (!ocrWorkerPromise) ocrWorkerPromise = createWorker(OCR_LANGUAGE);
  return ocrWorkerPromise;
}

async function extractImageText(buffer) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(buffer);
  return {
    text: (data.text || '').trim().slice(0, MAX_TEXT_CHARS),
    confidence: Number.isFinite(data.confidence) ? Math.round(data.confidence * 100) / 100 : null,
    method: 'tesseract_image_ocr',
    status: data.text?.trim() ? 'completed' : 'no_text_found'
  };
}

async function extractPdfText(buffer) {
  let document;
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
      stopAtErrors: true
    });
    document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new ApiError(413, `This PDF has ${document.numPages} pages. The limit is ${MAX_PDF_PAGES} pages.`);
    }
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter(item => typeof item.str === 'string')
        .map(item => `${item.str}${item.hasEOL ? '\n' : ' '}`)
        .join('')
        .trim();
      if (pageText) pages.push(`--- Page ${pageNumber} ---\n${pageText}`);
      page.cleanup();
    }
    const text = pages.join('\n\n').slice(0, MAX_TEXT_CHARS);
    return {
      text,
      confidence: null,
      method: 'pdfjs_text_extraction',
      status: text ? 'completed' : 'no_text_layer'
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'PDF.js could not read this PDF. It may be damaged, password-protected, or unsupported.');
  } finally {
    if (document) await document.destroy().catch(() => {});
  }
}

function validRecordType(value) {
  const allowed = new Set(['report', 'prescription', 'visit_note', 'other']);
  return allowed.has(value) ? value : 'other';
}

app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'nirogya-ai-api' }));

// Supabase Auth accepts email or phone for password login, but not usernames.
// Resolve a username on the server and return the normal Supabase session.
app.post('/api/auth/username-login', usernameLoginLimiter, async (request, response, next) => {
  try {
    const username = String(request.body?.username || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    if (!/^[a-z0-9._-]{3,30}$/.test(username) || password.length < 1 || password.length > 128) {
      throw new ApiError(400, 'Enter a valid username and password.');
    }
    const { data: profile, error: profileError } = await supabase.from('user_profiles')
      .select('user_id').eq('username', username).maybeSingle();
    if (profileError || !profile) throw new ApiError(401, 'The username or password is incorrect.');
    const { data: authData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
    if (userError || !authData.user?.email) throw new ApiError(401, 'The username or password is incorrect.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: authData.user.email, password });
    if (error || !data.session) throw new ApiError(401, 'The username or password is incorrect.');
    response.json({ session: data.session, user: data.user });
  } catch (error) { next(error); }
});

app.get('/api/records', requireUser, async (request, response, next) => {
  try {
    const { data, error } = await supabase.from('health_records')
      .select('id, original_name, mime_type, size_bytes, record_type, extraction_method, extraction_status, extracted_text, ocr_confidence, created_at')
      .eq('user_id', request.user.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw new ApiError(500, 'Could not load your records.');
    response.json({ records: data });
  } catch (error) { next(error); }
});

app.post('/api/records/upload', requireUser, uploadLimiter, upload.single('file'), async (request, response, next) => {
  let savedPath;
  try {
    const file = request.file;
    const mimeType = await validateFile(file);
    const extraction = mimeType === 'application/pdf'
      ? await extractPdfText(file.buffer)
      : await extractImageText(file.buffer);
    const originalName = safeOriginalName(file.originalname);
    const storagePath = `${request.user.id}/${crypto.randomUUID()}-${originalName}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(storagePath, file.buffer, {
      contentType: mimeType,
      cacheControl: '0',
      upsert: false
    });
    if (storageError) throw new ApiError(502, 'The file could not be saved to private storage. Check the Supabase bucket setup.');
    savedPath = storagePath;

    const { data: record, error: insertError } = await supabase.from('health_records').insert({
      user_id: request.user.id,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: file.size,
      storage_path: storagePath,
      record_type: validRecordType(request.body?.recordType),
      extracted_text: extraction.text,
      extraction_method: extraction.method,
      extraction_status: extraction.status,
      ocr_confidence: extraction.confidence
    }).select('id, original_name, mime_type, size_bytes, record_type, extraction_method, extraction_status, extracted_text, ocr_confidence, created_at').single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      savedPath = undefined;
      throw new ApiError(502, 'The file was uploaded, but its record could not be saved. Check the database schema and RLS setup.');
    }
    savedPath = undefined;
    response.status(201).json({
      record,
      message: extraction.status === 'no_text_layer'
        ? 'PDF saved. PDF.js found no selectable text; scanned-PDF OCR needs PDF page rendering, which is not enabled in this backend scaffold.'
        : 'File saved and text extraction completed. Verify extracted details against the original.'
    });
  } catch (error) {
    if (savedPath) await supabase.storage.from(BUCKET).remove([savedPath]).catch(() => {});
    next(error);
  }
});

app.get('/api/records/:id/file', requireUser, async (request, response, next) => {
  try {
    const { data: record, error: findError } = await supabase.from('health_records')
      .select('storage_path, original_name').eq('id', request.params.id).eq('user_id', request.user.id).maybeSingle();
    if (findError) throw new ApiError(500, 'Could not find the requested record.');
    if (!record) throw new ApiError(404, 'Record not found.');
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(record.storage_path, 60, { download: record.original_name });
    if (error) throw new ApiError(502, 'Could not create a temporary file link.');
    response.json({ url: data.signedUrl, expiresInSeconds: 60 });
  } catch (error) { next(error); }
});

app.delete('/api/records/:id', requireUser, async (request, response, next) => {
  try {
    const { data: record, error: findError } = await supabase.from('health_records')
      .select('storage_path').eq('id', request.params.id).eq('user_id', request.user.id).maybeSingle();
    if (findError) throw new ApiError(500, 'Could not find the requested record.');
    if (!record) throw new ApiError(404, 'Record not found.');
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([record.storage_path]);
    if (storageError) throw new ApiError(502, 'Could not remove the file from private storage.');
    const { error: deleteError } = await supabase.from('health_records').delete()
      .eq('id', request.params.id).eq('user_id', request.user.id);
    if (deleteError) throw new ApiError(502, 'The file was removed, but the database record could not be deleted.');
    response.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  if (response.headersSent) return;
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return response.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? `Files must be ${MAX_UPLOAD_MB} MB or smaller.` : 'Upload could not be processed.' });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error.message);
  response.status(status).json({ error: status >= 500 ? 'The server could not complete this request.' : error.message });
});

const server = app.listen(PORT, () => console.log(`Nirogya AI API listening on port ${PORT}`));
async function shutdown() {
  server.close(async () => {
    if (ocrWorkerPromise) {
      try { const worker = await ocrWorkerPromise; await worker.terminate(); } catch { /* Worker may not have initialized. */ }
    }
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
