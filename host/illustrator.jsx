/* Adobe Illustrator ExtendScript (ES3) for Pannel TC */
$._PannelTC = $._PannelTC || {};

(function (P) {
    'use strict';

    var MM_TO_PT = 72 / 25.4;
    var PT_TO_MM = 25.4 / 72;
    var DIM_LAYER_NAME = "__BG_AUTO_DIMENSIONS__";
    var DIM_TAG = "AUTO_DIMENSION_GROUPS_V2";

    // Danh mục các file template mẫu chuẩn bị sẵn
    var TEMPLATES = {
        'xuong_gom': {
            id: 'xuong_gom',
            label: 'Xưởng Gốm Việt Bát Tràng (1 mặt)',
            fileName: 'Xuong gom viet bat trang 1 mat.ait'
        },
        'bat_trang_vn': {
            id: 'bat_trang_vn',
            label: 'Bát Tràng Việt Nam (1 mặt)',
            fileName: 'bat trang viet nam 1 mat.ait'
        },
        'day_ko_in': {
            id: 'day_ko_in',
            label: 'Đáy Không In (1 mặt)',
            fileName: 'day ko in 1 mat.ait'
        }
    };

    // JSON serializer cho ExtendScript ES3
    P._json = function (value) {
        if (value === null || typeof value === 'undefined') { return 'null'; }
        if (typeof value === 'string') {
            return '"' + value.replace(/[\\"\u0000-\u001f]/g, function (c) {
                if (c === '"' || c === '\\') { return '\\' + c; }
                return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
            }) + '"';
        }
        if (typeof value === 'number') { return isFinite(value) ? String(value) : 'null'; }
        if (typeof value === 'boolean') { return value ? 'true' : 'false'; }
        var parts = [], i;
        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) { parts.push(P._json(value[i])); }
            return '[' + parts.join(',') + ']';
        }
        for (i in value) {
            if (value.hasOwnProperty(i)) { parts.push(P._json(i) + ':' + P._json(value[i])); }
        }
        return '{' + parts.join(',') + '}';
    };

    P._reply = function (data) {
        return 'TC1|OK|' + encodeURIComponent(P._json(data));
    };

    P._error = function (error) {
        return 'TC1|ERROR|' + encodeURIComponent(String(error.message || error));
    };

    // Lưu lại thông tin script ngay tại thời điểm được load vào Illustrator
    var _LOADED_SCRIPT_FILE = null;
    try {
        if ($.fileName) {
            _LOADED_SCRIPT_FILE = new File($.fileName);
        }
    } catch (eInit) {}

    // Lưu trữ đường dẫn thư mục gốc extension do CEP client gửi sang
    P._extensionPath = "";
    P.setExtensionPath = function (path) {
        if (path) {
            P._extensionPath = String(path).replace(/\\/g, '/').replace(/\/+$/, '');
        }
        return P._reply({ success: true, path: P._extensionPath });
    };

    // Tìm file tự động và thông minh (Hoạt động trên 100% các máy tính khác nhau)
    function _resolveFile(relativePath) {
        if (!relativePath) return null;
        var baseName = relativePath.replace(/^.*[\\\/]/, '');
        var candidates = [];
        var baseDirs = [];

        // 1. Thư mục do CEP Client gửi sang (chuẩn xác nhất theo Adobe CEP)
        if (P._extensionPath) {
            baseDirs.push(P._extensionPath);
        }

        // 2. Thư mục script ghi nhận lúc load ban đầu
        if (_LOADED_SCRIPT_FILE && _LOADED_SCRIPT_FILE.exists) {
            try {
                baseDirs.push(_LOADED_SCRIPT_FILE.parent.parent.fsName); // PannelTC
                baseDirs.push(_LOADED_SCRIPT_FILE.parent.fsName);        // PannelTC/host
            } catch (e1) {}
        }

        // 3. $.fileName tại runtime nếu có
        try {
            if ($.fileName) {
                var curF = new File($.fileName);
                if (curF.exists) {
                    baseDirs.push(curF.parent.parent.fsName);
                    baseDirs.push(curF.parent.fsName);
                }
            }
        } catch (e2) {}

        // 4. Các thư mục chuẩn của Adobe CEP trên Windows / Mac
        try {
            if (Folder.userData && Folder.userData.exists) {
                baseDirs.push(Folder.userData.fsName + "/Adobe/CEP/extensions/com.tc.illustrator.pannel");
                baseDirs.push(Folder.userData.fsName + "/Adobe/CEP/extensions/PannelTC");
            }
        } catch (e3) {}

        try {
            if (Folder.commonFiles && Folder.commonFiles.exists) {
                baseDirs.push(Folder.commonFiles.fsName + "/Adobe/CEP/extensions/com.tc.illustrator.pannel");
                baseDirs.push(Folder.commonFiles.fsName + "/Adobe/CEP/extensions/PannelTC");
            }
        } catch (e4) {}

        // 5. Đường dẫn dự phòng cho môi trường dev
        baseDirs.push("D:/App/AntiGravity Project/Photoshop Plugin/Illustrator/PannelTC");
        baseDirs.push("D:/App/AntiGravity Project/Photoshop Plugin/Illustrator");

        // 6. Xây dựng danh sách ứng viên
        for (var b = 0; b < baseDirs.length; b++) {
            var bDir = String(baseDirs[b]).replace(/\\/g, '/').replace(/\/+$/, '');
            if (!bDir) continue;

            // Trong templates/
            candidates.push(bDir + "/templates/" + baseName);
            // Trong host/
            candidates.push(bDir + "/host/" + baseName);
            // Trực tiếp đường dẫn tương đối
            candidates.push(bDir + "/" + relativePath);
            candidates.push(bDir + "/host/" + relativePath);
            candidates.push(bDir + "/templates/" + relativePath);
            // Thư mục cha
            candidates.push(bDir + "/../" + relativePath);
            candidates.push(bDir + "/../" + baseName);
            // Trực tiếp tên file
            candidates.push(bDir + "/" + baseName);
        }

        // 7. Kiểm tra tệp tồn tại
        for (var i = 0; i < candidates.length; i++) {
            try {
                var f = new File(candidates[i]);
                if (f.exists) {
                    return f;
                }
            } catch (eFile) {}
        }
        return null;
    }

    // -------------------------------------------------------------
    // 1. Quản lý trạng thái Illustrator & Document
    // -------------------------------------------------------------
    P.getState = function () {
        try {
            var hasDoc = app.documents.length > 0;
            var docInfo = null;

            if (hasDoc) {
                var doc = app.activeDocument;
                var selCount = doc.selection ? doc.selection.length : 0;
                var filePath = '';
                var folderPath = '';
                var isSaved = false;
                try {
                    filePath = doc.fullName ? doc.fullName.fsName : 'Chưa lưu';
                    folderPath = doc.path ? doc.path.fsName : '';
                    isSaved = !!doc.saved;
                } catch (e) {
                    filePath = 'Chưa lưu';
                    folderPath = '';
                    isSaved = false;
                }

                docInfo = {
                    name: doc.name,
                    path: filePath,
                    folder: folderPath,
                    saved: isSaved,
                    artboards: doc.artboards.length,
                    activeArtboardIndex: doc.artboards.getActiveArtboardIndex(),
                    selectionCount: selCount,
                    widthPt: Math.round(doc.width),
                    heightPt: Math.round(doc.height)
                };
            }

            return P._reply({
                appName: 'Adobe Illustrator',
                appVersion: String(app.version),
                documentCount: app.documents.length,
                activeDocument: docInfo
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 2. Mở Template Tạo file in
    // -------------------------------------------------------------
    P.openTemplate = function (templateId) {
        try {
            var t = TEMPLATES[templateId];
            if (!t) {
                throw new Error('Mã template không hợp lệ: ' + templateId);
            }

            var file = _resolveFile(t.fileName);
            if (!file || !file.exists) {
                throw new Error('Không tìm thấy file mẫu: ' + t.fileName + ' trong thư mục Illustrator.');
            }

            var newDoc = app.open(file);

            return P._reply({
                success: true,
                templateId: t.id,
                templateLabel: t.label,
                docName: newDoc.name,
                artboards: newDoc.artboards.length,
                message: 'Đã tạo file in từ: ' + t.label
            });
        } catch (err) {
            return P._error(err);
        }
    };

    P.browseAndOpenTemplate = function () {
        try {
            var file = File.openDialog("Chọn file template Illustrator (*.ait, *.ai)", "Illustrator Template:*.ait;*.ai");
            if (!file) {
                return P._reply({ cancelled: true });
            }

            var newDoc = app.open(file);
            return P._reply({
                success: true,
                docName: newDoc.name,
                artboards: newDoc.artboards.length,
                message: 'Đã tạo file in từ mẫu: ' + file.name
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 3. Tự động ghi kích thước Group (Auto Dimension Groups)
    // -------------------------------------------------------------
    P.autoDimension = function (rawOpts) {
        try {
            if (app.documents.length === 0) {
                throw new Error("Hãy mở tài liệu Illustrator trước khi ghi kích thước.");
            }

            var doc = app.activeDocument;
            var rawSelection = doc.selection;
            if (!rawSelection || rawSelection.length === 0) {
                throw new Error("Hãy chọn ít nhất một Group hoặc đối tượng cần đo.");
            }

            var source = [];
            for (var s = 0; s < rawSelection.length; s++) {
                source.push(rawSelection[s]);
            }

            rawOpts = rawOpts || {};
            var options = {
                direct: (typeof rawOpts.direct !== 'undefined') ? !!rawOpts.direct : true,
                nested: !!rawOpts.nested,
                parent: !!rawOpts.parent,
                unit: rawOpts.unit || "mm",
                decimals: (typeof rawOpts.decimals === 'number') ? rawOpts.decimals : 1,
                ratio: (rawOpts.ratio > 0) ? rawOpts.ratio : 1,
                offset: (rawOpts.offset > 0 ? rawOpts.offset : 6) * MM_TO_PT,
                fontSize: (rawOpts.fontSize >= 3 && rawOpts.fontSize <= 72) ? rawOpts.fontSize : 9,
                strokeWidth: (rawOpts.strokeWidth > 0 && rawOpts.strokeWidth <= 10) ? rawOpts.strokeWidth : 0.6,
                hSide: (rawOpts.hSide === -1 || rawOpts.hSide === "bottom") ? -1 : 1,
                vSide: (rawOpts.vSide === -1 || rawOpts.vSide === "left") ? -1 : 1,
                color: (typeof rawOpts.color === 'number') ? rawOpts.color : 0,
                withStroke: !!rawOpts.withStroke,
                replace: (typeof rawOpts.replace !== 'undefined') ? !!rawOpts.replace : true
            };

            var targets = [];
            var seen = {};

            function idFor(item) {
                try {
                    if (item.uuid) return "id-" + item.uuid;
                } catch (e) {}
                return null;
            }

            function alreadyAdded(item) {
                var id = idFor(item);
                if (id !== null) {
                    if (seen[id]) return true;
                    seen[id] = true;
                    return false;
                }
                for (var i = 0; i < targets.length; i++) {
                    if (targets[i].item === item) return true;
                }
                return false;
            }

            function inDimensionLayer(item) {
                try { return item.layer && item.layer.name === DIM_LAYER_NAME; }
                catch (e) { return false; }
            }

            function shouldSkip(item) {
                try {
                    if (inDimensionLayer(item)) return true;
                    if (item.hidden || item.locked) return true;
                    if (item.editable === false) return true;
                    return false;
                } catch (e) { return true; }
            }

            function getClippingBounds(group, type) {
                if (!group.clipped) return null;
                var j, p, c;
                for (j = 0; j < group.pathItems.length; j++) {
                    p = group.pathItems[j];
                    try { if (p.clipping) return p[type]; } catch (e) {}
                }
                for (j = 0; j < group.compoundPathItems.length; j++) {
                    c = group.compoundPathItems[j];
                    try {
                        for (var k = 0; k < c.pathItems.length; k++) {
                            if (c.pathItems[k].clipping) return c[type];
                        }
                    } catch (e) {}
                }
                return null;
            }

            function boundsOf(item) {
                var type = options.withStroke ? "visibleBounds" : "geometricBounds";
                var b = (item.typename === "GroupItem") ? getClippingBounds(item, type) : null;
                if (!b) b = item[type];
                return {
                    left: Math.min(b[0], b[2]),
                    right: Math.max(b[0], b[2]),
                    top: Math.max(b[1], b[3]),
                    bottom: Math.min(b[1], b[3])
                };
            }

            function addTarget(item, depth) {
                if (shouldSkip(item) || alreadyAdded(item)) return;
                try {
                    var b = boundsOf(item);
                    if (!isFinite(b.left) || !isFinite(b.right) ||
                        !isFinite(b.top) || !isFinite(b.bottom)) return;
                    if (b.right - b.left < 0.01 || b.top - b.bottom < 0.01) return;
                    targets.push({ item: item, bounds: b, depth: depth });
                } catch (e) {}
            }

            function visitChildren(parent, level) {
                if (!parent || parent.typename !== "GroupItem") return;
                for (var c = 0; c < parent.groupItems.length; c++) {
                    var child = parent.groupItems[c];
                    if (shouldSkip(child)) continue;
                    addTarget(child, level);
                    if (options.nested) visitChildren(child, level + 1);
                }
            }

            for (var i = 0; i < source.length; i++) {
                var item = source[i];
                if (shouldSkip(item)) continue;
                if (item.typename === "GroupItem") {
                    if (options.direct || options.nested) visitChildren(item, 1);
                    if (options.parent || (!options.direct && !options.nested) || item.groupItems.length === 0) {
                        addTarget(item, 0);
                    }
                } else {
                    addTarget(item, 0);
                }
            }

            if (targets.length === 0) {
                throw new Error("Không tìm thấy Group/đối tượng hợp lệ để vẽ kích thước. Hãy chọn Group hoặc bật 'Đo cả Group cha'.");
            }

            targets.sort(function (a, b) {
                var areaA = (a.bounds.right - a.bounds.left) * (a.bounds.top - a.bounds.bottom);
                var areaB = (b.bounds.right - b.bounds.left) * (b.bounds.top - b.bounds.bottom);
                return areaA - areaB;
            });

            var dimensionLayer = null;
            try { dimensionLayer = doc.layers.getByName(DIM_LAYER_NAME); } catch (e) {}
            var madeLayer = false;
            if (!dimensionLayer) {
                dimensionLayer = doc.layers.add();
                dimensionLayer.name = DIM_LAYER_NAME;
                madeLayer = true;
            }
            var initialLock = dimensionLayer.locked;
            dimensionLayer.locked = false;
            dimensionLayer.visible = true;

            if (options.replace) {
                for (i = dimensionLayer.groupItems.length - 1; i >= 0; i--) {
                    var oldGroup = dimensionLayer.groupItems[i];
                    try {
                        if (oldGroup.note === DIM_TAG) oldGroup.remove();
                    } catch (e) {}
                }
            }

            function makeColor(index) {
                var isCmyk = false;
                try { isCmyk = (doc.documentColorSpace === DocumentColorSpace.CMYK); } catch (e) {}
                var c;
                if (isCmyk) {
                    c = new CMYKColor();
                    if (index === 1) { c.cyan=0; c.magenta=0; c.yellow=0; c.black=95; }
                    else if (index === 2) { c.cyan=0; c.magenta=95; c.yellow=85; c.black=5; }
                    else { c.cyan=90; c.magenta=45; c.yellow=5; c.black=15; }
                } else {
                    c = new RGBColor();
                    if (index === 1) { c.red=20; c.green=20; c.blue=20; }
                    else if (index === 2) { c.red=205; c.green=43; c.blue=45; }
                    else { c.red=20; c.green=95; c.blue=155; }
                }
                return c;
            }

            var ink = makeColor(options.color);
            var arrowLen = Math.max(3.2, options.fontSize * 0.62);
            var arrowHalf = Math.max(1.2, arrowLen * 0.27);
            var gap = Math.max(1.5, options.fontSize * 0.30);
            var beyond = Math.max(2.2, options.fontSize * 0.33);
            var collisionStep = Math.max(options.fontSize * 2.2, 6 * MM_TO_PT);
            var hTracks = [], vTracks = [];

            function path(group, points, isFilled) {
                var o = group.pathItems.add();
                o.setEntirePath(points);
                o.closed = !!isFilled;
                o.filled = !!isFilled;
                o.stroked = !isFilled;
                if (isFilled) {
                    o.fillColor = ink;
                } else {
                    o.strokeColor = ink;
                    o.strokeWidth = options.strokeWidth;
                }
                return o;
            }

            function line(group, x1, y1, x2, y2) {
                return path(group, [[x1, y1], [x2, y2]], false);
            }

            function arrow(group, tipX, tipY, dirX, dirY) {
                var bx = tipX - dirX * arrowLen;
                var by = tipY - dirY * arrowLen;
                var px = -dirY * arrowHalf;
                var py = dirX * arrowHalf;
                return path(group, [[tipX, tipY], [bx + px, by + py], [bx - px, by - py]], true);
            }

            function label(ptValue) {
                var result = Math.abs(ptValue) * PT_TO_MM * options.ratio;
                if (options.unit === "cm") result /= 10;
                return result.toFixed(options.decimals) + " " + options.unit;
            }

            function textCentered(group, contents, targetX, targetY, rotation) {
                var tf = group.textFrames.add();
                tf.contents = contents;
                tf.position = [0, 0];
                tf.textRange.characterAttributes.size = options.fontSize;
                tf.textRange.characterAttributes.fillColor = ink;
                if (rotation) tf.rotate(rotation);
                var rect = tf.visibleBounds;
                var cx = (rect[0] + rect[2]) / 2;
                var cy = (rect[1] + rect[3]) / 2;
                tf.translate(targetX - cx, targetY - cy);
                return tf;
            }

            function textLength(tf, horizontal) {
                var b = tf.visibleBounds;
                return horizontal ? Math.abs(b[2] - b[0]) : Math.abs(b[1] - b[3]);
            }

            function intervalsOverlap(a, b, c, d, padding) {
                return a <= d + padding && c <= b + padding;
            }

            function chooseHorizontalY(left, right, top, bottom) {
                var side = options.hSide;
                var base = side > 0 ? top : bottom;
                var dist = options.offset;
                for (var iter = 0; iter < 300; iter++) {
                    var y = base + side * dist;
                    var collision = false;
                    for (var t = 0; t < hTracks.length; t++) {
                        var tr = hTracks[t];
                        if (intervalsOverlap(left, right, tr.start, tr.end, options.fontSize * 0.75) &&
                            Math.abs(y - tr.coord) < options.fontSize * 1.9) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) {
                        hTracks.push({ start: left, end: right, coord: y });
                        return y;
                    }
                    dist += collisionStep;
                }
                return base + side * dist;
            }

            function chooseVerticalX(top, bottom, left, right) {
                var side = options.vSide;
                var base = side > 0 ? right : left;
                var dist = options.offset;
                for (var iter = 0; iter < 300; iter++) {
                    var x = base + side * dist;
                    var collision = false;
                    for (var t = 0; t < vTracks.length; t++) {
                        var tr = vTracks[t];
                        if (intervalsOverlap(bottom, top, tr.start, tr.end, options.fontSize * 0.75) &&
                            Math.abs(x - tr.coord) < options.fontSize * 1.9) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) {
                        vTracks.push({ start: bottom, end: top, coord: x });
                        return x;
                    }
                    dist += collisionStep;
                }
                return base + side * dist;
            }

            function drawHorizontal(group, b) {
                var x1 = b.left, x2 = b.right, mid = (x1 + x2) / 2;
                var y = chooseHorizontalY(x1, x2, b.top, b.bottom);
                var edge = options.hSide > 0 ? b.top : b.bottom;
                var sy = edge + options.hSide * Math.min(2 * MM_TO_PT, options.offset * 0.33);
                var ey = y + options.hSide * beyond;
                line(group, x1, sy, x1, ey);
                line(group, x2, sy, x2, ey);

                var t = textCentered(group, label(x2 - x1), mid, y, 0);
                var labelW = textLength(t, true);
                var minSpace = labelW + (2 * arrowLen) + 10;
                if ((x2 - x1) > minSpace) {
                    var halfGap = labelW / 2 + gap;
                    line(group, x1, y, mid - halfGap, y);
                    line(group, mid + halfGap, y, x2, y);
                    arrow(group, x1, y, -1, 0);
                    arrow(group, x2, y, 1, 0);
                } else {
                    t.translate(0, options.hSide * (options.fontSize + gap));
                    var extra = arrowLen + 2;
                    line(group, x1 - extra, y, x2 + extra, y);
                    arrow(group, x1, y, 1, 0);
                    arrow(group, x2, y, -1, 0);
                }
            }

            function drawVertical(group, b) {
                var top = b.top, bottom = b.bottom, mid = (top + bottom) / 2;
                var x = chooseVerticalX(top, bottom, b.left, b.right);
                var edge = options.vSide > 0 ? b.right : b.left;
                var sx = edge + options.vSide * Math.min(2 * MM_TO_PT, options.offset * 0.33);
                var ex = x + options.vSide * beyond;
                line(group, sx, top, ex, top);
                line(group, sx, bottom, ex, bottom);

                var t = textCentered(group, label(top - bottom), x, mid, 90);
                var labelH = textLength(t, false);
                var minSpace = labelH + (2 * arrowLen) + 10;
                if ((top - bottom) > minSpace) {
                    var halfGap = labelH / 2 + gap;
                    line(group, x, bottom, x, mid - halfGap);
                    line(group, x, mid + halfGap, x, top);
                    arrow(group, x, bottom, 0, -1);
                    arrow(group, x, top, 0, 1);
                } else {
                    t.translate(options.vSide * (options.fontSize + gap), 0);
                    var extra = arrowLen + 2;
                    line(group, x, bottom - extra, x, top + extra);
                    arrow(group, x, bottom, 0, 1);
                    arrow(group, x, top, 0, -1);
                }
            }

            var successes = 0, fails = 0;
            var firstError = "";
            for (i = 0; i < targets.length; i++) {
                var obj = targets[i];
                var container = null;
                try {
                    container = dimensionLayer.groupItems.add();
                    container.note = DIM_TAG;
                    var originalName = "";
                    try { originalName = obj.item.name; } catch (ignore) {}
                    container.name = "DIM " + (originalName || obj.item.typename) + " [" + (i + 1) + "]";
                    drawHorizontal(container, obj.bounds);
                    drawVertical(container, obj.bounds);
                    successes++;
                } catch (e) {
                    fails++;
                    if (!firstError) firstError = String(e);
                    try { if (container) container.remove(); } catch (e2) {}
                }
            }

            try {
                doc.selection = null;
                for (i = 0; i < source.length; i++) {
                    try { if (!inDimensionLayer(source[i])) source[i].selected = true; } catch (e) {}
                }
            } catch (e) {}
            if (!madeLayer && initialLock) dimensionLayer.locked = true;
            try { app.redraw(); } catch (e) {}

            return P._reply({
                success: true,
                count: successes,
                fails: fails,
                message: "Đã vẽ kích thước cho " + successes + " đối tượng (" + options.unit + ")." + (fails ? " (Lỗi " + fails + " đối tượng)" : "")
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // Xóa layer kích thước tự động
    P.clearDimensions = function () {
        try {
            if (app.documents.length === 0) {
                throw new Error("Không có tài liệu nào đang mở.");
            }
            var doc = app.activeDocument;
            var layer = null;
            try { layer = doc.layers.getByName(DIM_LAYER_NAME); } catch (e) {}
            if (!layer) {
                return P._reply({ count: 0, message: "Không tìm thấy layer kích thước " + DIM_LAYER_NAME });
            }

            var count = 0;
            for (var i = layer.groupItems.length - 1; i >= 0; i--) {
                var g = layer.groupItems[i];
                try {
                    if (g.note === DIM_TAG) {
                        g.remove();
                        count++;
                    }
                } catch (e) {}
            }
            try { app.redraw(); } catch (e) {}

            return P._reply({
                success: true,
                count: count,
                message: "Đã xóa " + count + " nhóm kích thước trên layer " + DIM_LAYER_NAME
            });
        } catch (err) {
            return P._error(err);
        }
    };

    P.runAutoDimensionDialog = function () {
        try {
            var f = _resolveFile("AutoDimensionGroups_Illustrator2024.jsx");
            if (f && f.exists) {
                $.evalFile(f);
                return P._reply({ success: true, message: "Đã mở hộp thoại Ghi kích thước gốc." });
            }
            throw new Error("Không tìm thấy file AutoDimensionGroups_Illustrator2024.jsx.");
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 4. Dàn trang DTF A3 (DTF Auto Nesting)
    // -------------------------------------------------------------
    P.runDTFAutoNest = function () {
        try {
            var dtfFile = _resolveFile("DTF/DTF_AutoNest_A3 copy.jsx") || _resolveFile("DTF/DTF_AutoNest_A3.jsx");
            if (!dtfFile || !dtfFile.exists) {
                throw new Error("Không tìm thấy script DTF_AutoNest_A3 copy.jsx trong thư mục DTF.");
            }

            // Khởi chạy script Dàn trang DTF
            $.evalFile(dtfFile);

            return P._reply({
                success: true,
                message: "Đã khởi chạy công cụ Dàn trang DTF A3."
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 5. Xuất bản file in (Export Artboard sang PNG & PDF)
    // -------------------------------------------------------------
    P.exportArtboards = function (scope) {
        try {
            if (app.documents.length === 0) {
                throw new Error("Vui lòng mở một file Illustrator trước khi export!");
            }
            var doc = app.activeDocument;
            if (!doc.saved || !doc.path || doc.path == "") {
                throw new Error("Vui lòng lưu file Illustrator trước khi xuất bản!");
            }

            var originalFile = doc.fullName;
            var docPath = doc.path;
            var docName = doc.name.replace(/\.[^\.]+$/, '');
            docName = docName.replace(/[-_]{2,}/g, '-');
            docName = docName.replace(/\s{2,}/g, ' ');
            docName = docName.replace(/\s*-\s*/g, '-');

            var totalArtboards = doc.artboards.length;
            var artboardsToExport = [];

            if (scope === 'current') {
                artboardsToExport.push(doc.artboards.getActiveArtboardIndex());
            } else {
                for (var i = 0; i < totalArtboards; i++) {
                    artboardsToExport.push(i);
                }
            }

            var successCount = 0;
            var failCount = 0;
            var exportedFiles = [];

            for (var abIdx = 0; abIdx < artboardsToExport.length; abIdx++) {
                var artboardIndex = artboardsToExport[abIdx];
                try {
                    doc.artboards.setActiveArtboardIndex(artboardIndex);
                    var artboard = doc.artboards[artboardIndex];
                    var artNumber = String(artboardIndex + 1);
                    if (artNumber.length == 1) artNumber = "0" + artNumber;
                    var exportName = docName + "-art" + artNumber;

                    // Outline text trong artboard
                    var artboardRect = artboard.artboardRect;
                    for (var ti = doc.textFrames.length - 1; ti >= 0; ti--) {
                        try {
                            var tf = doc.textFrames[ti];
                            var tb = tf.geometricBounds;
                            if (tb[0] < artboardRect[2] && tb[2] > artboardRect[0] &&
                                tb[1] > artboardRect[3] && tb[3] < artboardRect[1]) {
                                tf.createOutline();
                            }
                        } catch(e) {}
                    }

                    // Unite objects cùng màu
                    try {
                        doc.selectObjectsOnActiveArtboard();
                        if (doc.selection.length >= 2) {
                            var colorGroups = {};
                            for (var si = 0; si < doc.selection.length; si++) {
                                var item = doc.selection[si];
                                if (item.typename == "PathItem" && item.filled) {
                                    var fc = item.fillColor;
                                    var ck = "";
                                    if (fc.typename == "RGBColor") {
                                        ck = "RGB_" + Math.round(fc.red) + "_" + Math.round(fc.green) + "_" + Math.round(fc.blue);
                                    } else if (fc.typename == "CMYKColor") {
                                        ck = "CMYK_" + Math.round(fc.cyan) + "_" + Math.round(fc.magenta) + "_" + Math.round(fc.yellow) + "_" + Math.round(fc.black);
                                    } else if (fc.typename == "GrayColor") {
                                        ck = "GRAY_" + Math.round(fc.gray);
                                    }
                                    if (ck) {
                                        if (!colorGroups[ck]) colorGroups[ck] = [];
                                        colorGroups[ck].push(item);
                                    }
                                }
                            }
                            for (var k in colorGroups) {
                                var grpItems = colorGroups[k];
                                if (grpItems.length >= 3) {
                                    doc.selection = null;
                                    for (var gi = 0; gi < grpItems.length; gi++) grpItems[gi].selected = true;
                                    app.executeMenuCommand("Live Pathfinder Add");
                                    app.executeMenuCommand("expandStyle");
                                }
                            }
                            doc.selection = null;
                        }
                    } catch(e) {}

                    // 1. Export PNG (RGB - 300 DPI)
                    var pngFile = new File(docPath + "/" + exportName + ".png");
                    var pngOptions = new ExportOptionsPNG24();
                    pngOptions.artBoardClipping = true;
                    pngOptions.transparency = false;
                    pngOptions.antiAliasing = true;
                    pngOptions.horizontalScale = 300;
                    pngOptions.verticalScale = 300;
                    doc.documentColorSpace = DocumentColorSpace.RGB;
                    doc.exportFile(pngFile, ExportType.PNG24, pngOptions);

                    // 2. Export PDF (CMYK - 300 DPI)
                    doc.documentColorSpace = DocumentColorSpace.CMYK;
                    var pdfFile = new File(docPath + "/" + exportName + ".pdf");
                    var pdfOptions = new PDFSaveOptions();
                    pdfOptions.compatibility = PDFCompatibility.ACROBAT5;
                    pdfOptions.preserveEditability = false;
                    pdfOptions.generateThumbnails = false;
                    pdfOptions.colorDownsampling = 300;
                    pdfOptions.colorDownsamplingMethod = DownsampleMethod.BICUBICDOWNSAMPLE;
                    pdfOptions.colorDownsamplingImageThreshold = 450;
                    pdfOptions.grayscaleDownsampling = 300;
                    pdfOptions.grayscaleDownsamplingMethod = DownsampleMethod.BICUBICDOWNSAMPLE;
                    pdfOptions.grayscaleDownsamplingImageThreshold = 450;
                    pdfOptions.artboardRange = String(artboardIndex + 1);
                    pdfOptions.fontSubsetThreshold = 100;
                    doc.saveAs(pdfFile, pdfOptions);

                    successCount++;
                    var pngSize = (pngFile.length / 1024 / 1024).toFixed(2);
                    var pdfSize = (pdfFile.length / 1024 / 1024).toFixed(2);
                    exportedFiles.push({
                        name: exportName,
                        pngSize: pngSize,
                        pdfSize: pdfSize
                    });
                } catch(e) {
                    failCount++;
                }
            }

            // Đóng document đã biến đổi và mở lại file gốc nguyên vẹn
            try {
                doc.close(SaveOptions.DONOTSAVECHANGES);
                app.open(originalFile);
            } catch(e) {}

            return P._reply({
                success: true,
                successCount: successCount,
                failCount: failCount,
                folder: docPath.fsName,
                files: exportedFiles,
                message: "Xuất bản thành công: " + successCount + " Artboard (PNG + PDF 300 DPI)."
            });
        } catch (err) {
            return P._error(err);
        }
    };

    P.runExportArtboardScript = function () {
        try {
            var expFile = _resolveFile("ExportArtboard.jsx");
            if (!expFile || !expFile.exists) {
                throw new Error("Không tìm thấy script ExportArtboard.jsx.");
            }
            $.evalFile(expFile);
            return P._reply({
                success: true,
                message: "Đã chạy script ExportArtboard.jsx."
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 5. Đổi chữ theo danh sách (Data Merge / Variable List)
    // -------------------------------------------------------------
    function _collectTextFrames(container) {
        var result = [];
        if (!container) return result;
        if (container.typename === "TextFrame") {
            result.push(container);
            return result;
        }
        if (container.typename === "GroupItem") {
            for (var i = 0; i < container.pageItems.length; i++) {
                var it = container.pageItems[i];
                if (it.typename === "TextFrame") {
                    result.push(it);
                } else if (it.typename === "GroupItem") {
                    result = result.concat(_collectTextFrames(it));
                }
            }
        }
        return result;
    }

    P.getVariableSelectionInfo = function () {
        try {
            if (app.documents.length === 0) {
                return P._reply({ hasDoc: false, message: "Chưa mở tài liệu nào." });
            }
            var doc = app.activeDocument;
            var sel = doc.selection;
            if (!sel || sel.length === 0) {
                return P._reply({
                    hasDoc: true,
                    hasSelection: false,
                    message: "Chưa chọn mẫu thiết kế nào trên Artboard."
                });
            }

            var textFrames = [];
            if (sel.length === 1) {
                textFrames = _collectTextFrames(sel[0]);
            } else {
                for (var s = 0; s < sel.length; s++) {
                    textFrames = textFrames.concat(_collectTextFrames(sel[s]));
                }
            }

            // Sắp xếp textframes từ trên xuống dưới, rồi trái qua phải
            textFrames.sort(function (a, b) {
                var dy = Math.abs(b.top - a.top);
                if (dy > 4) return b.top - a.top;
                return a.left - b.left;
            });

            var fields = [];
            for (var t = 0; t < textFrames.length; t++) {
                var raw = textFrames[t].contents || "";
                var clean = raw.replace(/[\r\n\t]+/g, " ").replace(/^\s+|\s+$/g, "");
                if (clean.length > 35) clean = clean.substring(0, 35) + "...";
                if (!clean) clean = "(Dòng chữ trống)";
                fields.push({
                    index: t,
                    preview: clean,
                    raw: raw
                });
            }

            var typeName = (sel.length === 1) ? sel[0].typename : (sel.length + " đối tượng");
            var summary = "Đã nhận diện: " + typeName + " (" + fields.length + " dòng chữ)";

            return P._reply({
                hasDoc: true,
                hasSelection: true,
                textCount: fields.length,
                selectionCount: sel.length,
                fields: fields,
                message: summary
            });
        } catch (err) {
            return P._error(err);
        }
    };

    P.generateFromList = function (opts) {
        try {
            if (app.documents.length === 0) {
                throw new Error("Vui lòng mở một tài liệu Illustrator trước!");
            }
            var doc = app.activeDocument;
            var sel = doc.selection;
            if (!sel || sel.length === 0) {
                throw new Error("Vui lòng quét chọn mẫu thiết kế (Logo + Chữ) trên Artboard trước khi bấm tạo!");
            }

            opts = opts || {};
            var items = opts.items || [];
            if (!items || items.length === 0) {
                throw new Error("Danh sách dữ liệu đang trống. Vui lòng nhập hoặc paste ít nhất 1 dòng văn bản!");
            }

            // Gom các đối tượng đang chọn thành 1 Group nếu người dùng chọn nhiều đối tượng rời
            var masterItem = null;
            if (sel.length === 1) {
                masterItem = sel[0];
            } else {
                masterItem = doc.groupItems.add();
                masterItem.name = "Master_Template";
                for (var si = sel.length - 1; si >= 0; si--) {
                    sel[si].moveToBeginning(masterItem);
                }
            }

            // Kiểm tra các trường TextFrame trong mẫu
            var masterTfs = _collectTextFrames(masterItem);
            if (masterTfs.length === 0) {
                throw new Error("Mẫu thiết kế được chọn không chứa đối tượng chữ (TextFrame) nào để thay đổi!");
            }

            // Sắp xếp textframes từ trên xuống dưới, trái qua phải
            masterTfs.sort(function (a, b) {
                var dy = Math.abs(b.top - a.top);
                if (dy > 4) return b.top - a.top;
                return a.left - b.left;
            });

            // Tọa độ và kích thước mẫu gốc
            var b = masterItem.visibleBounds; // [left, top, right, bottom]
            var cols = parseInt(opts.columns, 10) || 2;
            if (cols < 1) cols = 1;

            // Cố định khoảng cách 10mm theo yêu cầu
            var gapPt = 10 * MM_TO_PT;
            var startPos = opts.startPos || 'right';
            var createGroup = (opts.createGroup !== false);
            var keepMaster = (opts.keepMaster !== false);
            var mappings = opts.mappings || [];

            // Tạo group tổng nếu được chọn
            var containerGroup = null;
            if (createGroup) {
                containerGroup = doc.groupItems.add();
                containerGroup.name = "Danh_Sach_In_" + items.length + "_Ban";
            }

            var generatedCopies = [];

            // Bước 1: Nhân bản & gán nội dung text theo từng cột mapping
            for (var i = 0; i < items.length; i++) {
                var rawLine = items[i];
                if (typeof rawLine !== 'string') continue;
                var line = rawLine.replace(/^\s+|\s+$/g, '');
                if (line.length === 0) continue;

                // Nhân bản (Duplicate) mẫu gốc
                var copyItem = masterItem.duplicate();

                if (containerGroup) {
                    copyItem.moveToEnd(containerGroup);
                }

                // Thu thập và sắp xếp các TextFrames bên trong bản sao
                var copyTfs = _collectTextFrames(copyItem);
                copyTfs.sort(function (a, b) {
                    var dy = Math.abs(b.top - a.top);
                    if (dy > 4) return b.top - a.top;
                    return a.left - b.left;
                });

                // Tách các cột nếu dòng có Tab, chấm phẩy hoặc dấu phẩy
                var tokens = [];
                if (line.indexOf('\t') !== -1) {
                    tokens = line.split('\t');
                } else if (line.indexOf(';') !== -1) {
                    tokens = line.split(';');
                } else if (copyTfs.length > 1 && line.indexOf(',') !== -1) {
                    tokens = line.split(',');
                } else {
                    tokens = [line];
                }

                // Thay thế văn bản từng trường theo mappings do người dùng chỉ định
                for (var tIdx = 0; tIdx < copyTfs.length; tIdx++) {
                    var colTarget = (tIdx < mappings.length) ? parseInt(mappings[tIdx], 10) : (tIdx + 1);
                    // colTarget > 0: Gán theo cột tương ứng; colTarget <= 0: Giữ nguyên text gốc
                    if (colTarget > 0) {
                        var colTokenIdx = colTarget - 1;
                        if (colTokenIdx < tokens.length) {
                            var val = tokens[colTokenIdx].replace(/^\s+|\s+$/g, '');
                            try {
                                copyTfs[tIdx].contents = val;
                            } catch (eSet) {}
                        } else {
                            try {
                                copyTfs[tIdx].contents = "";
                            } catch (eSetBlank) {}
                        }
                    }
                }

                // Đo kích thước thực tế của bản sao sau khi đã cập nhật chữ
                var curB = copyItem.visibleBounds; // [left, top, right, bottom]
                var itW = Math.abs(curB[2] - curB[0]);
                var itH = Math.abs(curB[1] - curB[3]);

                generatedCopies.push({
                    item: copyItem,
                    w: itW,
                    h: itH
                });
            }

            var totalCopies = generatedCopies.length;
            if (totalCopies === 0) {
                throw new Error("Không có dữ liệu hợp lệ nào được tạo!");
            }

            // Bước 2: Tự động tính toán khoảng cách thích ứng (Adaptive Grid Layout)
            // Đo độ rộng tối đa từng cột và chiều cao tối đa từng hàng để cách đều 10mm, không bao giờ dính nhau
            var numRows = Math.ceil(totalCopies / cols);
            var colMaxW = [];
            for (var c = 0; c < cols; c++) colMaxW.push(0);
            var rowMaxH = [];
            for (var r = 0; r < numRows; r++) rowMaxH.push(0);

            for (var idx = 0; idx < totalCopies; idx++) {
                var cIdx = idx % cols;
                var rIdx = Math.floor(idx / cols);
                var it = generatedCopies[idx];
                if (it.w > colMaxW[cIdx]) colMaxW[cIdx] = it.w;
                if (it.h > rowMaxH[rIdx]) rowMaxH[rIdx] = it.h;
            }

            // Tọa độ bắt đầu
            var startX = b[0];
            var startY = b[1];

            if (startPos === 'right') {
                startX = b[2] + gapPt;
                startY = b[1];
            } else if (startPos === 'below') {
                startX = b[0];
                startY = b[3] - gapPt;
            } else if (startPos === 'inplace') {
                startX = b[0];
                startY = b[1];
            }

            // Tính tọa độ X của từng cột (đảm bảo mỗi cột cách cột trước ít nhất 10mm)
            var colX = [];
            var curX = startX;
            for (var c = 0; c < cols; c++) {
                colX.push(curX);
                curX += (colMaxW[c] + gapPt);
            }

            // Tính tọa độ Y của từng hàng (đảm bảo mỗi hàng cách hàng trước ít nhất 10mm)
            var rowY = [];
            var curY = startY;
            for (var r = 0; r < numRows; r++) {
                rowY.push(curY);
                curY -= (rowMaxH[r] + gapPt);
            }

            // Dịch chuyển từng bản sao vào đúng vị trí trên lưới
            var outItems = [];
            for (var idx = 0; idx < totalCopies; idx++) {
                var cIdx = idx % cols;
                var rIdx = Math.floor(idx / cols);
                var targetX = colX[cIdx];
                var targetY = rowY[rIdx];

                var obj = generatedCopies[idx].item;
                var curBounds = obj.visibleBounds;
                obj.translate(targetX - curBounds[0], targetY - curBounds[1]);

                if (obj.locked) obj.locked = false;
                outItems.push(obj);
            }

            // Nếu người dùng chọn thay thế trực tiếp và không giữ master gốc
            if (!keepMaster && startPos === 'inplace' && masterItem) {
                try { masterItem.remove(); } catch (eRem) {}
            }

            // Quét chọn các đối tượng vừa tạo để người dùng dễ kiểm tra
            doc.selection = null;
            if (containerGroup) {
                containerGroup.selected = true;
            } else {
                for (var o = 0; o < outItems.length; o++) {
                    outItems[o].selected = true;
                }
            }

            return P._reply({
                success: true,
                count: totalCopies,
                message: "Đã tạo thành công " + totalCopies + " mẫu theo danh sách (giãn cách tự động 10mm)!"
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 6. Mở thư mục dự án / xuất file trên Windows Explorer
    // -------------------------------------------------------------
    P.openFolder = function (targetPath) {
        try {
            var folderObj = null;
            if (targetPath && typeof targetPath === 'string' && targetPath.length > 0) {
                folderObj = new Folder(targetPath);
            } else {
                if (app.documents.length === 0) {
                    throw new Error("Chưa mở tài liệu Illustrator nào!");
                }
                var doc = app.activeDocument;
                try {
                    folderObj = doc.path;
                } catch (ePath) {
                    throw new Error("File này chưa được lưu vào máy tính. Vui lòng bấm Ctrl + S để lưu trước khi mở thư mục!");
                }
            }

            if (!folderObj || !folderObj.exists) {
                throw new Error("Thư mục không tồn tại: " + (folderObj ? folderObj.fsName : ""));
            }

            // Mở thư mục gốc bằng Windows Explorer (hoặc Finder trên macOS)
            folderObj.execute();

            return P._reply({
                success: true,
                folder: folderObj.fsName,
                message: "Đã mở thư mục trên Windows Explorer: " + folderObj.fsName
            });
        } catch (err) {
            return P._error(err);
        }
    };

    // -------------------------------------------------------------
    // 7. Tiện ích kiểm tra
    // -------------------------------------------------------------
    P.ping = function () {
        try {
            return P._reply({
                status: 'connected',
                message: 'Kết nối Pannel TC với Illustrator 2024 thành công!',
                version: String(app.version),
                documents: app.documents.length
            });
        } catch (err) {
            return P._error(err);
        }
    };

})($._PannelTC);
