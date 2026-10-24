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

  // Elements: Ghi kích thước
  var runDimensionBtn = document.getElementById('run-dimension-btn');
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

  function getDimensionOptions() {
    var unitEl = document.getElementById('dim-unit');
    var decimalsEl = document.getElementById('dim-decimals');
    var offsetEl = document.getElementById('dim-offset');
    var fontEl = document.getElementById('dim-font-size');
    var strokeEl = document.getElementById('dim-stroke');
    var hSideEl = document.getElementById('dim-h-side');
    var vSideEl = document.getElementById('dim-v-side');
    var colorEl = document.getElementById('dim-color');

    var directEl = document.getElementById('dim-direct');
    var parentEl = document.getElementById('dim-parent');
    var nestedEl = document.getElementById('dim-nested');
    var strokeBoundsEl = document.getElementById('dim-stroke-bounds');
    var replaceEl = document.getElementById('dim-replace');

    return {
      unit: unitEl ? unitEl.value : 'mm',
      decimals: decimalsEl ? parseInt(decimalsEl.value, 10) : 1,
      ratio: 1,
      offset: offsetEl ? (parseFloat(offsetEl.value) || 6) : 6,
      fontSize: fontEl ? (parseFloat(fontEl.value) || 9) : 9,
      strokeWidth: strokeEl ? (parseFloat(strokeEl.value) || 0.6) : 0.6,
      hSide: hSideEl ? parseInt(hSideEl.value, 10) : 1,
      vSide: vSideEl ? parseInt(vSideEl.value, 10) : 1,
      color: colorEl ? parseInt(colorEl.value, 10) : 0,
      direct: directEl ? directEl.checked : true,
      parent: parentEl ? parentEl.checked : false,
      nested: nestedEl ? nestedEl.checked : false,
      withStroke: strokeBoundsEl ? strokeBoundsEl.checked : false,
      replace: replaceEl ? replaceEl.checked : true
    };
  }

  if (runDimensionBtn) {
    runDimensionBtn.addEventListener('click', function () {
      var opts = getDimensionOptions();
      runDimensionBtn.disabled = true;
      var originalText = runDimensionBtn.innerHTML;
      runDimensionBtn.textContent = 'Đang vẽ…';
      log('Đang tính toán & vẽ kích thước cho vùng chọn…');

      window.TCBridge.call('autoDimension', [opts], function (err, res) {
        runDimensionBtn.disabled = false;
        runDimensionBtn.innerHTML = originalText;

        if (err) {
          log('Lỗi ghi kích thước: ' + err.message, true);
          return;
        }

        log(res.message || 'Đã vẽ kích thước thành công!');
        fetchState();
      });
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
  function doExportArtboard(scope, btn) {
    if (btn) btn.disabled = true;
    var originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Đang xuất…';

    log('Bắt đầu quy trình xuất bản file in (' + (scope === 'all' ? 'Tất cả Artboards' : 'Artboard hiện tại') + ')…');

    window.TCBridge.call('exportArtboards', [scope], function (err, res) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }

      if (err) {
        log('Lỗi xuất bản: ' + err.message, true);
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
      window.TCBridge.call('openFolder', [window._lastExportFolder || ''], function (err, res) {
        if (err) {
          log('Lỗi mở thư mục: ' + err.message, true);
          alert(err.message);
          return;
        }
        log(res.message);
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

  var currentVariableFields = [];

  function updateVariableLineCount() {
    if (!varInputList || !varLineCount) return;
    var lines = varInputList.value.split('\n').filter(function (l) {
      return l.trim().length > 0;
    });
    varLineCount.textContent = lines.length + ' dòng';
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

      // Mặc định: dòng chữ 0 gán Cột 1, dòng chữ 1 gán Cột 2, dòng chữ 2 gán Cột 3...
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

      itemDiv.appendChild(numSpan);
      itemDiv.appendChild(previewSpan);
      itemDiv.appendChild(select);
      varFieldsList.appendChild(itemDiv);
    });
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

  if (varGenerateBtn) {
    varGenerateBtn.addEventListener('click', function () {
      if (!varInputList) return;
      var lines = varInputList.value.split('\n').filter(function (l) {
        return l.trim().length > 0;
      });

      if (lines.length === 0) {
        log('Vui lòng nhập hoặc paste ít nhất 1 dòng văn bản vào danh sách!', true);
        alert('Vui lòng paste danh sách dữ liệu từ Excel vào ô nhập!');
        varInputList.focus();
        return;
      }

      var selects = varFieldsList ? varFieldsList.querySelectorAll('.field-select') : [];
      var mappings = [];
      for (var s = 0; s < selects.length; s++) {
        mappings.push(parseInt(selects[s].value, 10));
      }

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
      log('Đang nhân bản & thay đổi văn bản cho ' + lines.length + ' dòng dữ liệu (tự động cách 10mm)…');

      window.TCBridge.call('generateFromList', [opts], function (err, res) {
        varGenerateBtn.disabled = false;
        varGenerateBtn.innerHTML = originalText;

        if (err) {
          log('Lỗi tạo danh sách: ' + err.message, true);
          return;
        }

        log(res.message || ('Đã tạo thành công ' + lines.length + ' bản sao.'));
        fetchState();
      });
    });
  }

  // ------------------------------------------------------------------
  // 6. Mở Windows Explorer & Thư mục dự án
  // ------------------------------------------------------------------
  var quickOpenFolderBtn = document.getElementById('quick-open-folder-btn');
  var openProjectFolderBtn = document.getElementById('open-project-folder-btn');

  // Nút trên thanh trạng thái: Mở trực tiếp Windows Explorer (không cần mở file)
  function openWindowsExplorer() {
    log('Đang mở Windows Explorer…');
    try {
      var cp = (window.cep_node && window.cep_node.require) ? window.cep_node.require('child_process') : (typeof require !== 'undefined' ? require('child_process') : null);
      if (cp && typeof cp.exec === 'function') {
        var isWin = (navigator.platform && navigator.platform.indexOf('Win') > -1);
        var cmd = isWin ? 'explorer.exe' : 'open .';
        cp.exec(cmd, function (err) {
          if (err) {
            console.warn('cp.exec explorer error, fallback to JSX:', err);
            window.TCBridge.call('openExplorer', [], function () {});
          }
        });
        log('Đã mở Windows Explorer.');
        return;
      }
    } catch (e) {
      console.warn('Node.js cp.exec not available:', e);
    }

    // Fallback qua JSX host nếu môi trường không có Node.js
    window.TCBridge.call('openExplorer', [], function (err, res) {
      if (err) {
        log('Lỗi mở Windows Explorer: ' + err.message, true);
        return;
      }
      log(res.message || 'Đã mở Windows Explorer.');
    });
  }

  // Nút trong mục Tài liệu hiện hành: Mở thư mục của file .ai đang mở
  function openCurrentProjectFolder() {
    log('Đang mở thư mục chứa file đang mở trên Windows Explorer…');
    window.TCBridge.call('openFolder', [], function (err, res) {
      if (err) {
        log('Lỗi mở thư mục: ' + err.message, true);
        alert(err.message);
        return;
      }
      log(res.message);
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
    panelVersionPill.textContent = 'v' + window.TCUpdater.version;
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

      if (info.hasUpdate) {
        log('🎉 Đã có phiên bản mới v' + info.newVersion + ' trên GitHub!');
        pendingDownloadUrl = info.downloadUrl;
        if (updateNewVer) updateNewVer.textContent = 'v' + info.newVersion;
        if (updateChangelog) updateChangelog.textContent = info.changelog;
        if (updateBanner) updateBanner.style.display = 'flex';
      } else {
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
  // 8. Khởi tạo & Theme Listener
  // ------------------------------------------------------------------
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      fetchState();
      log('Đã cập nhật trạng thái mới nhất.');
    });
  }

  window.TCBridge.onThemeChanged(function () {
    log('Đã đồng bộ lại giao diện Illustrator.');
  });

  fetchState();
})();
