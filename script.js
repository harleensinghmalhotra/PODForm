(() => {
  'use strict';

  // ============ ELEMENTS ============
  const form = document.getElementById('intakeForm');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const successOverlay = document.getElementById('successOverlay');
  const submitBtn = document.getElementById('submitBtn');

  // Conditional logo upload
  const logoYes = document.getElementById('logoYes');
  const logoNo = document.getElementById('logoNo');
  const logoUploadField = document.getElementById('logoUploadField');

  // Reply-to sync
  const emailInput = document.getElementById('email');
  const replyToInput = document.getElementById('replyto');

  if (emailInput && replyToInput) {
    emailInput.addEventListener('input', () => {
      replyToInput.value = emailInput.value;
    });
  }

  // ============ PROGRESS TRACKING ============
  const trackedFields = () => {
    const fields = [];

    // Text / email / url / date inputs (exclude hidden)
    form.querySelectorAll('input[type="text"], input[type="email"], input[type="url"], input[type="date"]').forEach(input => {
      fields.push({ type: 'input', el: input, filled: () => input.value.trim() !== '' });
    });

    // Textareas
    form.querySelectorAll('textarea').forEach(textarea => {
      fields.push({ type: 'textarea', el: textarea, filled: () => textarea.value.trim() !== '' });
    });

    // Radio groups
    const radioGroups = new Set();
    form.querySelectorAll('input[type="radio"]').forEach(radio => radioGroups.add(radio.name));
    radioGroups.forEach(name => {
      fields.push({
        type: 'radio',
        name,
        filled: () => form.querySelector(`input[name="${name}"]:checked`) !== null
      });
    });

    // Checkbox groups
    const checkboxGroups = new Set();
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => checkboxGroups.add(cb.name));
    checkboxGroups.forEach(name => {
      fields.push({
        type: 'checkbox',
        name,
        filled: () => form.querySelector(`input[name="${name}"]:checked`) !== null
      });
    });

    // File inputs
    form.querySelectorAll('input[type="file"]').forEach(fileInput => {
      fields.push({ type: 'file', el: fileInput, filled: () => fileInput.files.length > 0 });
    });

    return fields;
  };

  function updateProgress() {
    const fields = trackedFields();
    const total = fields.length;
    const filled = fields.filter(f => f.filled()).length;
    const pct = Math.round((filled / total) * 100);

    progressFill.style.width = pct + '%';
    progressLabel.textContent = pct + '% complete';
  }

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);

  // ============ CONDITIONAL LOGO UPLOAD ============
  function toggleLogoUpload() {
    if (logoYes && logoYes.checked) {
      logoUploadField.classList.add('visible');
    } else {
      logoUploadField.classList.remove('visible');
    }
  }

  if (logoYes) logoYes.addEventListener('change', toggleLogoUpload);
  if (logoNo) logoNo.addEventListener('change', toggleLogoUpload);

  // ============ CONDITIONAL "OTHER" PRODUCTS ============
  const otherCheckbox = document.getElementById('prodOther');
  const otherProductsField = document.getElementById('otherProductsField');
  const otherProductInput = document.getElementById('otherProductInput');
  const addOtherBtn = document.getElementById('addOtherProduct');
  const otherProductTags = document.getElementById('otherProductTags');
  const otherProductsHidden = document.getElementById('otherProductsHidden');
  let otherProducts = [];

  function toggleOtherProducts() {
    if (otherCheckbox && otherCheckbox.checked) {
      otherProductsField.classList.add('visible');
    } else {
      otherProductsField.classList.remove('visible');
    }
  }

  function addOtherProduct() {
    const val = otherProductInput.value.trim();
    if (!val) return;

    otherProducts.push(val);
    otherProductInput.value = '';
    renderTags();
    updateProgress();
  }

  function removeProduct(index) {
    otherProducts.splice(index, 1);
    renderTags();
    updateProgress();
  }

  function renderTags() {
    otherProductTags.innerHTML = '';
    otherProducts.forEach((product, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${product} <button type="button" class="remove-tag" data-index="${i}">×</button>`;
      otherProductTags.appendChild(tag);
    });

    // Sync hidden field
    otherProductsHidden.value = otherProducts.join(', ');

    // Attach remove handlers
    otherProductTags.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', () => removeProduct(parseInt(btn.dataset.index)));
    });
  }

  if (otherCheckbox) otherCheckbox.addEventListener('change', toggleOtherProducts);
  if (addOtherBtn) addOtherBtn.addEventListener('click', addOtherProduct);
  if (otherProductInput) {
    otherProductInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addOtherProduct();
      }
    });
  }

  // ============ FILE UPLOAD DISPLAY ============
  function setupFileUpload(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const dropzone = input?.closest('.file-upload-area');

    if (!input || !list) return;

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(evt => {
        dropzone.addEventListener(evt, e => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, e => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
        });
      });
    }

    input.addEventListener('change', () => {
      list.innerHTML = '';
      Array.from(input.files).forEach((file) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
          <span class="file-icon">📄</span>
          <span>${file.name}</span>
          <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem">${formatFileSize(file.size)}</span>
        `;
        list.appendChild(item);
      });
      updateProgress();
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  setupFileUpload('logoFile', 'logoFileList');
  setupFileUpload('inspirationFiles', 'inspirationFileList');

  // ============ FORM SUBMISSION VIA WEB3FORMS ============
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading state
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnIcon.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    // Build FormData (includes files automatically)
    const formData = new FormData(form);

    // Collect checkbox values as comma-separated strings
    // (Web3Forms shows duplicate keys oddly, so we merge them)
    const checkboxGroups = ['products'];
    checkboxGroups.forEach(name => {
      const checked = Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
      // Remove individual entries and add merged one
      formData.delete(name);
      if (checked.length > 0) {
        formData.append(name, checked.join(', '));
      }
    });

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      console.log('Web3Forms response:', text);
      let result;
      try { result = JSON.parse(text); } catch (e) { throw new Error('Invalid response: ' + text); }

      if (result.success) {
        // Show success overlay
        successOverlay.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Something went wrong: ' + error.message);

      // Reset button
      btnText.style.display = 'inline';
      btnIcon.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  });

  // Close success overlay on click
  successOverlay.addEventListener('click', () => {
    successOverlay.classList.remove('active');
  });



  // ============ INITIAL STATE ============
  updateProgress();

})();
