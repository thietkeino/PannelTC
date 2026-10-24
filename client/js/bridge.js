/* Adobe CEP Bridge for Illustrator Pannel TC */
(function (global) {
  'use strict';

  var cep = global.__adobe_cep__;

  var allowedMethods = {
    getState: true,
    ping: true,
    setExtensionPath: true,
    openTemplate: true,
    browseAndOpenTemplate: true,
    autoDimension: true,
    clearDimensions: true,
    runAutoDimensionDialog: true,
    runDTFAutoNest: true,
    exportArtboards: true,
    runExportArtboardScript: true,
    getVariableSelectionInfo: true,
    generateFromList: true,
    openFolder: true,
    openExplorer: true
  };

  // Tự động đồng bộ đường dẫn Extension từ Adobe CEP sang Illustrator ExtendScript
  function syncExtensionPath() {
    if (cep && typeof cep.getSystemPath === 'function') {
      try {
        var extPath = cep.getSystemPath('extension') || '';
        if (extPath) {
          var safePath = extPath.replace(/\\/g, '/').replace(/\/+$/, '');
          cep.evalScript('if ($._PannelTC && $._PannelTC.setExtensionPath) { $._PannelTC.setExtensionPath(' + JSON.stringify(safePath) + '); }');
        }
      } catch (eSync) {}
    }
  }
  syncExtensionPath();


  global.TCBridge = {
    isAvailable: !!cep,

    getEnvironment: function () {
      if (!cep) return null;
      try {
        return JSON.parse(cep.getHostEnvironment());
      } catch (e) {
        return null;
      }
    },

    onThemeChanged: function (callback) {
      if (cep && typeof callback === 'function') {
        cep.addEventListener('com.adobe.csxs.events.ThemeColorChanged', callback);
      }
    },

    call: function (method, args, callback) {
      if (!allowedMethods[method]) {
        callback(new Error('Thao tác không được hỗ trợ: ' + method));
        return;
      }

      if (!cep) {
        // Mock mode for browser preview
        console.warn('[TCBridge] Chạy ngoài môi trường Illustrator. Chế độ mô phỏng: ' + method);
        setTimeout(function () {
          if (method === 'getState') {
            callback(null, {
              appName: 'Trình duyệt Web (Mô phỏng)',
              appVersion: 'Browser Mode',
              documentCount: 1,
              activeDocument: {
                name: 'Document_Demo.ai',
                path: 'D:/Demo/Document_Demo.ai',
                saved: true,
                artboards: 2,
                activeArtboardIndex: 0,
                selectionCount: 3,
                widthPt: 842,
                heightPt: 595
              }
            });
          } else if (method === 'openTemplate') {
            callback(null, { success: true, message: 'Mô phỏng mở template: ' + (args[0] || '') });
          } else if (method === 'browseAndOpenTemplate') {
            callback(null, { success: true, message: 'Mô phỏng duyệt file template.' });
          } else if (method === 'autoDimension') {
            callback(null, { success: true, count: 2, fails: 0, message: 'Mô phỏng: Đã vẽ kích thước cho 2 đối tượng (mm).' });
          } else if (method === 'clearDimensions') {
            callback(null, { success: true, count: 2, message: 'Mô phỏng: Đã xóa 2 nhóm kích thước cũ.' });
          } else if (method === 'runDTFAutoNest') {
            callback(null, { success: true, message: 'Mô phỏng khởi chạy Dàn trang DTF A3.' });
          } else if (method === 'exportArtboards') {
            callback(null, {
              success: true,
              successCount: 2,
              failCount: 0,
              folder: 'D:/Demo/Export',
              message: 'Mô phỏng xuất bản 2 artboards (PNG + PDF 300 DPI).'
            });
          } else if (method === 'runExportArtboardScript') {
            callback(null, { success: true, message: 'Mô phỏng chạy script ExportArtboard.jsx.' });
          } else if (method === 'runAutoDimensionDialog') {
            callback(null, { success: true, message: 'Mô phỏng mở hộp thoại Ghi kích thước gốc.' });
          } else if (method === 'getVariableSelectionInfo') {
            callback(null, {
              hasDoc: true,
              hasSelection: true,
              textCount: 3,
              selectionCount: 1,
              fields: [
                { index: 0, preview: "Nguyễn Văn An (Tên)", raw: "Nguyễn Văn An" },
                { index: 1, preview: "Trưởng phòng Kinh Doanh (Chức vụ)", raw: "Trưởng phòng Kinh Doanh" },
                { index: 2, preview: "Chúc mừng sinh nhật (Lời chúc)", raw: "Chúc mừng sinh nhật" }
              ],
              message: "Mô phỏng: Đã nhận diện mẫu (3 dòng chữ: Tên, Chức vụ, Lời chúc)"
            });
          } else if (method === 'generateFromList') {
            var cnt = (args[0] && args[0].items) ? args[0].items.length : 3;
            callback(null, {
              success: true,
              count: cnt,
              message: "Mô phỏng: Đã tạo " + cnt + " mẫu theo danh sách!"
            });
          } else if (method === 'openFolder') {
            callback(null, {
              success: true,
              folder: 'D:/App/Dự án/In Ấn',
              message: 'Mô phỏng mở thư mục trên Windows Explorer.'
            });
          } else if (method === 'openExplorer') {
            callback(null, {
              success: true,
              message: 'Mô phỏng mở Windows Explorer.'
            });
          } else if (method === 'ping') {
            callback(null, { status: 'mock', message: 'Mô phỏng kết nối (chế độ browser)!' });
          } else {
            callback(null, { success: true, message: 'Hoàn tất mô phỏng ' + method });
          }
        }, 250);
        return;
      }

      var completed = false;
      // Xuất file hoặc dàn trang phức tạp có thể mất thời gian, đặt timeout 300 giây (5 phút)
      var timeout = global.setTimeout(function () {
        if (!completed) {
          completed = true;
          callback(new Error('Tác vụ trong Illustrator đang chạy lâu hơn bình thường. Hãy kiểm tra màn hình Illustrator xem có hộp thoại nào đang đợi xác nhận không.'));
        }
      }, 300000);

      function finish(err, data) {
        if (completed) return;
        completed = true;
        global.clearTimeout(timeout);
        callback(err, data);
      }

      try {
        var params = (args || []).map(function (arg) {
          return JSON.stringify(arg).replace(/[\u007f-\uffff]/g, function (c) {
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
          });
        }).join(',');

        var extSyncCmd = '';
        if (cep && typeof cep.getSystemPath === 'function') {
          try {
            var ep = cep.getSystemPath('extension');
            if (ep) {
              extSyncCmd = '$._PannelTC.setExtensionPath(' + JSON.stringify(ep.replace(/\\/g, '/')) + ');';
            }
          } catch (eEp) {}
        }

        var script = (extSyncCmd ? extSyncCmd + ' ' : '') + '$._PannelTC.' + method + '(' + params + ')';
        cep.evalScript(script, function (rawResult) {
          try {
            var parts = String(rawResult).split('|');
            if (parts[0] !== 'TC1') {
              throw new Error('Định dạng phản hồi không hợp lệ từ host: ' + rawResult);
            }
            if (parts[1] !== 'OK') {
              throw new Error(decodeURIComponent(parts[2] || 'Lỗi xử lý script trong Illustrator.'));
            }
            var data = JSON.parse(decodeURIComponent(parts[2]));
            finish(null, data);
          } catch (e) {
            finish(e);
          }
        });
      } catch (e) {
        finish(e);
      }
    }
  };
})(window);
