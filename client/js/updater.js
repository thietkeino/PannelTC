/**
 * Pannel TC - GitHub Auto-Updater
 * Tự động kiểm tra và cập nhật extension qua GitHub (Hỗ trợ cả Public & Private Repository)
 */
(function (global) {
  'use strict';

  var LOCAL_VERSION = '1.4.0';
  var DEFAULT_REPO = 'thietkeino/PannelTC';
  var DEFAULT_BRANCH = 'main';

  // Helper so sánh 2 chuỗi phiên bản semver (ví dụ 1.4.1 > 1.4.0)
  function compareVersions(v1, v2) {
    var p1 = String(v1).replace(/^v/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
    var p2 = String(v2).replace(/^v/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
    var len = Math.max(p1.length, p2.length);
    for (var i = 0; i < len; i++) {
      var num1 = p1[i] || 0;
      var num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  var TCUpdater = {
    version: LOCAL_VERSION,

    // Lấy tên GitHub repository (vd: "thietkeino/PannelTC")
    getRepo: function () {
      try {
        var saved = localStorage.getItem('pannel_tc_github_repo');
        if (saved && saved.trim().length > 0) return saved.trim();
      } catch (e) {}
      return DEFAULT_REPO;
    },

    setRepo: function (repo) {
      try {
        localStorage.setItem('pannel_tc_github_repo', (repo || '').trim());
      } catch (e) {}
    },

    // Lấy GitHub Personal Access Token (dành cho Private Repo)
    getToken: function () {
      try {
        var saved = localStorage.getItem('pannel_tc_github_token');
        if (saved && saved.trim().length > 0) return saved.trim();
      } catch (e) {}
      return '';
    },

    setToken: function (token) {
      try {
        localStorage.setItem('pannel_tc_github_token', (token || '').trim());
      } catch (e) {}
    },

    // Kiểm tra xem có bản cập nhật mới trên GitHub hay không
    check: function (callback) {
      callback = callback || function () {};
      var repo = this.getRepo();
      var token = this.getToken();

      if (!repo || repo.indexOf('/') === -1) {
        return callback(new Error('Chưa cấu hình GitHub Repository (định dạng: username/ten-repo).'));
      }

      var xhr = new XMLHttpRequest();
      var url = '';

      if (token) {
        // Nếu có Token (Private Repo): dùng GitHub API v3
        url = 'https://api.github.com/repos/' + repo + '/contents/version.json?ref=' + DEFAULT_BRANCH + '&_t=' + Date.now();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.setRequestHeader('Accept', 'application/vnd.github.v3.raw');
        xhr.setRequestHeader('User-Agent', 'PannelTC-Updater');
      } else {
        // Nếu không có Token (Public Repo): dùng raw.githubusercontent.com
        url = 'https://raw.githubusercontent.com/' + repo + '/' + DEFAULT_BRANCH + '/version.json?_t=' + Date.now();
        xhr.open('GET', url, true);
      }

      xhr.timeout = 10000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              var remoteVer = data.version || '1.0.0';
              var hasUpdate = compareVersions(remoteVer, LOCAL_VERSION) > 0;

              var downloadUrl = '';
              if (token) {
                // Tải archive từ API GitHub cho Private Repo
                downloadUrl = 'https://api.github.com/repos/' + repo + '/zipball/' + DEFAULT_BRANCH;
              } else {
                downloadUrl = data.downloadUrl || ('https://github.com/' + repo + '/archive/refs/heads/' + DEFAULT_BRANCH + '.zip');
              }

              callback(null, {
                hasUpdate: hasUpdate,
                currentVersion: LOCAL_VERSION,
                newVersion: remoteVer,
                changelog: data.changelog || 'Có bản cập nhật mới từ GitHub.',
                downloadUrl: downloadUrl
              });
            } catch (parseErr) {
              callback(new Error('Không đọc được file version.json trên GitHub.'));
            }
          } else if (xhr.status === 404) {
            callback(new Error('Không tìm thấy file version.json trên repo ' + repo + ' (nhánh ' + DEFAULT_BRANCH + '). Nếu repo đang để Private, vui lòng nhập GitHub Token.'));
          } else if (xhr.status === 401 || xhr.status === 403) {
            callback(new Error('Lỗi quyền truy cập GitHub (Repo đang để Private hoặc Token hết hạn). Hãy nhập Token hoặc đổi repo sang Public.'));
          } else {
            callback(new Error('Lỗi kết nối GitHub (HTTP ' + xhr.status + ').'));
          }
        }
      };
      xhr.ontimeout = function () {
        callback(new Error('Quá thời gian chờ phản hồi từ GitHub.'));
      };
      xhr.onerror = function () {
        callback(new Error('Không thể kết nối đến GitHub (hãy kiểm tra kết nối mạng).'));
      };
      xhr.send();
    },

    // Thực hiện tải và giải nén bản cập nhật ghi đè vào thư mục extension
    applyUpdate: function (downloadUrl, progressCb, completeCb) {
      progressCb = progressCb || function () {};
      completeCb = completeCb || function () {};

      progressCb('Đang chuẩn bị cập nhật…');

      // Kiểm tra môi trường Node.js trong CEP
      var childProcess = null;
      try {
        if (typeof require === 'function') {
          childProcess = require('child_process');
        } else if (window.cep && window.require) {
          childProcess = window.require('child_process');
        }
      } catch (eNode) {}

      // Lấy đường dẫn cài đặt của extension
      var extPath = '';
      if (window.cep && typeof window.cep.getSystemPath === 'function') {
        extPath = window.cep.getSystemPath('extension') || '';
      }

      // Nếu đang chạy trong browser hoặc không có Node.js
      if (!childProcess || !extPath) {
        setTimeout(function () {
          progressCb('Mô phỏng: Đang tải gói cập nhật…');
          setTimeout(function () {
            progressCb('Mô phỏng: Cập nhật thành công!');
            completeCb(null, { message: 'Đã cập nhật thành công (chế độ mô phỏng browser).' });
          }, 1500);
        }, 800);
        return;
      }

      progressCb('Đang tải và cài đặt bản cập nhật từ GitHub…');

      var cleanExtPath = extPath.replace(/\//g, '\\').replace(/\\+$/, '');
      var zipUrl = downloadUrl;
      var token = this.getToken();

      // Script PowerShell tải zip, giải nén và copy đè tệp
      var psScript = [
        '$ErrorActionPreference = "Stop"',
        '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
        '$zipPath = Join-Path $env:TEMP "pannel_tc_update.zip"',
        '$extractPath = Join-Path $env:TEMP "pannel_tc_extracted"',
        '$targetPath = "' + cleanExtPath + '"',
        'if (Test-Path $extractPath) { Remove-Item -Path $extractPath -Recurse -Force }',
        '$client = New-Object Net.WebClient',
        '$client.Headers.Add("User-Agent", "PannelTC-Updater")',
        (token ? '$client.Headers.Add("Authorization", "Bearer ' + token + '")' : ''),
        '$client.DownloadFile("' + zipUrl + '", $zipPath)',
        'Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force',
        '$sub = Get-ChildItem -Path $extractPath | Where-Object { $_.PSIsContainer } | Select-Object -First 1',
        'if ($sub) {',
        '    Copy-Item -Path (Join-Path $sub.FullName "*") -Destination $targetPath -Recurse -Force',
        '} else {',
        '    Copy-Item -Path (Join-Path $extractPath "*") -Destination $targetPath -Recurse -Force',
        '}',
        'Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue',
        'Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue'
      ].filter(function (s) { return s.length > 0; }).join('; ');

      var cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "' + psScript.replace(/"/g, '\\"') + '"';

      childProcess.exec(cmd, { windowsHide: true }, function (err, stdout, stderr) {
        if (err) {
          return completeCb(new Error('Lỗi cập nhật: ' + (stderr || err.message)));
        }
        progressCb('Cập nhật hoàn tất! Đang khởi động lại panel…');
        setTimeout(function () {
          completeCb(null, { message: 'Cập nhật thành công!' });
          try {
            window.location.reload(true);
          } catch (eReload) {
            window.location.reload();
          }
        }, 1200);
      });
    }
  };

  global.TCUpdater = TCUpdater;
})(window);
