document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectBtn');
  const dropzoneCard = document.getElementById('dropzoneCard');
  const queueSection = document.getElementById('queueSection');
  const fileList = document.getElementById('fileList');
  const queueStats = document.getElementById('queueStats');

  let queue = [];
  let totalFilesCount = 0;
  let completedFilesCount = 0;

  window.onloadTurnstileCallback = function () {
    if (window.turnstile && window.APP_CONFIG.TURNSTILE_SITE_KEY) {
      window.turnstile.render('#turnstileWidget', {
        sitekey: window.APP_CONFIG.TURNSTILE_SITE_KEY,
        theme: 'dark'
      });
    }
  };

  selectBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    handleSelectedFiles(Array.from(e.target.files));
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzoneCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneCard.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzoneCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneCard.classList.remove('dragover');
    }, false);
  });

  dropzoneCard.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    handleSelectedFiles(files);
  });

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleSelectedFiles(files) {
    if (!files.length) return;

    files.forEach(file => {
      const fileId = 'file-' + Math.random().toString(36).substring(2, 9);
      const validationError = validateFile(file);

      const fileObj = {
        id: fileId,
        rawFile: file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? 'error' : 'pending',
        errorMessage: validationError || null,
        progress: 0
      };

      queue.push(fileObj);
      renderFileItem(fileObj);

      if (!validationError) {
        startUpload(fileObj);
      }
    });

    updateQueueUI();
  }

  function validateFile(file) {
    if (file.size > window.APP_CONFIG.MAX_FILE_SIZE_BYTES) {
      return 'Размер превышает 1 ГБ';
    }
    const isAllowedType = window.APP_CONFIG.ALLOWED_MIME_TYPES.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });

    if (!isAllowedType && file.type !== '') {
      return 'Неподдерживаемый формат';
    }
    return null;
  }

  function renderFileItem(fileObj) {
    queueSection.classList.remove('hidden');

    const itemEl = document.createElement('div');
    itemEl.className = 'file-item';
    itemEl.id = `item-${fileObj.id}`;

    itemEl.innerHTML = `
      <div class="file-info">
        <span class="file-name" title="${fileObj.name}">${fileObj.name}</span>
        <span class="file-size">${formatBytes(fileObj.size)}</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="pb-${fileObj.id}" style="width: ${fileObj.progress}%"></div>
      </div>
      <div class="file-status ${fileObj.status}" id="status-${fileObj.id}">
        <span id="text-${fileObj.id}">${fileObj.errorMessage || 'В очереди'}</span>
        <span id="percent-${fileObj.id}">${fileObj.progress}%</span>
      </div>
    `;

    fileList.appendChild(itemEl);
  }

  function updateFileUI(fileObj) {
    const pb = document.getElementById(`pb-${fileObj.id}`);
    const statusText = document.getElementById(`text-${fileObj.id}`);
    const percentText = document.getElementById(`percent-${fileObj.id}`);
    const statusContainer = document.getElementById(`status-${fileObj.id}`);

    if (pb) pb.style.width = `${fileObj.progress}%`;
    if (percentText) percentText.textContent = `${fileObj.progress}%`;
    if (statusText) {
      if (fileObj.status === 'error') {
        statusText.textContent = fileObj.errorMessage;
        statusContainer.className = 'file-status error';
      } else if (fileObj.status === 'success') {
        statusText.textContent = 'Успешно загружено';
        statusContainer.className = 'file-status success';
      } else if (fileObj.status === 'uploading') {
        statusText.textContent = 'Загрузка...';
      }
    }
    updateQueueUI();
  }

  async function startUpload(fileObj) {
    fileObj.status = 'uploading';
    updateFileUI(fileObj);

    try {
      let turnstileToken = null;
      if (window.turnstile) {
        turnstileToken = window.turnstile.getResponse();
      }

      const res = await fetch('/.netlify/functions/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type || 'application/octet-stream',
          turnstileToken: turnstileToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка инициализации загрузки');
      }

      const uploadUrl = data.uploadUrl;
      await uploadInChunks(fileObj, uploadUrl);

    } catch (err) {
      fileObj.status = 'error';
      fileObj.errorMessage = err.message || 'Ошибка сети';
      updateFileUI(fileObj);
    }
  }

  function uploadInChunks(fileObj, uploadUrl) {
    return new Promise((resolve, reject) => {
      const file = fileObj.rawFile;
      const chunkSize = window.APP_CONFIG.CHUNK_SIZE_BYTES;
      let start = 0;

      function uploadNextChunk() {
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadedSoFar = start + e.loaded;
            fileObj.progress = Math.round((uploadedSoFar / file.size) * 100);
            updateFileUI(fileObj);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            fileObj.progress = 100;
            fileObj.status = 'success';
            updateFileUI(fileObj);
            resolve();
          } else if (xhr.status === 308) {
            const rangeHeader = xhr.getResponseHeader('Range');
            if (rangeHeader) {
              const parts = rangeHeader.split('-');
              start = parseInt(parts[1], 10) + 1;
            } else {
              start = end;
            }
            uploadNextChunk();
          } else {
            try {
              const errObj = JSON.parse(xhr.responseText);
              reject(new Error(errObj.error?.message || 'Ошибка загрузки чанка'));
            } catch {
              reject(new Error(`Ошибка HTTP: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Сетевая ошибка при передаче файла'));
        };

        xhr.send(chunk);
      }

      uploadNextChunk();
    });
  }

  function updateQueueUI() {
    totalFilesCount = queue.length;
    completedFilesCount = queue.filter(f => f.status === 'success' || f.status === 'error').length;
    queueStats.textContent = `${completedFilesCount} / ${totalFilesCount}`;
  }
});
