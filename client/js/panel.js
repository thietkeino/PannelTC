(function () {
  'use strict';

  var statusDot = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');
  var refreshBtn = document.getElementById('refresh-btn');
  var consoleBox = document.getElementById('console-box');

  var docNameEl = document.getElementById('doc-name');
  var docArtboardsEl = document.getElementById('doc-artboards');
  var docSelectionEl = document.getElementById('doc-selection');
  var docSavedStatusEl = document.getElementById('doc-saved-status');

  // Elements: Tạo file in
  var templateSelect = document.getElementById('template-select');
  var openSelectedTemplateBtn = document.getElementById('open-selected-template-btn');
  var browseTemplateBtn = document.getElementById('browse-template-btn');
  var pillButtons = document.querySelectorAll('.pill-btn[data-template]');

  // Elements: Dàn trang DTF
  var runDtfBtn = document.getElementById('run-dtf-btn');

  // Elements: Ghi kích thước (3 chế độ chuyên biệt)
  var dimModeTotalBtn = document.getElementById('dim-mode-total-btn');
  var dimModeParentsBtn = document.getElementById('dim-mode-parents-btn');
  var dimModeNestedBtn = document.getElementById('dim-mode-nested-btn');
  var clearDimensionBtn = document.getElementById('clear-dimension-btn');
  var toggleDimSettingsBtn = document.getElementById('toggle-dim-settings-btn');
  var dimSettingsDrawer = document.getElementById('dim-settings-drawer');
  var openDimDialogBtn = document.getElementById('open-dim-dialog-btn');

  // Elements: Xuất bản file in
  var exportAllBtn = document.getElementById('export-all-artboards-btn');
  var exportCurBtn = document.getElementById('export-cur-artboard-btn');

  // Elements: Đổi chữ theo danh sách (Data Merge / Variable)
  var varCheckSelBtn = document.getElementById('var-check-sel-btn');
  var varSelectionText = document.getElementById('var-selection-text');
  var varInputList = document.getElementById('var-input-list');
  var varLineCount = document.getElementById('var-line-count');
  var varColsEl = document.getElementById('var-cols');
  var varGapXEl = document.getElementById('var-gap-x');
  var varGapYEl = document.getElementById('var-gap-y');
  var varStartPosEl = document.getElementById('var-start-pos');
  var varCreateGroupEl = document.getElementById('var-create-group');
  var varKeepMasterEl = document.getElementById('var-keep-master');
  var varGenerateBtn = document.getElementById('var-generate-btn');
  var varModeCanvasRadio = document.getElementById('var-mode-canvas');
  var varModeJpgRadio = document.getElementById('var-mode-jpg');
  var varCanvasConfig = document.getElementById('var-canvas-config');
  var varJpgConfig = document.getElementById('var-jpg-config');
  var varExportJpgBtn = document.getElementById('var-export-jpg-btn');
  var varOpenFolderRow = document.getElementById('var-open-folder-row');
  var varOpenFolderBtn = document.getElementById('var-open-folder-btn');

  function log(msg, isError) {
    if (!consoleBox) return;
    var time = new Date().toLocaleTimeString();
    consoleBox.className = 'console-box' + (isError ? ' error' : '');
    consoleBox.textContent = '[' + time + '] ' + msg;
  }

  function setStatus(state, message) {
    if (!statusDot || !statusText) return;
    statusDot.className = 'dot ' + state;
    statusText.textContent = message;
  }

  function updateUI(state) {
    if (!state) return;

    if (state.activeDocument) {
      if (docNameEl) docNameEl.textContent = state.activeDocument.name || 'Không tên';
      if (docArtboardsEl) docArtboardsEl.textContent = state.activeDocument.artboards + ' Artboard';
      if (docSelectionEl) docSelectionEl.textContent = state.activeDocument.selectionCount + ' đối tượng';
      if (docSavedStatusEl) {
        docSavedStatusEl.textContent = state.activeDocument.saved ? 'Đã lưu file' : 'Chưa lưu file';
        docSavedStatusEl.style.color = state.activeDocument.saved ? '#10b981' : '#f59e0b';
      }
    } else {
      if (docNameEl) docNameEl.textContent = 'Chưa mở file';
      if (docArtboardsEl) docArtboardsEl.textContent = '0 Artboard';
      if (docSelectionEl) docSelectionEl.textContent = '0 đối tượng';
      if (docSavedStatusEl) {
        docSavedStatusEl.textContent = '---';
        docSavedStatusEl.style.color = 'inherit';
      }
    }
  }

  function fetchState() {
    setStatus('connecting', 'Đang kết nối…');
    window.TCBridge.call('getState', [], function (err, res) {
      if (err) {
        setStatus('error', 'Chưa kết nối');
        log('Lỗi kết nối: ' + err.message, true);
        return;
      }
      setStatus('connected', 'Illustrator ' + (res.appVersion ? res.appVersion.split('.')[0] : '2024'));
      updateUI(res);
    });
  }

  // ------------------------------------------------------------------
  // 0. Quản lý Thu gọn / Mở rộng các công cụ (Accordion Collapsible)
  // ------------------------------------------------------------------
  var accordionTriggers = document.querySelectorAll('.card.collapsible .accordion-trigger');
  accordionTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      // Không toggle nếu click vào các nút hành động riêng bên trong header
      if (e.target.closest('#toggle-dim-settings-btn')) {
        return;
      }
      var card = trigger.closest('.card.collapsible');
      if (card) {
        card.classList.toggle('collapsed');
      }
    });
  });

  // ------------------------------------------------------------------
  // 1. Tạo file in (Template)
  // ------------------------------------------------------------------
  function doOpenTemplate(templateId, btn) {
    if (btn) btn.disabled = true;
    log('Đang mở file template: ' + templateId + '…');

    window.TCBridge.call('openTemplate', [templateId], function (err, res) {
      if (btn) btn.disabled = false;
      if (err) {
        log('Lỗi mở template: ' + err.message, true);
        return;
      }
      log(res.message || 'Đã tạo file in thành công!');
      fetchState();
    });
  }

  if (openSelectedTemplateBtn && templateSelect) {
    openSelectedTemplateBtn.addEventListener('click', function () {
      doOpenTemplate(templateSelect.value, openSelectedTemplateBtn);
    });
  }

  pillButtons.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var val = pill.getAttribute('data-template');
      if (templateSelect) templateSelect.value = val;
      doOpenTemplate(val, pill);
    });
  });

  if (browseTemplateBtn) {
    browseTemplateBtn.addEventListener('click', function () {
      log('Đang mở hộp thoại chọn file template…');
      window.TCBridge.call('browseAndOpenTemplate', [], function (err, res) {
        if (err) {
          log('Lỗi mở file: ' + err.message, true);
          return;
        }
        if (res.cancelled) {
          log('Đã hủy chọn file template.');
          return;
        }
        log(res.message || 'Đã tạo file in từ mẫu tùy chọn!');
        fetchState();
      });
    });
  }

  // ------------------------------------------------------------------
  // 2. Dàn trang DTF A3
  // ------------------------------------------------------------------
  if (runDtfBtn) {
    runDtfBtn.addEventListener('click', function () {
      runDtfBtn.disabled = true;
      var originalText = runDtfBtn.innerHTML;
      runDtfBtn.textContent = 'Đang khởi chạy…';
      log('Đang khởi chạy công cụ Dàn trang DTF A3…');

      window.TCBridge.call('runDTFAutoNest', [], function (err, res) {
        runDtfBtn.disabled = false;
        runDtfBtn.innerHTML = originalText;
        if (err) {
          log('Lỗi DTF: ' + err.message, true);
          return;
        }
        log(res.message || 'Đã hoàn tất thao tác DTF.');
        fetchState();
      });
    });
  }

  // ------------------------------------------------------------------
  // 3. Ghi kích thước Group (Auto Dimension)
  // ------------------------------------------------------------------
  if (toggleDimSettingsBtn && dimSettingsDrawer) {
    toggleDimSettingsBtn.addEventListener('click', function (e) {
      if (e) e.stopPropagation();
      var isHidden = dimSettingsDrawer.hasAttribute('hidden');
      if (isHidden) {
        dimSettingsDrawer.removeAttribute('hidden');
        toggleDimSettingsBtn.classList.add('active');
      } else {
        dimSettingsDrawer.setAttribute('hidden', '');
        toggleDimSettingsBtn.classList.remove('active');
      }
    });
  }

  function getDimensionOptions(mode) {
    var unitEl = document.getElementById('dim-unit');
    var decimalsEl = document.getElementById('dim-decimals');
    var offsetEl = document.getElementById('dim-offset');
    var fontEl = document.getElementById('dim-font-size');
    var strokeEl = document.getElementById('dim-stroke');
    var hSideEl = document.getElementById('dim-h-side');
    var vSideEl = document.getElementById('dim-v-side');
    var colorEl = document.getElementById('dim-color');

    var strokeBoundsEl = document.getElementById('dim-stroke-bounds');
    var replaceEl = document.getElementById('dim-replace');

    return {
      mode: mode || 'parents', // 'total' | 'parents' | 'nested'
      unit: unitEl ? unitEl.value : 'mm',
      decimals: decimalsEl ? parseInt(decimalsEl.value, 10) : 1,
      ratio: 1,
      offset: offsetEl ? (parseFloat(offsetEl.value) || 6) : 6,
      fontSize: fontEl ? (parseFloat(fontEl.value) || 9) : 9,
      strokeWidth: strokeEl ? (parseFloat(strokeEl.value) || 0.6) : 0.6,
      hSide: hSideEl ? parseInt(hSideEl.value, 10) : 1,
      vSide: vSideEl ? parseInt(vSideEl.value, 10) : 1,
      color: colorEl ? parseInt(colorEl.value, 10) : 0,
      withStroke: strokeBoundsEl ? strokeBoundsEl.checked : false,
      replace: replaceEl ? replaceEl.checked : true
    };
  }

  function doRunDimension(mode, btn) {
    var opts = getDimensionOptions(mode);
    var origHtml = '';
    if (btn) {
      btn.disabled = true;
      origHtml = btn.innerHTML;
      btn.textContent = 'Đang đo & vẽ…';
    }

    var logDesc = (mode === 'total') ? 'kích thước tổng đối tượng' :
                  (mode === 'parents') ? 'kích thước từng Group cha' : 'kích thước Group lồng nhau';
    log('Đang tính toán & vẽ ' + logDesc + '…');

    window.TCBridge.call('autoDimension', [opts], function (err, res) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }

      if (err) {
        log('Lỗi ghi kích thước: ' + err.message, true);
        alert(err.message);
        return;
      }

      log(res.message || 'Đã vẽ kích thước thành công!');
      fetchState();
    });
  }

  // 1. Ghi kích thước tổng của đối tượng đang chọn
  if (dimModeTotalBtn) {
    dimModeTotalBtn.addEventListener('click', function () {
      doRunDimension('total', dimModeTotalBtn);
    });
  }

  // 2. Ghi kích thước tổng của nhiều group cha đang được chọn
  if (dimModeParentsBtn) {
    dimModeParentsBtn.addEventListener('click', function () {
      doRunDimension('parents', dimModeParentsBtn);
    });
  }

  // 3. Ghi kích thước của nhiều group cha con lồng nhau
  if (dimModeNestedBtn) {
    dimModeNestedBtn.addEventListener('click', function () {
      doRunDimension('nested', dimModeNestedBtn);
    });
  }

  if (clearDimensionBtn) {
    clearDimensionBtn.addEventListener('click', function () {
      clearDimensionBtn.disabled = true;
      log('Đang xóa các đường kích thước cũ…');

      window.TCBridge.call('clearDimensions', [], function (err, res) {
        clearDimensionBtn.disabled = false;
        if (err) {
          log('Lỗi xóa kích thước: ' + err.message, true);
          return;
        }
        log(res.message || 'Đã xóa kích thước cũ.');
        fetchState();
      });
    });
  }

  if (openDimDialogBtn) {
    openDimDialogBtn.addEventListener('click', function () {
      log('Đang mở hộp thoại Ghi kích thước gốc…');
      window.TCBridge.call('runAutoDimensionDialog', [], function (err, res) {
        if (err) {
          log('Lỗi mở dialog: ' + err.message, true);
          return;
        }
        log(res.message || 'Đã mở hộp thoại.');
        fetchState();
      });
    });
  }

  // ------------------------------------------------------------------
  // 4. Xuất bản file in (Export Artboard sang PNG + PDF)
  // ------------------------------------------------------------------
  var modeSingleRadio = document.getElementById('export-mode-single');
  var modeSeparateRadio = document.getElementById('export-mode-separate');
  var exportAllBtnText = document.getElementById('export-all-btn-text');

  function getExportMode() {
    return (modeSingleRadio && modeSingleRadio.checked) ? 'single' : 'separate';
  }

  function updateExportBtnLabel() {
    var mode = getExportMode();
    if (exportAllBtnText) {
      exportAllBtnText.textContent = (mode === 'single') ? 'Xuất vào 1 file chung' : 'Xuất tách từng file riêng';
    }
  }

  try {
    var savedExportMode = localStorage.getItem('pannel_tc_export_mode');
    if (savedExportMode === 'separate' && modeSeparateRadio) {
      modeSeparateRadio.checked = true;
    } else if (modeSingleRadio) {
      modeSingleRadio.checked = true;
    }
  } catch(e) {}
  updateExportBtnLabel();

  if (modeSingleRadio) {
    modeSingleRadio.addEventListener('change', function () {
      updateExportBtnLabel();
      try { localStorage.setItem('pannel_tc_export_mode', 'single'); } catch(e) {}
    });
  }
  if (modeSeparateRadio) {
    modeSeparateRadio.addEventListener('change', function () {
      updateExportBtnLabel();
      try { localStorage.setItem('pannel_tc_export_mode', 'separate'); } catch(e) {}
    });
  }

  function doExportArtboard(scope, btn) {
    var mode = getExportMode();
    if (btn) btn.disabled = true;
    var originalText = btn ? btn.innerHTML : '';
    if (btn) btn.textContent = 'Đang xuất…';

    var scopeDesc = (scope === 'current') ? 'Artboard hiện tại' :
      (mode === 'single' ? 'Tất cả Artboards vào 1 file chung' : 'Mỗi Artboard là 1 file độc lập');
    log('Bắt đầu quy trình xuất bản file in (' + scopeDesc + ')…');

    window.TCBridge.call('exportArtboards', [scope, mode], function (err, res) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }

      if (err) {
        log('Lỗi xuất bản: ' + err.message, true);
        alert(err.message);
        return;
      }

      var msg = res.message || ('Đã xuất thành công: ' + res.successCount + ' Artboard');
      log(msg);
      if (res.folder) {
        window._lastExportFolder = res.folder;
        log('Thư mục lưu: ' + res.folder);
      }
      if (res.files && res.files.length) {
        var names = res.files.map(function(f) { return f.name; }).join(', ');
        log('Các file: ' + names);
      }
      fetchState();
    });
  }

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', function () {
      doExportArtboard('all', exportAllBtn);
    });
  }

  if (exportCurBtn) {
    exportCurBtn.addEventListener('click', function () {
      doExportArtboard('current', exportCurBtn);
    });
  }

  var openExportFolderBtn = document.getElementById('open-export-folder-btn');
  if (openExportFolderBtn) {
    openExportFolderBtn.addEventListener('click', function () {
      log('Đang mở thư mục xuất file in trên Windows Explorer…');
      window.TCBridge.call('openFolder', [window._lastExportFolder || '', true], function (err, res) {
        if (err) {
          log('Lỗi mở thư mục: ' + err.message, true);
          alert(err.message);
          return;
        }
        if (res && res.folder) {
          launchExplorerForeground(res.folder, function () {
            log('Đã mở thư mục xuất file in: ' + res.folder);
          });
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // 5. Đổi chữ theo danh sách (Data Merge / Variable)
  // ------------------------------------------------------------------
  var varCheckSelBtn = document.getElementById('var-check-sel-btn');
  var varSelectionText = document.getElementById('var-selection-text');
  var varConfigContainer = document.getElementById('var-config-container');
  var varFieldsList = document.getElementById('var-fields-list');
  var varFieldsCount = document.getElementById('var-fields-count');
  var varInputList = document.getElementById('var-input-list');
  var varLineCount = document.getElementById('var-line-count');
  var varDownloadCsvBtn = document.getElementById('var-download-csv-btn');
  var varUploadCsvBtn = document.getElementById('var-upload-csv-btn');
  var varCsvFileInput = document.getElementById('var-csv-file-input');
  var varColsEl = document.getElementById('var-cols');
  var varStartPosEl = document.getElementById('var-start-pos');
  var varCreateGroupEl = document.getElementById('var-create-group');
  var varKeepMasterEl = document.getElementById('var-keep-master');
  var varGenerateBtn = document.getElementById('var-generate-btn');
  var varModeCanvasRadio = document.getElementById('var-mode-canvas');
  var varModeJpgRadio = document.getElementById('var-mode-jpg');
  var varCanvasConfig = document.getElementById('var-canvas-config');
  var varJpgConfig = document.getElementById('var-jpg-config');
  var varExportJpgBtn = document.getElementById('var-export-jpg-btn');
  var varOpenFolderRow = document.getElementById('var-open-folder-row');
  var varOpenFolderBtn = document.getElementById('var-open-folder-btn');

  // Elements: View Dataset & Dừng xuất bản
  var varViewDatasetBtn = document.getElementById('var-view-dataset-btn');
  var varDatasetPreviewBox = document.getElementById('var-dataset-preview-box');
  var varDatasetCloseBtn = document.getElementById('var-dataset-close-btn');
  var varDatasetTable = document.getElementById('var-dataset-table');
  var varDatasetThead = document.getElementById('var-dataset-thead');
  var varDatasetTbody = document.getElementById('var-dataset-tbody');
  var varDatasetRowBadge = document.getElementById('var-dataset-row-badge');

  var varExportProgressBox = document.getElementById('var-export-progress-box');
  var varExportProgressCounter = document.getElementById('var-export-progress-counter');
  var varExportProgressBar = document.getElementById('var-export-progress-bar');
  var varExportCurrentName = document.getElementById('var-export-current-name');
  var varExportStopBtn = document.getElementById('var-export-stop-btn');

  var varCanvasProgressBox = document.getElementById('var-canvas-progress-box');
  var varCanvasProgressCounter = document.getElementById('var-canvas-progress-counter');
  var varCanvasStopBtn = document.getElementById('var-canvas-stop-btn');

  var currentVariableFields = [];
  var isJpgExporting = false;
  var isJpgExportCancelled = false;

  function parseDataLines(rawText) {
    if (!rawText) return [];
    var lines = rawText.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.length > 0) {
        result.push(lines[i]);
      }
    }
    return result;
  }

  function parseTokens(line, fieldCount) {
    var trimmed = (line || '').trim();
    if (trimmed.indexOf('\t') !== -1) {
      return trimmed.split('\t');
    } else if (trimmed.indexOf(';') !== -1) {
      return trimmed.split(';');
    } else if (fieldCount > 1 && trimmed.indexOf(',') !== -1) {
      return trimmed.split(',');
    }
    return [trimmed];
  }

  function getActiveMappings() {
    var selects = varFieldsList ? varFieldsList.querySelectorAll('.field-select') : [];
    var mappings = [];
    for (var s = 0; s < selects.length; s++) {
      mappings.push(parseInt(selects[s].value, 10));
    }
    return mappings;
  }

  function renderDatasetPreview() {
    if (!varDatasetThead || !varDatasetTbody || !varInputList) return;

    var lines = parseDataLines(varInputList.value);
    if (lines.length === 0) {
      alert('Vui lòng nhập hoặc tải file CSV vào ô danh sách để xem Dataset!');
      if (varDatasetPreviewBox) varDatasetPreviewBox.style.display = 'none';
      if (varViewDatasetBtn) varViewDatasetBtn.classList.remove('active');
      return;
    }

    var mappings = getActiveMappings();
    var fields = currentVariableFields || [];

    var theadHtml = '<tr><th class="col-idx">#</th>';

    var maxColsInMapping = 1;
    for (var m = 0; m < mappings.length; m++) {
      if (mappings[m] > maxColsInMapping) maxColsInMapping = mappings[m];
    }

    var numColsToRender = Math.max(maxColsInMapping, fields.length || 1);
    for (var c = 1; c <= numColsToRender; c++) {
      var mappedFieldNames = [];
      for (var fIdx = 0; fIdx < fields.length; fIdx++) {
        var cTarget = (fIdx < mappings.length) ? mappings[fIdx] : (fIdx + 1);
        if (cTarget === c) {
          var fRaw = (fields[fIdx].raw || ('Trường ' + (fIdx + 1))).trim();
          if (fRaw.length > 15) fRaw = fRaw.substring(0, 15) + '…';
          mappedFieldNames.push(fRaw);
        }
      }
      var colTitle = 'Cột ' + c;
      if (mappedFieldNames.length > 0) {
        colTitle += ' (' + mappedFieldNames.join(', ') + ')';
      }
      theadHtml += '<th>' + colTitle + '</th>';
    }

    theadHtml += '<th class="col-filename">📁 Tên File JPG Dự Kiến</th></tr>';
    varDatasetThead.innerHTML = theadHtml;

    var tbodyHtml = '';
    lines.forEach(function (line, rowIdx) {
      var tokens = parseTokens(line, fields.length);
      tbodyHtml += '<tr><td class="col-idx">' + (rowIdx + 1) + '</td>';

      for (var colI = 1; colI <= numColsToRender; colI++) {
        var val = (colI - 1 < tokens.length) ? tokens[colI - 1].trim() : '';
        if (val.length === 0) {
          tbodyHtml += '<td><span class="empty-cell">(trống)</span></td>';
        } else {
          tbodyHtml += '<td title="' + val.replace(/"/g, '&quot;') + '">' + val + '</td>';
        }
      }

      var replacedValues = [];
      for (var tj = 0; tj < fields.length; tj++) {
        var cTarget = (tj < mappings.length) ? mappings[tj] : (tj + 1);
        if (cTarget > 0 && (cTarget - 1) < tokens.length) {
          var tokenVal = tokens[cTarget - 1].trim();
          if (tokenVal.length > 0) {
            replacedValues.push(tokenVal);
          }
        }
      }

      var nameCandidate = replacedValues.length > 0 ? replacedValues.join(' - ') : ('Item_' + (rowIdx + 1));
      var safeName = nameCandidate
        .replace(/[\r\n\\\/:\*\?"<>\|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
      if (!safeName) safeName = 'Item_' + (rowIdx + 1);

      tbodyHtml += '<td class="col-filename" title="' + safeName + '.jpg">' + safeName + '.jpg</td></tr>';
    });

    varDatasetTbody.innerHTML = tbodyHtml;
    if (varDatasetRowBadge) {
      varDatasetRowBadge.textContent = lines.length + ' dòng dữ liệu';
    }

    if (varDatasetPreviewBox) {
      varDatasetPreviewBox.style.display = 'block';
    }
    if (varViewDatasetBtn) {
      varViewDatasetBtn.classList.add('active');
    }
  }

  function updateDatasetPreviewIfVisible() {
    if (varDatasetPreviewBox && varDatasetPreviewBox.style.display !== 'none') {
      renderDatasetPreview();
    }
  }

  if (varViewDatasetBtn) {
    varViewDatasetBtn.addEventListener('click', function () {
      if (varDatasetPreviewBox && varDatasetPreviewBox.style.display !== 'none') {
        varDatasetPreviewBox.style.display = 'none';
        varViewDatasetBtn.classList.remove('active');
      } else {
        renderDatasetPreview();
      }
    });
  }

  if (varDatasetCloseBtn && varDatasetPreviewBox) {
    varDatasetCloseBtn.addEventListener('click', function () {
      varDatasetPreviewBox.style.display = 'none';
      if (varViewDatasetBtn) varViewDatasetBtn.classList.remove('active');
    });
  }

  function updateVariableLineCount() {
    if (!varInputList || !varLineCount) return;
    var lines = varInputList.value.split('\n').filter(function (l) {
      return l.trim().length > 0;
    });
    varLineCount.textContent = lines.length + ' dòng';
    updateDatasetPreviewIfVisible();
  }

  if (varInputList) {
    varInputList.addEventListener('input', updateVariableLineCount);
    varInputList.addEventListener('change', updateVariableLineCount);
  }

  function renderFieldMappings(fields) {
    if (!varFieldsList) return;
    varFieldsList.innerHTML = '';
    currentVariableFields = fields || [];

    if (varFieldsCount) {
      varFieldsCount.textContent = currentVariableFields.length + ' trường chữ';
    }

    if (!fields || fields.length === 0) return;

    fields.forEach(function (field, i) {
      var itemDiv = document.createElement('div');
      itemDiv.className = 'field-item';

      var numSpan = document.createElement('span');
      numSpan.className = 'field-num';
      numSpan.textContent = '#' + (i + 1);

      var previewSpan = document.createElement('span');
      previewSpan.className = 'field-preview';
      previewSpan.title = field.raw || '';
      previewSpan.textContent = '"' + (field.preview || '') + '"';

      var select = document.createElement('select');
      select.className = 'field-select';
      select.setAttribute('data-field-idx', String(i));

      var colsOptions = [
        { val: 1, label: 'Cột 1 (A)' },
        { val: 2, label: 'Cột 2 (B)' },
        { val: 3, label: 'Cột 3 (C)' },
        { val: 4, label: 'Cột 4 (D)' },
        { val: 5, label: 'Cột 5 (E)' },
        { val: 6, label: 'Cột 6 (F)' },
        { val: 7, label: 'Cột 7 (G)' },
        { val: 8, label: 'Cột 8 (H)' },
        { val: 0, label: '-- Giữ nguyên --' }
      ];

      var defaultCol = (i < 8) ? (i + 1) : 0;

      colsOptions.forEach(function (opt) {
        var optEl = document.createElement('option');
        optEl.value = String(opt.val);
        optEl.textContent = opt.label;
        if (opt.val === defaultCol) {
          optEl.selected = true;
        }
        select.appendChild(optEl);
      });

      select.addEventListener('change', function () {
        updateDatasetPreviewIfVisible();
      });

      itemDiv.appendChild(numSpan);
      itemDiv.appendChild(previewSpan);
      itemDiv.appendChild(select);
      varFieldsList.appendChild(itemDiv);
    });

    updateDatasetPreviewIfVisible();
  }

  function checkVariableSelection() {
    if (!varSelectionText) return;
    varSelectionText.textContent = 'Đang nhận diện mẫu…';
    varSelectionText.style.color = '#9ca3af';

    window.TCBridge.call('getVariableSelectionInfo', [], function (err, res) {
      if (err) {
        varSelectionText.textContent = 'Lỗi nhận diện: ' + err.message;
        varSelectionText.style.color = '#ef4444';
        if (varConfigContainer) varConfigContainer.style.display = 'none';
        log('Lỗi kiểm tra mẫu: ' + err.message, true);
        return;
      }
      if (!res.hasSelection) {
        varSelectionText.textContent = 'Chưa chọn mẫu trên Artboard!';
        varSelectionText.style.color = '#f59e0b';
        if (varConfigContainer) varConfigContainer.style.display = 'none';
        log('Vui lòng quét chọn mẫu thiết kế (Logo + Chữ) trên Artboard trước khi bấm Nhận diện!', true);
        return;
      }
      if (!res.textCount || res.textCount === 0) {
        varSelectionText.textContent = 'Mẫu không có chữ (TextFrame)!';
        varSelectionText.style.color = '#f59e0b';
        if (varConfigContainer) varConfigContainer.style.display = 'none';
        log('Mẫu thiết kế được chọn không chứa đối tượng chữ nào.', true);
        return;
      }

      varSelectionText.textContent = res.message;
      varSelectionText.style.color = '#34d399';
      log(res.message);

      // Hiển thị khung cấu hình & render các trường chữ
      if (varConfigContainer) {
        varConfigContainer.style.display = 'block';
      }
      renderFieldMappings(res.fields || []);
    });
  }

  if (varCheckSelBtn) {
    varCheckSelBtn.addEventListener('click', checkVariableSelection);
  }

  // ------------------------------------------------------------------
  // Tải file CSV mẫu & Tải lên file CSV
  // ------------------------------------------------------------------
  function escapeCsvCell(str) {
    if (str === null || str === undefined) return '""';
    var s = String(str).replace(/"/g, '""');
    return '"' + s + '"';
  }

  function downloadCsvTemplate() {
    if (!currentVariableFields || currentVariableFields.length === 0) {
      log('Vui lòng quét chọn mẫu và bấm Nhận diện mẫu trước khi tải file CSV!', true);
      alert('Vui lòng bấm "🔍 Nhận diện mẫu" trước để hệ thống trích xuất các trường chữ của mẫu thiết kế!');
      return;
    }

    var headers = [];
    var sampleRow1 = [];
    var sampleRow2 = [];
    var sampleRow3 = [];

    var defaultSamples = [
      ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường'],
      ['Trưởng phòng Kinh Doanh', 'Nhân viên Marketing', 'Giám đốc Điều hành'],
      ['Chúc mừng sinh nhật!', 'Chúc bạn thành công rực rỡ!', 'Vạn sự như ý, an khang!'],
      ['Phòng Kế Toán', 'Phòng Kỹ Thuật', 'Ban Giám Đốc'],
      ['Mã: NV01', 'Mã: NV02', 'Mã: NV03']
    ];

    currentVariableFields.forEach(function (f, i) {
      var fieldName = 'Cot_' + (i + 1);
      if (f.raw && f.raw.trim().length > 0) {
        var cleanRaw = f.raw.replace(/[\r\n\t,]+/g, ' ').trim();
        if (cleanRaw.length > 20) cleanRaw = cleanRaw.substring(0, 20);
        fieldName += ' (' + cleanRaw + ')';
      }
      headers.push(escapeCsvCell(fieldName));

      sampleRow1.push(escapeCsvCell(f.raw || ('Dữ liệu ' + (i + 1) + ' mẫu 1')));

      var sampleGroup = defaultSamples[i % defaultSamples.length];
      sampleRow2.push(escapeCsvCell(sampleGroup[1] || ('Dữ liệu ' + (i + 1) + ' mẫu 2')));
      sampleRow3.push(escapeCsvCell(sampleGroup[2] || ('Dữ liệu ' + (i + 1) + ' mẫu 3')));
    });

    var csvContent = [
      headers.join(','),
      sampleRow1.join(','),
      sampleRow2.join(','),
      sampleRow3.join(',')
    ].join('\r\n');

    // Thêm UTF-8 BOM (\uFEFF) để Microsoft Excel trên Windows tự động nhận diện tiếng Việt
    var bomCsvContent = '\uFEFF' + csvContent;
    var defaultFileName = 'mau_du_lieu_' + currentVariableFields.length + '_cot.csv';

    // Mở hộp thoại lưu file của CEP nếu có
    if (window.cep && window.cep.fs && window.cep.fs.showSaveDialogEx) {
      try {
        var saveResult = window.cep.fs.showSaveDialogEx('Lưu file CSV mẫu', '', ['csv'], defaultFileName, 'mau_du_lieu.csv');
        if (saveResult && saveResult.data && saveResult.data.length > 0) {
          var savePath = saveResult.data;
          var writeRes = window.cep.fs.writeFile(savePath, bomCsvContent, cep.encoding.UTF8);
          if (writeRes.err === 0) {
            log('Đã lưu file CSV mẫu thành công tại: ' + savePath);
            alert('Đã lưu file CSV mẫu thành công!\nBạn hãy mở file bằng Excel để nhập danh sách dữ liệu.');
            return;
          }
        } else {
          return; // Người dùng ấn Cancel
        }
      } catch (eSave) {}
    }

    // Fallback cho trình duyệt web
    var blob = new Blob([bomCsvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    log('Đã tải xuống file CSV mẫu: ' + defaultFileName);
  }

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var rows = [];
    var currentRow = [];
    var currentCell = '';
    var inQuotes = false;

    // Tự động nhận diện dấu phân cách cột (, hoặc ; hoặc \t)
    var firstLine = text.split(/\r\n|\n|\r/)[0] || '';
    var delimiter = ',';
    var tabCount = (firstLine.match(/\t/g) || []).length;
    var semiCount = (firstLine.match(/;/g) || []).length;
    var commaCount = (firstLine.match(/,/g) || []).length;

    if (tabCount > commaCount && tabCount > semiCount) {
      delimiter = '\t';
    } else if (semiCount > commaCount) {
      delimiter = ';';
    }

    for (var i = 0; i < text.length; i++) {
      var char = text[i];
      var nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Bỏ qua dấu ngoặc kép thoát ""
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some(function (c) { return c.length > 0; })) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(function (c) { return c.length > 0; })) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  function handleCsvFileSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (evt) {
      var text = evt.target.result;
      if (!text || text.trim().length === 0) {
        log('File được chọn đang trống!', true);
        alert('File được chọn đang trống!');
        return;
      }

      var rows = parseCSV(text);
      if (rows.length === 0) {
        log('Không tìm thấy dòng dữ liệu nào trong file!', true);
        return;
      }

      // Kiểm tra xem dòng đầu có phải là Tiêu đề (Header) hay không
      var firstRow = rows[0];
      var isHeader = false;
      var headerKeywords = ['cot', 'cột', 'column', 'stt', 'tên', 'ten', 'chức vụ', 'chuc vu', 'lời chúc', 'loi chuc', 'họ và tên', 'name', 'title'];
      for (var k = 0; k < firstRow.length; k++) {
        var valLower = firstRow[k].toLowerCase();
        for (var kw = 0; kw < headerKeywords.length; kw++) {
          if (valLower.indexOf(headerKeywords[kw]) !== -1) {
            isHeader = true;
            break;
          }
        }
        if (isHeader) break;
      }

      var skippedHeaderMsg = '';
      if (isHeader && rows.length > 1) {
        var headerName = rows.shift().join(' | ');
        skippedHeaderMsg = ' (Đã tự động bỏ qua dòng tiêu đề: ' + headerName + ')';
      }

      // Nối các cột thành định dạng Tab-separated (\t) và đưa vào ô textarea
      var formattedLines = rows.map(function (row) {
        return row.join('\t');
      });

      if (varInputList) {
        varInputList.value = formattedLines.join('\n');
        updateVariableLineCount();
      }

      log('Đã nạp thành công ' + formattedLines.length + ' dòng dữ liệu từ file "' + file.name + '"' + skippedHeaderMsg);
    };

    reader.onerror = function () {
      log('Lỗi khi đọc file: ' + file.name, true);
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  if (varDownloadCsvBtn) {
    varDownloadCsvBtn.addEventListener('click', downloadCsvTemplate);
  }

  if (varUploadCsvBtn && varCsvFileInput) {
    varUploadCsvBtn.addEventListener('click', function () {
      varCsvFileInput.click();
    });
    varCsvFileInput.addEventListener('change', handleCsvFileSelect);
  }

  if (varCanvasStopBtn) {
    varCanvasStopBtn.addEventListener('click', function () {
      log('Đang gửi tín hiệu dừng dàn trang…', true);
      window.TCBridge.call('setExportAbortFlag', [], function () {});
      if (varCanvasProgressCounter) varCanvasProgressCounter.textContent = 'Đang dừng…';
      varCanvasStopBtn.disabled = true;
    });
  }

  if (varGenerateBtn) {
    varGenerateBtn.addEventListener('click', function () {
      if (!varInputList) return;
      var lines = parseDataLines(varInputList.value);

      if (lines.length === 0) {
        log('Vui lòng nhập hoặc paste ít nhất 1 dòng văn bản vào danh sách!', true);
        alert('Vui lòng paste danh sách dữ liệu từ Excel vào ô nhập!');
        varInputList.focus();
        return;
      }

      var mappings = getActiveMappings();
      var cols = varColsEl ? parseInt(varColsEl.value, 10) : 2;
      var startPos = varStartPosEl ? varStartPosEl.value : 'right';
      var createGroup = varCreateGroupEl ? varCreateGroupEl.checked : true;
      var keepMaster = varKeepMasterEl ? varKeepMasterEl.checked : true;

      var opts = {
        items: lines,
        mappings: mappings,
        columns: isNaN(cols) || cols < 1 ? 2 : cols,
        startPos: startPos,
        createGroup: createGroup,
        keepMaster: keepMaster
      };

      varGenerateBtn.disabled = true;
      var originalText = varGenerateBtn.innerHTML;
      varGenerateBtn.textContent = 'Đang tạo ' + lines.length + ' bản…';
      if (varCanvasProgressBox) {
        varCanvasProgressBox.style.display = 'block';
        if (varCanvasProgressCounter) varCanvasProgressCounter.textContent = 'Đang xử lý ' + lines.length + ' bản…';
        if (varCanvasStopBtn) varCanvasStopBtn.disabled = false;
      }
      log('Đang nhân bản & thay đổi văn bản cho ' + lines.length + ' dòng dữ liệu (tự động cách 10mm)…');

      window.TCBridge.call('generateFromList', [opts], function (err, res) {
        varGenerateBtn.disabled = false;
        varGenerateBtn.innerHTML = originalText;
        if (varCanvasProgressBox) varCanvasProgressBox.style.display = 'none';

        if (err) {
          log('Lỗi tạo danh sách: ' + err.message, true);
          alert(err.message);
          return;
        }

        log(res.message || ('Đã tạo thành công ' + lines.length + ' bản sao.'));
        fetchState();
      });
    });
  }

  // Chuyển đổi qua lại giữa chế độ Dàn lưới trên Artboard và Xuất ảnh JPG Save for Web
  function switchVariableMode() {
    var isJpg = varModeJpgRadio && varModeJpgRadio.checked;
    if (varCanvasConfig) varCanvasConfig.style.display = isJpg ? 'none' : 'block';
    if (varJpgConfig) varJpgConfig.style.display = isJpg ? 'block' : 'none';
  }

  if (varModeCanvasRadio) varModeCanvasRadio.addEventListener('change', switchVariableMode);
  if (varModeJpgRadio) varModeJpgRadio.addEventListener('change', switchVariableMode);

  // Xử lý nút Dừng Xuất Ảnh JPG khẩn cấp
  if (varExportStopBtn) {
    varExportStopBtn.addEventListener('click', function () {
      if (!isJpgExporting) return;
      isJpgExportCancelled = true;
      varExportStopBtn.disabled = true;
      varExportStopBtn.textContent = '⏳ Đang dừng xuất bản…';
      log('Đang gửi tín hiệu dừng xuất ảnh khẩn cấp…', true);
      window.TCBridge.call('setExportAbortFlag', [], function () {});
    });
  }

  function cleanupJpgExportUI(wasCancelled, doneCount, totalCount, folder, errorMsg) {
    isJpgExporting = false;
    isJpgExportCancelled = false;

    varExportJpgBtn.style.display = 'block';
    varExportJpgBtn.disabled = false;
    if (varExportProgressBox) varExportProgressBox.style.display = 'none';

    if (wasCancelled) {
      log('Đã dừng xuất bản theo yêu cầu! Đã xuất được: ' + doneCount + '/' + totalCount + ' file ảnh.', true);
      alert('Đã dừng xuất bản theo yêu cầu của bạn!\nĐã xuất được: ' + doneCount + '/' + totalCount + ' file ảnh JPG.');
    } else if (errorMsg) {
      log('Lỗi xuất ảnh JPG: ' + errorMsg, true);
      alert('Quá trình xuất ảnh bị dừng: ' + errorMsg);
    } else {
      if (varExportProgressBar) varExportProgressBar.style.width = '100%';
      log('🎉 Đã xuất thành công toàn bộ ' + totalCount + ' file ảnh JPG toàn bộ Artboard!');
      alert('🎉 Đã xuất thành công toàn bộ ' + totalCount + ' file ảnh JPG chất lượng cao (Save for Web Max 3000px) vào thư mục:\n' + folder);
    }

    if (doneCount > 0 && folder) {
      window._lastJpgExportFolder = folder;
      if (varOpenFolderRow) varOpenFolderRow.style.display = 'block';
      launchExplorerForeground(folder, function () {
        log('Đã mở thư mục ảnh JPG trên Windows Explorer: ' + folder);
      });
    }
  }

  // Xuất hàng loạt file ảnh JPG chất lượng cao (Save for Web Toàn Bộ Artboard - Max 3000px)
  if (varExportJpgBtn) {
    varExportJpgBtn.addEventListener('click', function () {
      if (!varInputList) return;
      var lines = parseDataLines(varInputList.value);

      if (lines.length === 0) {
        log('Vui lòng nhập hoặc paste ít nhất 1 dòng văn bản vào danh sách trước khi xuất ảnh!', true);
        alert('Vui lòng paste danh sách dữ liệu từ Excel vào ô nhập!');
        varInputList.focus();
        return;
      }

      var mappings = getActiveMappings();

      isJpgExporting = true;
      isJpgExportCancelled = false;

      // Ẩn nút xuất, hiển thị khung tiến trình & nút dừng
      varExportJpgBtn.style.display = 'none';
      if (varExportProgressBox) {
        varExportProgressBox.style.display = 'block';
      }
      if (varExportProgressBar) varExportProgressBar.style.width = '0%';
      if (varExportProgressCounter) varExportProgressCounter.textContent = '0 / ' + lines.length + ' (0%)';
      if (varExportCurrentName) varExportCurrentName.textContent = 'Đang khởi tạo phiên xuất ảnh…';
      if (varExportStopBtn) {
        varExportStopBtn.disabled = false;
        varExportStopBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"></rect></svg> ⏹ DỪNG XUẤT BẢN NGAY';
      }
      if (varOpenFolderRow) varOpenFolderRow.style.display = 'none';

      log('Bắt đầu phiên xuất hàng loạt ' + lines.length + ' file ảnh JPG (Toàn bộ Artboard, Max 3000px)…');

      window.TCBridge.call('prepareBatchJpg', [{ items: lines, mappings: mappings }], function (pErr, pRes) {
        if (pErr) {
          cleanupJpgExportUI(false, 0, lines.length, '', pErr.message);
          return;
        }

        var exportFolder = pRes.folder;
        window._lastJpgExportFolder = exportFolder;
        var total = lines.length;
        var curIdx = 0;

        function stepJpgExport() {
          if (isJpgExportCancelled || curIdx >= total) {
            if (isJpgExportCancelled) {
              window.TCBridge.call('cancelBatchJpg', [], function () {
                cleanupJpgExportUI(true, curIdx, total, exportFolder);
              });
            } else {
              window.TCBridge.call('finishBatchJpg', [], function () {
                cleanupJpgExportUI(false, total, total, exportFolder);
              });
            }
            return;
          }

          var pct = Math.round((curIdx / total) * 100);
          if (varExportProgressBar) varExportProgressBar.style.width = pct + '%';
          if (varExportProgressCounter) varExportProgressCounter.textContent = (curIdx + 1) + ' / ' + total + ' (' + pct + '%)';

          var lineTokens = parseTokens(lines[curIdx], currentVariableFields ? currentVariableFields.length : 1);
          var lineShort = (lineTokens[0] || lines[curIdx]).trim().substring(0, 30);
          if (varExportCurrentName) varExportCurrentName.textContent = 'Đang xuất (' + (curIdx + 1) + '/' + total + '): ' + lineShort + '…';
          log('Đang xuất ảnh ' + (curIdx + 1) + '/' + total + ': ' + lineShort);

          window.TCBridge.call('exportBatchJpgItem', [curIdx, lines[curIdx], mappings], function (iErr, iRes) {
            if (iErr) {
              log('Lỗi xuất tại dòng ' + (curIdx + 1) + ': ' + iErr.message, true);
              window.TCBridge.call('cancelBatchJpg', [], function () {
                cleanupJpgExportUI(true, curIdx, total, exportFolder, iErr.message);
              });
              return;
            }

            if (iRes && iRes.cancelled) {
              cleanupJpgExportUI(true, curIdx, total, exportFolder);
              return;
            }

            curIdx++;
            // Cho phép CEP UI render mượt mà và đón sự kiện bấm nút Stop
            setTimeout(stepJpgExport, 20);
          });
        }

        stepJpgExport();
      });
    });
  }

  if (varOpenFolderBtn) {
    varOpenFolderBtn.addEventListener('click', function () {
      if (window._lastJpgExportFolder) {
        launchExplorerForeground(window._lastJpgExportFolder, function () {
          log('Đã mở thư mục ảnh JPG: ' + window._lastJpgExportFolder);
        });
      } else {
        openWindowsExplorer();
      }
    });
  }

  // ------------------------------------------------------------------
  // 6. Mở Windows Explorer & Thư mục dự án (Luôn đưa cửa sổ lên tiền cảnh đè lên Illustrator)
  // ------------------------------------------------------------------
  var isOpeningExplorer = false;

  function launchExplorerForeground(targetPath, callback) {
    if (isOpeningExplorer) return;
    isOpeningExplorer = true;

    setTimeout(function () {
      isOpeningExplorer = false;
    }, 800);

    var cp = (window.cep_node && window.cep_node.require) ? window.cep_node.require('child_process') : (typeof require !== 'undefined' ? require('child_process') : null);
    var isWin = (navigator.platform && navigator.platform.indexOf('Win') > -1);

    if (cp && isWin) {
      var cmd = '';
      if (targetPath) {
        var safePath = targetPath.replace(/\//g, '\\');
        // Mở thư mục và dùng AppActivate để kéo cửa sổ Explorer lên phía trước (đè lên Illustrator)
        cmd = 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "& { Start-Process explorer.exe -ArgumentList \'' + safePath.replace(/'/g, "''") + '\'; Start-Sleep -Milliseconds 250; (New-Object -ComObject WScript.Shell).AppActivate((Split-Path \'' + safePath.replace(/'/g, "''") + '\' -Leaf)) }"';
      } else {
        // Mở Windows Explorer chung và kích hoạt cửa sổ lên tiền cảnh
        cmd = 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "& { $ws = New-Object -ComObject WScript.Shell; $ws.Run(\'explorer.exe\', 1, $false); Start-Sleep -Milliseconds 250; $ws.AppActivate(\'File Explorer\'); $ws.AppActivate(\'explorer\'); $ws.AppActivate(\'This PC\') }"';
      }

      cp.exec(cmd, { windowsHide: true }, function (err) {
        if (err) {
          console.warn('PowerShell launch failed, fallback to cmd start:', err);
          var fallback = targetPath ? ('cmd.exe /c start "" "' + targetPath.replace(/\//g, '\\') + '"') : 'cmd.exe /c start "" explorer.exe';
          cp.exec(fallback, { windowsHide: true });
        }
        if (typeof callback === 'function') callback(null);
      });
      return;
    }

    if (cp && !isWin) {
      var macCmd = targetPath ? ('open "' + targetPath + '"') : 'open -a Finder';
      cp.exec(macCmd);
      if (typeof callback === 'function') callback(null);
      return;
    }

    // Dự phòng qua ExtendScript nếu không có Node.js
    if (targetPath) {
      window.TCBridge.call('openFolder', [targetPath], callback);
    } else {
      window.TCBridge.call('openExplorer', [], callback);
    }
  }

  var quickOpenFolderBtn = document.getElementById('quick-open-folder-btn');
  var openProjectFolderBtn = document.getElementById('open-project-folder-btn');

  // Nút trên thanh trạng thái: Mở trực tiếp Windows Explorer và đưa lên tiền cảnh
  function openWindowsExplorer() {
    log('Đang mở Windows Explorer…');
    launchExplorerForeground(null, function (err) {
      if (err) {
        log('Lỗi mở Windows Explorer: ' + err.message, true);
        return;
      }
      log('Đã mở Windows Explorer.');
    });
  }

  // Nút trong mục Tài liệu hiện hành: Lấy đường dẫn file .ai đang mở và mở đè lên Illustrator
  function openCurrentProjectFolder() {
    log('Đang xác định thư mục file đang mở…');
    // skipExecute = true để JSX chỉ lấy đường dẫn, Node.js sẽ mở và đưa cửa sổ lên tiền cảnh
    window.TCBridge.call('openFolder', ['', true], function (err, res) {
      if (err) {
        log('Lỗi mở thư mục: ' + err.message, true);
        alert(err.message);
        return;
      }
      if (res && res.folder) {
        log('Đang mở thư mục: ' + res.folder);
        launchExplorerForeground(res.folder, function () {
          log('Đã mở thư mục trên Windows Explorer: ' + res.folder);
        });
      }
    });
  }

  if (quickOpenFolderBtn) {
    quickOpenFolderBtn.addEventListener('click', openWindowsExplorer);
  }

  if (openProjectFolderBtn) {
    openProjectFolderBtn.addEventListener('click', openCurrentProjectFolder);
  }

  // ------------------------------------------------------------------
  // 7. Quản lý Auto-Update qua GitHub (TCUpdater)
  // ------------------------------------------------------------------
  var updateBanner = document.getElementById('update-banner');
  var updateNewVer = document.getElementById('update-new-ver');
  var updateChangelog = document.getElementById('update-changelog');
  var updateApplyBtn = document.getElementById('update-apply-btn');
  var updateDismissBtn = document.getElementById('update-dismiss-btn');
  var checkUpdateBtn = document.getElementById('check-update-btn');
  var manualCheckUpdateBtn = document.getElementById('manual-check-update-btn');
  var githubRepoInput = document.getElementById('github-repo-input');
  var githubTokenInput = document.getElementById('github-token-input');
  var saveRepoBtn = document.getElementById('save-repo-btn');
  var panelVersionPill = document.getElementById('panel-version-pill');

  var pendingDownloadUrl = '';

  // Khởi tạo hiển thị phiên bản hiện tại
  if (panelVersionPill && window.TCUpdater) {
    panelVersionPill.textContent = 'v' + window.TCUpdater.getVersion();
  }

  // Khởi tạo giá trị Repo & Token đã lưu
  if (githubRepoInput && window.TCUpdater) {
    githubRepoInput.value = window.TCUpdater.getRepo();
  }
  if (githubTokenInput && window.TCUpdater) {
    githubTokenInput.value = window.TCUpdater.getToken();
  }

  if (saveRepoBtn && githubRepoInput && window.TCUpdater) {
    saveRepoBtn.addEventListener('click', function () {
      var val = (githubRepoInput.value || '').trim();
      var tokenVal = githubTokenInput ? (githubTokenInput.value || '').trim() : '';

      if (!val || val.indexOf('/') === -1) {
        alert('Vui lòng nhập đúng định dạng GitHub Repo: username/ten-repo\n(Ví dụ: thietkeino/PannelTC)');
        return;
      }
      window.TCUpdater.setRepo(val);
      window.TCUpdater.setToken(tokenVal);
      log('Đã lưu cấu hình GitHub Repo: ' + val + (tokenVal ? ' (có Token)' : ''));
      alert('Đã lưu cấu hình GitHub: ' + val + '\nBây giờ bạn có thể bấm "Check 🔄" để kiểm tra bản mới.');
    });
  }

  function doCheckUpdate(showFeedback) {
    if (!window.TCUpdater) return;
    var repo = window.TCUpdater.getRepo();
    if (!repo) {
      if (showFeedback) {
        alert('Chưa cấu hình GitHub Repo!\nVui lòng nhập tên Repo (vd: username/PannelTC) ở mục Tài liệu hiện hành bên dưới rồi bấm Lưu.');
      }
      return;
    }

    // Cập nhật lại số phiên bản trên huy hiệu panel
    if (panelVersionPill && window.TCUpdater.getVersion) {
      panelVersionPill.textContent = 'v' + window.TCUpdater.getVersion();
    }

    if (showFeedback) {
      log('Đang kiểm tra bản cập nhật mới trên GitHub (' + repo + ')…');
    }

    window.TCUpdater.check(function (err, info) {
      if (err) {
        if (showFeedback) {
          log('Kiểm tra cập nhật: ' + err.message, true);
          alert(err.message);
        }
        return;
      }

      if (panelVersionPill && info.currentVersion) {
        panelVersionPill.textContent = 'v' + info.currentVersion;
      }

      if (info.hasUpdate) {
        log('🎉 Đã có phiên bản mới v' + info.newVersion + ' trên GitHub!');
        pendingDownloadUrl = info.downloadUrl;
        if (updateNewVer) updateNewVer.textContent = 'v' + info.newVersion;
        if (updateChangelog) updateChangelog.textContent = info.changelog;
        if (updateBanner) updateBanner.style.display = 'flex';
      } else {
        if (updateBanner) updateBanner.style.display = 'none';
        if (showFeedback) {
          log('Bạn đang sử dụng phiên bản mới nhất (v' + info.currentVersion + ').');
          alert('Tuyệt vời! Pannel TC đang ở phiên bản mới nhất (v' + info.currentVersion + ').');
        }
      }
    });
  }

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', function () {
      doCheckUpdate(true);
    });
  }

  if (manualCheckUpdateBtn) {
    manualCheckUpdateBtn.addEventListener('click', function () {
      doCheckUpdate(true);
    });
  }

  if (updateDismissBtn && updateBanner) {
    updateDismissBtn.addEventListener('click', function () {
      updateBanner.style.display = 'none';
    });
  }

  if (updateApplyBtn && window.TCUpdater) {
    updateApplyBtn.addEventListener('click', function () {
      if (!pendingDownloadUrl) return;
      updateApplyBtn.disabled = true;
      var origText = updateApplyBtn.textContent;
      updateApplyBtn.textContent = 'Đang tải…';

      window.TCUpdater.applyUpdate(pendingDownloadUrl, function (progressMsg) {
        log(progressMsg);
        updateApplyBtn.textContent = progressMsg;
      }, function (err, res) {
        updateApplyBtn.disabled = false;
        updateApplyBtn.textContent = origText;
        if (err) {
          log('Lỗi cập nhật: ' + err.message, true);
          alert('Cập nhật thất bại: ' + err.message);
          return;
        }
        log(res.message);
      });
    });
  }

  // Tự động kiểm tra bản mới sau 2.5 giây khi mở panel (chạy ngầm không alert phiền người dùng)
  setTimeout(function () {
    doCheckUpdate(false);
  }, 2500);

  // ------------------------------------------------------------------
  // 8. Khởi tạo, Làm mới (Reload) & Theme Listener
  // ------------------------------------------------------------------
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      log('Đang làm mới & tải lại toàn bộ Pannel TC…');
      try {
        window.location.reload(true);
      } catch (e) {
        window.location.reload();
      }
    });
  }

  // Phím tắt F5 hoặc Ctrl + R để làm mới bảng điều khiển ngay lập tức
  window.addEventListener('keydown', function (e) {
    if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
      e.preventDefault();
      log('Đang tải lại bảng điều khiển…');
      try {
        window.location.reload(true);
      } catch (err) {
        window.location.reload();
      }
    }
  });

  window.TCBridge.onThemeChanged(function () {
    log('Đã đồng bộ lại giao diện Illustrator.');
  });

  fetchState();
})();
