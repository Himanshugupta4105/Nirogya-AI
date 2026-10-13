
# ✚ AI-Powered Personal Health Copilot

### Altrix Labs | HackXlerate Hackathon Project

**Turning complex health information into clear, meaningful, and actionable insights.**

---

## 📌 Problem Statement

Healthcare information is often scattered across medical records, prescriptions, diagnostic reports, laboratory results, and wellness data. Understanding this information can be difficult for individuals because medical documents frequently contain complex terminology, unfamiliar abbreviations, and technical results.

As a result, people may struggle to organize their healthcare journey, understand their reports, track important health events, and prepare questions for healthcare professionals.

The **AI-Powered Personal Health Copilot** aims to simplify this experience by helping individuals organize, understand, and manage their health information in one place.

## 💡 Our Solution

Health Copilot is a digital health information assistant designed to bring medical records and personal health information together in an easy-to-understand dashboard.

The proposed system uses Artificial Intelligence (AI), Optical Character Recognition (OCR), and secure data management to extract relevant information from medical documents, explain complex medical terminology in simple language, organize health history chronologically, and generate useful summaries.

The goal is to help users become better informed and more organized throughout their healthcare journey, while keeping healthcare professionals responsible for medical diagnosis and treatment decisions.

## 🎯 Objectives

- Centralize medical records, prescriptions, diagnostic reports, and wellness information.
- Simplify complex medical terminology into understandable language.
- Extract important information from uploaded medical documents.
- Organize medical history into a chronological timeline.
- Help users identify information that may require verification or professional review.
- Support users in preparing questions for healthcare professionals.
- Protect sensitive health information through privacy-focused system design.

## ✨ Key Features

### 1. 📊 Personal Health Dashboard
- View an overview of medical records.
- See document counts and review statuses.
- Access recent records and health history.
- Navigate between different sections of the application.

### 2. 📁 Medical Record Management
- Select medical documents in PDF, JPG, and PNG formats.
- Organize records by document type and date.
- Search records by name, filename, type, or status.
- Open records to view summaries and associated information.

### 3. 🧠 AI-Powered Report Understanding
**Planned AI integration**
- Extract text from medical documents using OCR.
- Identify relevant values, dates, units, and medical terminology.
- Generate plain-language explanations of report contents.
- Preserve links to the original document and extracted source information.
- Flag uncertain extractions for user verification.

### 4. 💊 Prescription Understanding
**Planned AI integration**
- Extract medicine names and documented dosage instructions.
- Organize frequency and duration when explicitly stated.
- Flag unclear handwriting or missing information.
- Require verification before users rely on extracted prescription details.

The system must never guess an unclear medicine name or dosage.

### 5. 🗓️ Health Timeline
- Arrange health events and records chronologically.
- Review previous reports and documented appointments.
- Support comparisons between compatible measurements when sufficient data is available.

### 6. 💬 Health Insights
**Planned AI integration**
- Summarize information found in medical records.
- Explain unfamiliar medical terms.
- Highlight missing or uncertain information.
- Help users prepare questions for healthcare professionals.

AI-generated information should be grounded in the source documents and must not be presented as a confirmed diagnosis.

### 7. 🔐 Privacy and Security
**Required for a production deployment**
- Secure authentication and authorization.
- Encryption in transit and at rest.
- Controlled access to medical records.
- Appropriate retention and deletion policies.
- Consent-based processing of sensitive information.
- Audit logging and protection against unauthorized access.

---

## 🛠️ Technology Stack

### Current Front-End Prototype

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling, layout, and responsive design |
| JavaScript | Navigation, search, file selection, and interactive components |

### Proposed Full-System Technology Stack

| Technology | Purpose |
|---|---|
| React or another modern front-end framework | Scalable user interface |
| Python with FastAPI | Backend API and application logic |
| OCR engine | Extract text from scanned documents |
| AI/LLM service | Summarization and plain-language explanations |
| PostgreSQL | Structured application and health-record metadata |
| Encrypted object storage | Secure storage of uploaded documents |
| Authentication provider | Identity verification and access control |
| FHIR-compatible data model | Interoperable healthcare data representation |

The proposed technologies are architectural options. They are not all implemented in the current prototype.

---

## 🏗️ System Architecture

The intended system workflow is:

1. **User uploads a document** through the web application.
2. **Backend validates the file**, its format, and its size.
3. **OCR extracts document text** when required.
4. **Information extraction identifies relevant fields**, such as dates, measurements, units, and prescription instructions.
5. **AI generates a grounded summary** using the extracted information and appropriate context.
6. **Validation checks flag uncertain information** for user review.
7. **The system stores authorized records securely** and links extracted information to its source.
8. **The dashboard displays summaries and timelines** to the user.

### Architecture Diagram

```text
           ┌──────────────────────┐
           │         User         │
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │    Web Dashboard     │
           │     HTML/CSS/JS      │
           └──────────┬───────────┘
                      │ HTTPS
                      ▼
           ┌──────────────────────┐
           │     Backend API      │
           │   Authentication     │
           │   File Validation    │
           └──────────┬───────────┘
                      │
             ┌────────┴─────────┐
             ▼                  ▼
    ┌────────────────┐  ┌────────────────┐
    │  OCR / Text    │  │ Secure Record  │
    │  Extraction    │  │    Storage     │
    └───────┬────────┘  └────────────────┘
            │
            ▼
    ┌────────────────┐
    │ AI Summarizing │
    │ & Validation   │
    └───────┬────────┘
            │
            ▼
    ┌────────────────┐
    │ Health Insights│
    │ & Timeline     │
    └────────────────┘
```

