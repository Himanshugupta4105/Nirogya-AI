/*
 * Nirogya AI browser OCR adapter.
 * Tesseract.js is loaded from its CDN in index.html. Image data is passed to
 * the browser worker and is not sent to an application server.
 */
(() => {
  const uploadQueue = document.getElementById('uploadQueue');
  if (!uploadQueue) return;

  const panel = document.createElement('section');
  panel.className = 'ocr-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="ocr-panel-head">
      <div><b>Text extracted from image</b><small id="ocrStatus">Waiting for an image…</small></div>
      <button class="text-button" id="copyOcrText" type="button">Copy text</button>
    </div>
    <progress id="ocrProgress" max="1" value="0"></progress>
    <textarea id="ocrOutput" rows="7" readonly aria-label="OCR extracted text" placeholder="Extracted text will appear here."></textarea>
    <p>OCR may misread medical details. Verify every value against the original report. Images are processed in your browser; Tesseract language data is downloaded from its CDN.</p>`;
  uploadQueue.insertAdjacentElement('afterend', panel);

  const status = panel.querySelector('#ocrStatus');
  const progress = panel.querySelector('#ocrProgress');
  const output = panel.querySelector('#ocrOutput');
  const copyButton = panel.querySelector('#copyOcrText');
  const jobs = [];
  let active = false;
  let workerPromise;
  let extracted = [];
  let pdfNotice = false;

  function updateStatus(message) {
    panel.hidden = false;
    status.textContent = message;
  }

  function getWorker() {
    if (!window.Tesseract?.createWorker) {
      return Promise.reject(new Error('Tesseract.js could not load. Check your internet connection and reload the page.'));
    }
    if (!workerPromise) {
      workerPromise = window.Tesseract.createWorker('eng', 1, {
        logger(message) {
          if (message.status === 'recognizing text' && Number.isFinite(message.progress)) {
            progress.value = message.progress;
            updateStatus(`Recognizing text… ${Math.round(message.progress * 100)}%`);
          } else if (message.status) {
            updateStatus(message.status.charAt(0).toUpperCase() + message.status.slice(1) + '…');
          }
        }
      });
    }
    return workerPromise;
  }

  function isImage(file) {
    return file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name);
  }

  async function processQueue() {
    if (active || !jobs.length) return;
    active = true;
    panel.hidden = false;

    const imageJobs = jobs.splice(0).filter(file => {
      if (isImage(file)) return true;
      pdfNotice = true;
      return false;
    });

    if (!imageJobs.length) {
      updateStatus('PDF selected. This demo runs OCR on JPG and PNG images only.');
      active = false;
      return;
    }

    try {
      const worker = await getWorker();
      for (const file of imageJobs) {
        progress.value = 0;
        updateStatus(`Reading ${file.name}…`);
        const result = await worker.recognize(file);
        const text = (result.data.text || '').trim();
        extracted.push({ name: file.name, text: text || '[No readable text found]' });
        output.value = extracted.map(item => `--- ${item.name} ---\n${item.text}`).join('\n\n');
        progress.value = 1;
        updateStatus(text ? `Finished ${file.name}` : `No readable text found in ${file.name}`);
      }
      if (pdfNotice) status.textContent += ' PDF OCR is not supported here.';
    } catch (error) {
      workerPromise = undefined;
      updateStatus(error?.message || 'OCR could not process this image. Try another file.');
    } finally {
      active = false;
      if (jobs.length) processQueue();
    }
  }

  document.addEventListener('nirogya:files-added', event => {
    const files = event.detail?.files || [];
    if (!files.length) return;
    jobs.push(...files);
    panel.hidden = false;
    updateStatus(files.some(isImage) ? 'Preparing image OCR…' : 'PDF selected. This demo runs OCR on JPG and PNG images only.');
    processQueue();
  });

  document.addEventListener('nirogya:uploads-cleared', () => {
    jobs.length = 0;
    extracted = [];
    pdfNotice = false;
    output.value = '';
    progress.value = 0;
    if (!active) {
      status.textContent = 'Waiting for an image…';
      panel.hidden = true;
    }
  });

  copyButton.addEventListener('click', async () => {
    if (!output.value) {
      updateStatus('There is no extracted text to copy yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(output.value);
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = 'Copy text'; }, 1600);
    } catch {
      output.focus();
      output.select();
      updateStatus('Text selected. Use your keyboard shortcut to copy it.');
    }
  });

  window.addEventListener('pagehide', () => {
    if (workerPromise) workerPromise.then(worker => worker.terminate()).catch(() => {});
  }, { once: true });
})();
