const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('./backend/node_modules/pdf-lib');

async function createMultiPagePDF() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // --- PAGE 1: Selectable / Embedded Digital Text ---
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawText('Nirogya AI Health Care Clinic', {
    x: 50,
    y: 740,
    size: 20,
    font: boldFont,
    color: rgb(0.09, 0.42, 0.34)
  });
  page1.drawText('Outpatient Consultation Note & Prescription Summary', {
    x: 50,
    y: 715,
    size: 13,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.2)
  });
  page1.drawText('Patient Name: Aditya Sharma  |  Age: 28  |  Date: 14 Oct 2026', {
    x: 50,
    y: 685,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.33)
  });
  page1.drawText('Attending Clinician: Dr. Meera Iyer (Reg: MD-77421)', {
    x: 50,
    y: 665,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.33)
  });

  page1.drawText('Clinical Notes & Assessment:', {
    x: 50,
    y: 620,
    size: 13,
    font: boldFont,
    color: rgb(0.09, 0.42, 0.34)
  });
  const clinicalText = [
    'Patient presented for routine annual health review and mild seasonal congestion.',
    'Vital Signs: Blood Pressure 118/76 mmHg, Pulse 72 bpm, SpO2 99% on room air.',
    'Systemic Examination: Chest clear to auscultation, no focal deficits noted.',
    'Plan:',
    '1. Paracetamol 650 mg as needed for mild headache or fever (max 3/day).',
    '2. Vitamin C with Zinc (Becosules Z) daily after breakfast for 14 days.',
    '3. Maintain adequate oral hydration and review complete blood count (attached on page 2).'
  ];
  let yPos = 595;
  clinicalText.forEach(line => {
    page1.drawText(line, { x: 50, y: yPos, size: 10.5, font, color: rgb(0.15, 0.15, 0.15) });
    yPos -= 20;
  });

  // --- PAGE 2: Scanned Lab Report Image (NO Selectable Embedded Text) ---
  // This will force the PDF reader engine to render page 2 to canvas and run Tesseract.js OCR!
  const page2 = pdfDoc.addPage([600, 800]);
  const imgPath = path.join(__dirname, 'frontend', 'test-image-report.jpg');
  if (fs.existsSync(imgPath)) {
    const imgBytes = fs.readFileSync(imgPath);
    const embeddedImg = await pdfDoc.embedJpg(imgBytes);
    // Draw image to fill most of page 2
    page2.drawImage(embeddedImg, {
      x: 30,
      y: 100,
      width: 540,
      height: 650
    });
  } else {
    // Fallback if image not found
    page2.drawText('Scanned Laboratory Report Page', { x: 50, y: 700, size: 16, font: boldFont });
  }

  const pdfBytes = await pdfDoc.save();
  const destPath = path.join(__dirname, 'frontend', 'test-multipage-report.pdf');
  fs.writeFileSync(destPath, pdfBytes);
  console.log('✅ Generated multi-page test PDF successfully at:', destPath);
}

createMultiPagePDF().catch(err => {
  console.error('Failed to create PDF:', err);
  process.exit(1);
});