**Note:** This diagram represents the proposed architecture. The current prototype implements only the front-end layer and sample data.

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser.
- A code editor such as Visual Studio Code.
- Basic familiarity with HTML, CSS, and JavaScript.

### Project Structure

```text
health-copilot/
│
├── index.html
├── style.css
├── script.js
├── ocr.css
├── tesseract.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── supabase-schema.sql
│   ├── supabase-auth-care-schema.sql
│   └── README.md
├── react-app/
│   ├── src/pages/
│   ├── package.json
│   └── README.md
└── README.md
```

### Installation and Setup

**Step 1: Download or clone the project**

If the project is hosted in a Git repository:

```bash
git clone <your-repository-url>
```

Alternatively, download the project files and extract them into a folder.

**Step 2: Open the project**

Open the `health-copilot` folder in Visual Studio Code.

**Step 3: Run the application**

Option A — Open `index.html` directly in your browser.

Option B — Install the Live Server extension in VS Code, right-click `index.html`, and select **Open with Live Server**.

**Step 4: Explore the prototype**

Try the following:
- Navigate between Overview, Medical Records, Health Timeline, Health Insights, and Settings.
- Search the sample records.
- Open a record to view its sample explanation.
- Select a PDF, JPG, or PNG file to see the upload demonstration.
- Select a JPG or PNG image to run browser-based OCR and copy the extracted text.
- Change a record's review status.
- Clear the demo upload metadata from Settings.

---

## 🧪 Current Implementation Status

| Component | Status |
|---|---|
| Responsive dashboard | Implemented |
| Navigation between screens | Implemented |
| Sample medical records | Implemented |
| Record search | Implemented |
| File selection and format/size validation | Implemented |
| Record details dialog | Implemented |
| Sample health timeline | Implemented |
| AI-generated summaries | Not connected |
| Browser OCR for JPG and PNG images | Implemented with Tesseract.js |
| PDF OCR | Not supported in this prototype |
| Prescription extraction | Not connected |
| Node.js API scaffold | Available in `backend/`; requires Supabase setup |
| Database persistence | Supabase schema and private storage setup provided |
| User authentication | Not implemented |
| Production-grade health-data security | Not implemented |

The current frontend remains a demo until configured to call the optional Node.js backend. JPG and PNG files can be processed in the browser with Tesseract.js to extract text. PDF files can be selected, but browser PDF OCR is not supported. The `backend/` folder provides authenticated uploads, image OCR, PDF text extraction, and Supabase persistence; follow `backend/README.md` to configure it. PDF.js extracts selectable PDF text; scanned PDFs require a separate rendering step for OCR. OCR may misread medical information; verify extracted text against the original document.

---

## 🔮 Future Enhancements

- Add PDF-to-image conversion to support OCR on scanned PDF pages.
- Connect a language model to generate source-grounded summaries.
- Add medicine and laboratory-result extraction with confidence indicators.
- Introduce secure user accounts and persistent storage.
- Support verified trend comparisons across compatible reports.
- Add consent-based reminders for explicitly documented follow-up instructions.
- Enable export of user-authorized health summaries.
- Support multilingual explanations.
- Add interoperability with healthcare systems using suitable FHIR resources.
- Implement automated testing, monitoring, access controls, and security reviews.

---

## ⚕️ Medical Disclaimer

Health Copilot is intended to support the organization and understanding of healthcare information. It is not a substitute for a qualified healthcare professional.

The application must not independently diagnose conditions, prescribe medication, recommend changing prescribed dosages, or replace professional judgment. Users should confirm important extracted information with the original document and consult an appropriate healthcare professional for medical decisions.

Any medical values shown in the current prototype are illustrative examples, not real patient data.

## 🔒 Privacy Disclaimer

Medical records contain sensitive personal information. The current front-end prototype is not designed or certified for production healthcare use.

Do not upload real patient documents to this demo. Before deploying a real system, implement appropriate security, privacy, consent, retention, and access-control measures and comply with applicable laws and regulations.

## 👥 Target Users

- Individuals managing their own medical documents.
- Patients organizing diagnostic reports and prescriptions.
- Caregivers helping organize information with appropriate authorization.
- Healthcare professionals reviewing user-provided summaries, where suitable.
- Developers building privacy-conscious digital health applications.

## 🌟 Expected Impact

Health Copilot aims to make health information easier to organize and understand, reduce the effort required to locate previous records, and help users prepare for more informed conversations with healthcare professionals.

Its value depends on accurate document extraction, reliable AI outputs, appropriate clinical safeguards, and strong protection of user privacy.

---

## 🏁 Conclusion

The **AI-Powered Personal Health Copilot** envisions a more organized and understandable healthcare experience by bringing medical information into one accessible digital workspace.

By combining document processing, AI-assisted explanations, chronological health records, and privacy-focused engineering, the proposed solution can help individuals navigate their healthcare information with greater clarity and confidence.

**Project:** AI-Powered Personal Health Copilot  
**Organization:** Altrix Labs  
**Event:** HackXlerate Hackathon

---
