#target illustrator
/**
 * ==============================================================================
 * DTF AUTO NESTING FOR ADOBE ILLUSTRATOR (A3)
 * ==============================================================================
 * Phiên bản: 1.2.0 (Sửa lỗi xoay/nhân bản sai hướng, tối ưu lấp đầy A3 đa chiến lược)
 * Tác giả: Antigravity Assistant
 * Mô tả: Tự động sắp xếp hoặc nhân bản lấp đầy màng in DTF (Direct to Film) khổ A3.
 * Thuật toán: Bố cục khối (block grid) + MaxRects 2D Bin Packing (nhiều heuristic),
 *             tự chọn phương án lấp đầy tốt nhất.
 * ==============================================================================
 */

(function () {
    // Kiểm tra tài liệu mở
    if (app.documents.length === 0) {
        alert("Vui lòng mở một tài liệu Illustrator trước khi chạy script!", "Thông báo");
        return;
    }

    var doc = app.activeDocument;
    var MM_TO_PT = 2.83464567; // 1 mm = 2.83464567 points
    var PT_TO_MM = 1 / MM_TO_PT;

    // ==========================================
    // 1. GIAO DIỆN NGƯỜI DÙNG (ScriptUI Dialog)
    // ==========================================
    var hasSelection = doc.selection && doc.selection.length > 0;

    var dlg = new Window("dialog", "DTF Auto Nesting - Dàn Trang In DTF (A3)");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 10;
    dlg.margins = 14;

    // Panel 1: Chế độ dàn trang
    var pnlMode = dlg.add("panel", undefined, "Chế độ dàn trang (Nesting Mode)");
    pnlMode.orientation = "column";
    pnlMode.alignChildren = ["left", "center"];
    pnlMode.margins = 10;
    pnlMode.spacing = 8;

    // Lựa chọn 1: Theo số lượng tem DTF cần có
    var rbModeItemCount = pnlMode.add("radiobutton", undefined, "Dàn theo số lượng tem DTF cần có (Tự tạo trang mới khi đầy):");
    rbModeItemCount.value = true; // Mặc định chế độ theo số lượng tem

    var grpItemOpt = pnlMode.add("group");
    grpItemOpt.orientation = "row";
    grpItemOpt.margins = [22, 0, 0, 0];
    grpItemOpt.add("statictext", undefined, "Số lượng tem cần in:");
    var txtItemCount = grpItemOpt.add("edittext", undefined, "50");
    txtItemCount.preferredSize.width = 50;
    grpItemOpt.add("statictext", undefined, "tem (Tự tràn & tạo trang A3 mới khi đầy)");

    // Lựa chọn 2: Theo số lượng trang A3 cần dàn kín
    var rbModeFillPages = pnlMode.add("radiobutton", undefined, "Dàn kín theo số lượng trang A3 (Fill Full Sheet):");

    var grpPageOpt = pnlMode.add("group");
    grpPageOpt.orientation = "row";
    grpPageOpt.margins = [22, 0, 0, 0];
    grpPageOpt.add("statictext", undefined, "Số lượng trang A3 cần dàn kín:");
    var txtPageCount = grpPageOpt.add("edittext", undefined, "1");
    txtPageCount.preferredSize.width = 50;
    grpPageOpt.add("statictext", undefined, "trang A3");

    // Lựa chọn 3: Chỉ sắp xếp các hình hiện có (không nhân bản)
    var rbModeArrangeOnly = pnlMode.add("radiobutton", undefined, "Chỉ sắp xếp các hình hiện có (Không nhân bản)");

    function updateModeUI() {
        grpItemOpt.enabled = rbModeItemCount.value;
        grpPageOpt.enabled = rbModeFillPages.value;
    }
    rbModeItemCount.onClick = updateModeUI;
    rbModeFillPages.onClick = updateModeUI;
    rbModeArrangeOnly.onClick = updateModeUI;
    updateModeUI();

    // Panel 2: Nguồn đối tượng
    var pnlSource = dlg.add("panel", undefined, "Nguồn mẫu thiết kế");
    pnlSource.orientation = "column";
    pnlSource.alignChildren = ["left", "center"];
    pnlSource.margins = 10;

    var rbSelection = pnlSource.add("radiobutton", undefined, "Chỉ các đối tượng/Group đang chọn (Selection)");
    var rbCurrentArtboard = pnlSource.add("radiobutton", undefined, "Các Group nằm trên Artboard A3 hiện tại");
    var rbAllDoc = pnlSource.add("radiobutton", undefined, "Tất cả Group trong file (kể cả vùng ngoài Artboard)");
    
    if (hasSelection) {
        rbSelection.value = true;
    } else {
        rbCurrentArtboard.value = true;
        rbSelection.enabled = false;
        rbSelection.text += " (Chưa quét chọn đối tượng nào)";
    }

    // Panel 3: Thiết lập thông số in ấn DTF
    var pnlSettings = dlg.add("panel", undefined, "Thông số kỹ thuật in DTF");
    pnlSettings.orientation = "column";
    pnlSettings.alignChildren = ["fill", "top"];
    pnlSettings.margins = 10;
    pnlSettings.spacing = 6;

    // Lề mép (Margin)
    var grpMargin = pnlSettings.add("group");
    grpMargin.orientation = "row";
    var lblMargin = grpMargin.add("statictext", undefined, "Lề an toàn mép film (Margin):");
    lblMargin.preferredSize.width = 190;
    var txtMargin = grpMargin.add("edittext", undefined, "5");
    txtMargin.preferredSize.width = 55;
    grpMargin.add("statictext", undefined, "mm (Khuyên dùng: 5 mm)");

    // Khoảng cách giữa các hình (Gap/Spacing)
    var grpSpacing = pnlSettings.add("group");
    grpSpacing.orientation = "row";
    var lblSpacing = grpSpacing.add("statictext", undefined, "Khoảng cách giữa các hình (Gap):");
    lblSpacing.preferredSize.width = 190;
    var txtSpacing = grpSpacing.add("edittext", undefined, "5");
    txtSpacing.preferredSize.width = 55;
    grpSpacing.add("statictext", undefined, "mm (Chừa đường cắt kéo/dao)");

    // Tự động xoay 90 độ
    var chkRotate = pnlSettings.add("checkbox", undefined, "Cho phép tự động xoay 90° để nhét vừa nhiều hình nhất");
    chkRotate.value = true;

    // Panel 4: Thông tin Artboard A3
    var curAbIndex = doc.artboards.getActiveArtboardIndex();
    var curAb = doc.artboards[curAbIndex];
    var curRect = curAb.artboardRect;
    var abW_mm = Math.round(Math.abs(curRect[2] - curRect[0]) * PT_TO_MM);
    var abH_mm = Math.round(Math.abs(curRect[1] - curRect[3]) * PT_TO_MM);

    var pnlInfo = dlg.add("panel", undefined, "Thông tin Artboard A3 hiện tại");
    pnlInfo.orientation = "column";
    pnlInfo.alignChildren = ["left", "center"];
    pnlInfo.margins = 10;
    pnlInfo.add("statictext", undefined, "Artboard: " + curAb.name + " (" + abW_mm + " x " + abH_mm + " mm)");
    pnlInfo.add("statictext", undefined, "※ Khổ A3 chuẩn: 297 x 420 mm (Dọc) hoặc 420 x 297 mm (Ngang)");

    // Nút bấm
    var grpButtons = dlg.add("group");
    grpButtons.orientation = "row";
    grpButtons.alignment = ["right", "bottom"];
    var btnCancel = grpButtons.add("button", undefined, "Hủy bỏ", { name: "cancel" });
    var btnOk = grpButtons.add("button", undefined, "Bắt đầu Dàn Trang", { name: "ok" });

    btnCancel.onClick = function () {
        dlg.close(0);
    };

    btnOk.onClick = function () {
        var m = parseFloat(txtMargin.text);
        var s = parseFloat(txtSpacing.text);
        if (isNaN(m) || m < 0) {
            alert("Lề an toàn (Margin) phải là một số không âm!", "Lỗi nhập liệu");
            txtMargin.active = true;
            return;
        }
        if (isNaN(s) || s < 0) {
            alert("Khoảng cách (Gap) phải là một số không âm!", "Lỗi nhập liệu");
            txtSpacing.active = true;
            return;
        }
        if (rbModeItemCount.value) {
            var ic = parseInt(txtItemCount.text, 10);
            if (isNaN(ic) || ic <= 0) {
                alert("Số lượng tem DTF cần in phải là một số nguyên dương (> 0)!", "Lỗi nhập liệu");
                txtItemCount.active = true;
                return;
            }
        }
        if (rbModeFillPages.value) {
            var p = parseInt(txtPageCount.text, 10);
            if (isNaN(p) || p <= 0) {
                alert("Số lượng trang A3 cần dàn kín phải lớn hơn hoặc bằng 1!", "Lỗi nhập liệu");
                txtPageCount.active = true;
                return;
            }
        }
        dlg.close(1);
    };

    if (dlg.show() !== 1) {
        return; // Người dùng ấn Hủy
    }

    // ==========================================
    // 2. THU THẬP VÀ CHUẨN BỊ MẪU THIẾT KẾ
    // ==========================================
    var margin = parseFloat(txtMargin.text) * MM_TO_PT;
    var spacing = parseFloat(txtSpacing.text) * MM_TO_PT;
    var allowRotate = chkRotate.value;
    var isItemCountMode = rbModeItemCount.value;
    var isFillPagesMode = rbModeFillPages.value;
    var isArrangeOnlyMode = rbModeArrangeOnly.value;

    var reqItemCount = isItemCountMode ? parseInt(txtItemCount.text, 10) : 0;
    var reqPageCount = isFillPagesMode ? parseInt(txtPageCount.text, 10) : 1;

    var targetItems = [];

    function isItemInsideArtboard(it, abRect) {
        var b = it.visibleBounds; // [left, top, right, bottom]
        var cx = (b[0] + b[2]) / 2;
        var cy = (b[1] + b[3]) / 2;
        var left = Math.min(abRect[0], abRect[2]);
        var right = Math.max(abRect[0], abRect[2]);
        var top = Math.max(abRect[1], abRect[3]);
        var bottom = Math.min(abRect[1], abRect[3]);
        return (cx >= left && cx <= right && cy <= top && cy >= bottom);
    }

    if (rbSelection.value) {
        for (var i = 0; i < doc.selection.length; i++) {
            var selItem = doc.selection[i];
            if (selItem.hidden) continue;
            if (selItem.locked) selItem.locked = false;
            targetItems.push(selItem);
        }
    } else {
        for (var j = 0; j < doc.pageItems.length; j++) {
            var item = doc.pageItems[j];
            if (item.hidden) continue;

            var isTopLevel = (item.parent.typename === "Layer" || item.parent.typename === "Document");
            if (!isTopLevel) continue;

            var isEligibleType = (item.typename === "GroupItem" ||
                                  item.typename === "RasterItem" ||
                                  item.typename === "PlacedItem" ||
                                  item.typename === "CompoundPathItem");
            if (!isEligibleType) continue;

            if (rbCurrentArtboard.value && !isItemInsideArtboard(item, curRect)) {
                continue;
            }

            if (item.locked) item.locked = false;
            targetItems.push(item);
        }
    }

    if (targetItems.length === 0) {
        alert("Không tìm thấy đối tượng hoặc Group nào để dàn trang!\n\nLưu ý:\n- Hãy gom từng mẫu in thành 1 Group (Ctrl + G).\n- Hoặc quét chọn các đối tượng cần dàn trước khi chạy script.", "Thông báo");
        return;
    }

    // Kích thước khả dụng trên Artboard A3
    var baseAbRect = curAb.artboardRect;
    var sheetW = Math.abs(baseAbRect[2] - baseAbRect[0]);
    var sheetH = Math.abs(baseAbRect[1] - baseAbRect[3]);

    var usableW = sheetW - 2 * margin;
    var usableH = sheetH - 2 * margin;

    if (usableW <= 0 || usableH <= 0) {
        alert("Lề an toàn (Margin) quá lớn so với kích thước Artboard!", "Lỗi");
        return;
    }

    // Chuẩn bị danh sách các mẫu (Templates)
    var templateData = [];
    var oversizedItems = [];

    for (var k = 0; k < targetItems.length; k++) {
        var it = targetItems[k];
        var bounds = it.visibleBounds;
        var w = Math.abs(bounds[2] - bounds[0]);
        var h = Math.abs(bounds[1] - bounds[3]);

        var fitsNormal = (w <= usableW && h <= usableH);
        var fitsRotated = allowRotate && (h <= usableW && w <= usableH);

        if (!fitsNormal && !fitsRotated) {
            oversizedItems.push({
                item: it,
                w: Math.round(w * PT_TO_MM),
                h: Math.round(h * PT_TO_MM)
            });
            continue;
        }

        templateData.push({
            item: it,
            w: w,
            h: h,
            area: w * h,
            maxDim: Math.max(w, h),
            timesUsed: 0
        });
    }

    if (templateData.length === 0) {
        alert("Tất cả các hình được chọn đều quá khổ so với vùng in khả dụng của Artboard A3!", "Lỗi kích thước");
        return;
    }

    // Sắp xếp mẫu theo cạnh lớn nhất giảm dần
    templateData.sort(function (a, b) {
        return b.maxDim - a.maxDim || b.area - a.area;
    });

    // =========================================================================
    // 3. ENGINE XẾP HÌNH (thuần toán học, không phụ thuộc Illustrator)
    //    - Bố cục khối (block grid): lưới 2 khối xoay/không xoay, rất khít khi
    //      các hình giống nhau.
    //    - MaxRects với nhiều heuristic (BL, LT, BSSF, BAF, BLSF).
    //    - Chạy tất cả phương án rồi chọn phương án lấp đầy nhiều diện tích nhất.
    // =========================================================================
    // ==== PACKING ENGINE BEGIN ====
    var DTF_EPS = 0.01;

    function dtfNewBin(w, h) {
        return { w: w, h: h, freeRects: [{ x: 0, y: 0, w: w, h: h }], items: [] };
    }

    function dtfContains(outer, inner) {
        return inner.x >= outer.x - DTF_EPS && inner.y >= outer.y - DTF_EPS &&
               inner.x + inner.w <= outer.x + outer.w + DTF_EPS &&
               inner.y + inner.h <= outer.y + outer.h + DTF_EPS;
    }

    function dtfSplit(freeR, placed, out) {
        if (placed.x >= freeR.x + freeR.w - DTF_EPS || placed.x + placed.w <= freeR.x + DTF_EPS ||
            placed.y >= freeR.y + freeR.h - DTF_EPS || placed.y + placed.h <= freeR.y + DTF_EPS) {
            out.push(freeR);
            return;
        }
        // Phần phía trên
        if (placed.y > freeR.y + DTF_EPS) {
            out.push({ x: freeR.x, y: freeR.y, w: freeR.w, h: placed.y - freeR.y });
        }
        // Phần phía dưới
        if (placed.y + placed.h < freeR.y + freeR.h - DTF_EPS) {
            out.push({ x: freeR.x, y: placed.y + placed.h, w: freeR.w,
                       h: freeR.y + freeR.h - (placed.y + placed.h) });
        }
        // Phần bên trái
        if (placed.x > freeR.x + DTF_EPS) {
            out.push({ x: freeR.x, y: freeR.y, w: placed.x - freeR.x, h: freeR.h });
        }
        // Phần bên phải
        if (placed.x + placed.w < freeR.x + freeR.w - DTF_EPS) {
            out.push({ x: placed.x + placed.w, y: freeR.y,
                       w: freeR.x + freeR.w - (placed.x + placed.w), h: freeR.h });
        }
    }

    function dtfPrune(list) {
        var i = 0, j, removed;
        while (i < list.length) {
            removed = false;
            j = i + 1;
            while (j < list.length) {
                if (dtfContains(list[j], list[i])) {
                    list.splice(i, 1);
                    removed = true;
                    break;
                }
                if (dtfContains(list[i], list[j])) {
                    list.splice(j, 1);
                } else {
                    j++;
                }
            }
            if (!removed) i++;
        }
    }

    // pw/ph: kích thước đã cộng khe hở (dùng để chiếm chỗ); realW/realH: kích thước thật của hình
    function dtfPlace(bin, tIdx, x, y, pw, ph, realW, realH, rotated) {
        var placed = { x: x, y: y, w: pw, h: ph };
        var next = [];
        for (var f = 0; f < bin.freeRects.length; f++) {
            dtfSplit(bin.freeRects[f], placed, next);
        }
        dtfPrune(next);
        bin.freeRects = next;
        bin.items.push({ t: tIdx, x: x, y: y, w: realW, h: realH, rotated: rotated });
    }

    // Tìm vị trí tốt nhất cho 1 hình (đã cộng khe hở iw x ih) theo heuristic
    function dtfFindPosition(freeRects, iw, ih, heur, allowRot) {
        var best = null;
        var square = Math.abs(iw - ih) < DTF_EPS;
        for (var r = 0; r < freeRects.length; r++) {
            var fr = freeRects[r];
            for (var o = 0; o < 2; o++) {
                if (o === 1 && (!allowRot || square)) continue;
                var w = o ? ih : iw;
                var h = o ? iw : ih;
                if (w > fr.w + DTF_EPS || h > fr.h + DTF_EPS) continue;
                var lw = fr.w - w, lh = fr.h - h;
                var shortSide = Math.min(lw, lh), longSide = Math.max(lw, lh);
                var s1, s2, s3;
                if (heur === 'BL') {          // Ưu tiên cạnh dưới thấp nhất rồi tới trái nhất (hàng ngang gọn)
                    s1 = fr.y + h; s2 = fr.x; s3 = shortSide;
                } else if (heur === 'LT') {   // Ưu tiên cạnh phải nhỏ nhất rồi tới trên nhất (cột dọc gọn)
                    s1 = fr.x + w; s2 = fr.y; s3 = shortSide;
                } else if (heur === 'BSSF') { // Best Short Side Fit
                    s1 = shortSide; s2 = longSide; s3 = fr.y;
                } else if (heur === 'BSSF0') { // BSSF, hòa điểm thì lấy ô trống đầu tiên (như thuật toán cũ)
                    s1 = shortSide; s2 = longSide; s3 = 0;
                } else if (heur === 'BLSF') { // Best Long Side Fit
                    s1 = longSide; s2 = shortSide; s3 = fr.y;
                } else {                      // BAF: Best Area Fit
                    s1 = fr.w * fr.h - w * h; s2 = shortSide; s3 = fr.y;
                }
                var better = false;
                if (!best) {
                    better = true;
                } else if (s1 < best.s1 - DTF_EPS) {
                    better = true;
                } else if (Math.abs(s1 - best.s1) <= DTF_EPS) {
                    if (s2 < best.s2 - DTF_EPS) {
                        better = true;
                    } else if (Math.abs(s2 - best.s2) <= DTF_EPS && s3 < best.s3 - DTF_EPS) {
                        better = true;
                    }
                }
                if (better) {
                    best = { x: fr.x, y: fr.y, w: w, h: h, rotated: (o === 1), s1: s1, s2: s2, s3: s3 };
                }
            }
        }
        return best;
    }

    function dtfPickLayout(best, cand) {
        if (!best) return cand;
        if (cand.total > best.total) return cand;
        if (cand.total === best.total && cand.mixed < best.mixed) return cand;
        return best;
    }

    // Bố cục khối: khối A (hướng gốc hoặc xoay) + khối B (xoay ngược lại) lấp phần còn lại.
    // iw/ih: kích thước đã cộng khe hở; BW/BH: kích thước vùng chứa đã cộng khe hở.
    function dtfBestBlockLayout(iw, ih, BW, BH, allowRot) {
        var canMix = allowRot && Math.abs(iw - ih) > DTF_EPS;
        var baseCount = canMix ? 2 : 1;
        var best = null;
        for (var base = 0; base < baseCount; base++) {
            var aw = base ? ih : iw;
            var ah = base ? iw : ih;
            var bw = ah, bh = aw;
            var cols0Max = Math.floor((BW + DTF_EPS) / aw);
            var rows0Max = Math.floor((BH + DTF_EPS) / ah);
            var n, cnt0, cnt1;
            // Họ V: n cột khối A (full chiều cao), phần rộng còn lại xếp khối B
            for (n = (canMix ? 0 : cols0Max); n <= cols0Max; n++) {
                cnt0 = n * rows0Max;
                cnt1 = canMix ? Math.floor((BW - n * aw + DTF_EPS) / bw) * Math.floor((BH + DTF_EPS) / bh) : 0;
                best = dtfPickLayout(best, { family: 'V', base: base, n: n, total: cnt0 + cnt1, mixed: cnt1 });
            }
            // Họ H: n hàng khối A (full chiều rộng), phần cao còn lại xếp khối B
            for (n = (canMix ? 0 : rows0Max); n <= rows0Max; n++) {
                cnt0 = n * cols0Max;
                cnt1 = canMix ? Math.floor((BH - n * ah + DTF_EPS) / bh) * Math.floor((BW + DTF_EPS) / bw) : 0;
                best = dtfPickLayout(best, { family: 'H', base: base, n: n, total: cnt0 + cnt1, mixed: cnt1 });
            }
        }
        if (!best || best.total <= 0) return [];

        var aW = best.base ? ih : iw, aH = best.base ? iw : ih;
        var bW = aH, bH = aW;
        var aRot = (best.base === 1), bRot = !aRot;
        var cols0 = Math.floor((BW + DTF_EPS) / aW);
        var rows0 = Math.floor((BH + DTF_EPS) / aH);
        var items = [], i, j;
        if (best.family === 'V') {
            for (i = 0; i < best.n; i++) {
                for (j = 0; j < rows0; j++) {
                    items.push({ x: i * aW, y: j * aH, pw: aW, ph: aH, rotated: aRot });
                }
            }
            if (best.mixed > 0) {
                var x0 = best.n * aW;
                var cols1 = Math.floor((BW - x0 + DTF_EPS) / bW);
                var rows1 = Math.floor((BH + DTF_EPS) / bH);
                for (i = 0; i < cols1; i++) {
                    for (j = 0; j < rows1; j++) {
                        items.push({ x: x0 + i * bW, y: j * bH, pw: bW, ph: bH, rotated: bRot });
                    }
                }
            }
        } else {
            for (j = 0; j < best.n; j++) {
                for (i = 0; i < cols0; i++) {
                    items.push({ x: i * aW, y: j * aH, pw: aW, ph: aH, rotated: aRot });
                }
            }
            if (best.mixed > 0) {
                var y0 = best.n * aH;
                var rowsB = Math.floor((BH - y0 + DTF_EPS) / bH);
                var colsB = Math.floor((BW + DTF_EPS) / bW);
                for (j = 0; j < rowsB; j++) {
                    for (i = 0; i < colsB; i++) {
                        items.push({ x: i * bW, y: y0 + j * bH, pw: bW, ph: bH, rotated: bRot });
                    }
                }
            }
        }
        return items;
    }

    function dtfUsedArea(bin) {
        var s = 0;
        for (var i = 0; i < bin.items.length; i++) s += bin.items[i].w * bin.items[i].h;
        return s;
    }

    // Lấp 1 trang với 1 chiến lược cụ thể (cand = {heur, seed})
    function dtfRunFill(templates, BW, BH, sp, allowRot, maxItems, cand) {
        var bin = dtfNewBin(BW, BH);
        var n = templates.length;
        var t, tp, i;

        if (cand.seed && n === 1) {
            tp = templates[0];
            var layout = dtfBestBlockLayout(tp.w + sp, tp.h + sp, BW, BH, allowRot);
            for (i = 0; i < layout.length && i < maxItems; i++) {
                var L = layout[i];
                dtfPlace(bin, 0, L.x, L.y, L.pw, L.ph,
                         L.rotated ? tp.h : tp.w, L.rotated ? tp.w : tp.h, L.rotated);
            }
        }

        var cycle = (cand.start || 0) % n, guard = 0;
        while (guard < maxItems) {
            guard++;
            var placedAny = false;
            for (var step = 0; step < n; step++) {
                t = (cycle + step) % n;
                tp = templates[t];
                var pos = dtfFindPosition(bin.freeRects, tp.w + sp, tp.h + sp, cand.heur, allowRot);
                if (pos) {
                    dtfPlace(bin, t, pos.x, pos.y, pos.w, pos.h,
                             pos.rotated ? tp.h : tp.w, pos.rotated ? tp.w : tp.h, pos.rotated);
                    cycle = (t + 1) % n;
                    placedAny = true;
                    break;
                }
            }
            if (!placedAny) break;
        }
        return { bin: bin, used: dtfUsedArea(bin), name: cand.heur + (cand.seed ? "+Block" : "") };
    }

    // Lấp đầy 1 trang A3: thử nhiều chiến lược, chọn phương án nhét được nhiều diện tích nhất.
    // templates: [{w,h}] kích thước thật (pt). W/H: vùng khả dụng. Trả về {items:[{t,x,y,w,h,rotated}], used, name}
    function dtfFillPage(templates, W, H, sp, allowRot, maxItems, budgetMs) {
        var start = new Date().getTime();
        var BW = W + sp, BH = H + sp;
        var cands = [];
        if (templates.length === 1) cands.push({ heur: 'BL', seed: true });
        cands.push({ heur: 'BL' });
        cands.push({ heur: 'LT' });
        cands.push({ heur: 'BSSF' });
        cands.push({ heur: 'BAF' });
        cands.push({ heur: 'BLSF' });
        cands.push({ heur: 'BSSF0' });
        // Nhiều mẫu: thử thêm các điểm bắt đầu xoay vòng khác nhau (tối đa 4) để chia mẫu khít hơn
        var starts = Math.min(templates.length, 4);
        for (var st = 1; st < starts; st++) {
            cands.push({ heur: 'BL', start: st });
            cands.push({ heur: 'BSSF', start: st });
            cands.push({ heur: 'BAF', start: st });
            cands.push({ heur: 'LT', start: st });
            cands.push({ heur: 'BLSF', start: st });
        }

        var best = null;
        for (var c = 0; c < cands.length; c++) {
            if (best && (new Date().getTime() - start) > budgetMs) break;
            var res = dtfRunFill(templates, BW, BH, sp, allowRot, maxItems, cands[c]);
            // Chỉ thay khi tốt hơn rõ rệt -> ưu tiên phương án gọn gàng đứng trước
            if (!best || res.used > best.used + 1e-6) best = res;
        }
        return { items: best.bin.items, used: best.used, name: best.name };
    }

    // Chế độ chỉ sắp xếp (không nhân bản): mỗi mẫu đặt 1 lần, tự mở thêm trang nếu hết chỗ
    function dtfArrangeOnce(templates, order, BW, BH, sp, allowRot, heur) {
        var bins = [dtfNewBin(BW, BH)];
        for (var o = 0; o < order.length; o++) {
            var t = order[o];
            var tp = templates[t];
            var placedFlag = false;
            for (var b = 0; b < bins.length && !placedFlag; b++) {
                var pos = dtfFindPosition(bins[b].freeRects, tp.w + sp, tp.h + sp, heur, allowRot);
                if (pos) {
                    dtfPlace(bins[b], t, pos.x, pos.y, pos.w, pos.h,
                             pos.rotated ? tp.h : tp.w, pos.rotated ? tp.w : tp.h, pos.rotated);
                    placedFlag = true;
                }
            }
            if (!placedFlag) {
                var nb = dtfNewBin(BW, BH);
                var pos2 = dtfFindPosition(nb.freeRects, tp.w + sp, tp.h + sp, heur, allowRot);
                if (pos2) {
                    dtfPlace(nb, t, pos2.x, pos2.y, pos2.w, pos2.h,
                             pos2.rotated ? tp.h : tp.w, pos2.rotated ? tp.w : tp.h, pos2.rotated);
                    bins.push(nb);
                }
            }
        }
        return bins;
    }

    function dtfArrange(templates, W, H, sp, allowRot, budgetMs) {
        var start = new Date().getTime();
        var BW = W + sp, BH = H + sp;
        var n = templates.length, i;
        var orderGiven = [], orderArea = [];
        for (i = 0; i < n; i++) { orderGiven.push(i); orderArea.push(i); }
        orderArea.sort(function (a, b) { return templates[b].w * templates[b].h - templates[a].w * templates[a].h; });
        var orders = [orderGiven, orderArea];
        var heurs = ['BL', 'LT', 'BSSF', 'BAF', 'BLSF'];
        var best = null, bestName = "";
        for (var oi = 0; oi < orders.length; oi++) {
            for (var hi = 0; hi < heurs.length; hi++) {
                if (best && (new Date().getTime() - start) > budgetMs) break;
                var bins = dtfArrangeOnce(templates, orders[oi], BW, BH, sp, allowRot, heurs[hi]);
                if (!best || bins.length < best.length) {
                    best = bins;
                    bestName = heurs[hi];
                }
            }
        }
        var out = [];
        for (i = 0; i < best.length; i++) out.push({ items: best[i].items });
        return { bins: out, name: bestName };
    }

    // Đảm bảo đối tượng đúng chiều (wantW x wantH): so sánh kích thước THỰC TẾ rồi mới xoay.
    // (Tránh lỗi bản nhân bản kế thừa góc xoay của bản gốc đã bị xoay trước đó.)
    function dtfEnsureOrientation(obj, wantW, wantH) {
        var b = obj.visibleBounds;
        var cw = Math.abs(b[2] - b[0]);
        var ch = Math.abs(b[1] - b[3]);
        if (Math.abs(cw - wantW) <= 0.5 && Math.abs(ch - wantH) <= 0.5) return;
        try {
            obj.rotate(90, true, true, true, true, Transformation.CENTER);
        } catch (eRot) {
            try { obj.rotate(90); } catch (eRot2) {}
        }
    }
    // ==== PACKING ENGINE END ====

    // Hàm clone danh sách item tránh tham chiếu chéo giữa các trang
    function dtfCloneItems(arr, count) {
        var out = [];
        var n = (typeof count === 'number') ? Math.min(count, arr.length) : arr.length;
        for (var ci = 0; ci < n; ci++) {
            var it = arr[ci];
            out.push({
                t: it.t,
                x: it.x,
                y: it.y,
                pw: it.pw,
                ph: it.ph,
                w: it.w,
                h: it.h,
                rotated: it.rotated
            });
        }
        return out;
    }

    // Chạy engine
    var BUDGET_MS = 8000;
    var MAX_ITEMS_PER_PAGE = 2000; // Giới hạn an toàn chống treo
    var bins = [];
    var strategyName = "";

    var tplDims = [];
    for (var td = 0; td < templateData.length; td++) {
        tplDims.push({ w: templateData[td].w, h: templateData[td].h });
    }

    if (isItemCountMode) {
        // CHẾ ĐỘ 1: Dàn theo số lượng tem DTF yêu cầu, tự động tràn và tạo trang A3 mới khi đầy
        var pageResult = dtfFillPage(tplDims, usableW, usableH, spacing, allowRotate, MAX_ITEMS_PER_PAGE, BUDGET_MS);
        strategyName = pageResult.name;
        var maxPerSheet = pageResult.items.length;

        if (maxPerSheet === 0) {
            alert("Không thể xếp được hình nào vào trang A3! Vui lòng kiểm tra lại kích thước.", "Lỗi kích thước");
            return;
        }

        if (templateData.length === 1) {
            // Trường hợp phổ biến nhất: 1 mẫu tem in theo số lượng đặt hàng
            var fullSheets = Math.floor(reqItemCount / maxPerSheet);
            var rem = reqItemCount % maxPerSheet;

            for (var fs = 0; fs < fullSheets; fs++) {
                bins.push({ items: dtfCloneItems(pageResult.items) });
            }
            if (rem > 0) {
                bins.push({ items: dtfCloneItems(pageResult.items, rem) });
            }
        } else {
            // Nhiều mẫu tem: tạo danh sách các tem cần đặt (mỗi mẫu nhân bản đúng reqItemCount lần)
            var order = [];
            for (var rep = 0; rep < reqItemCount; rep++) {
                for (var ti = 0; ti < templateData.length; ti++) {
                    order.push(ti);
                }
            }
            var BW = usableW + spacing, BH = usableH + spacing;
            var heurs = ['BL', 'LT', 'BSSF', 'BAF', 'BLSF'];
            var bestBins = null, bestH = "";
            for (var hi = 0; hi < heurs.length; hi++) {
                var testBins = dtfArrangeOnce(tplDims, order, BW, BH, spacing, allowRotate, heurs[hi]);
                if (!bestBins || testBins.length < bestBins.length) {
                    bestBins = testBins;
                    bestH = heurs[hi];
                }
            }
            strategyName = bestH;
            for (var bi = 0; bi < bestBins.length; bi++) {
                bins.push({ items: bestBins[bi].items });
            }
        }
    } else if (isFillPagesMode) {
        // CHẾ ĐỘ 2: Lấp đầy kín số lượng trang A3 chỉ định
        var pageResult = dtfFillPage(tplDims, usableW, usableH, spacing, allowRotate, MAX_ITEMS_PER_PAGE, BUDGET_MS);
        strategyName = pageResult.name;
        for (var pgI = 0; pgI < reqPageCount; pgI++) {
            bins.push({ items: dtfCloneItems(pageResult.items) });
        }
    } else {
        // CHẾ ĐỘ 3: Chỉ sắp xếp các hình hiện có (không nhân bản)
        var arrangeResult = dtfArrange(tplDims, usableW, usableH, spacing, allowRotate, BUDGET_MS);
        bins = arrangeResult.bins;
        strategyName = arrangeResult.name;
    }

    // =========================================================================
    // 4. ÁP DỤNG LÊN ILLUSTRATOR (DUPLICATE, ROTATE, TRANSLATE)
    // =========================================================================
    var ARTBOARD_GAP = 30 * MM_TO_PT; // Cách 30mm giữa các Artboard trên Canvas

    // Trang 1 = Artboard hiện tại. Các trang kế tiếp luôn là Artboard MỚI cùng kích thước,
    // đặt bên phải tất cả Artboard đang có (không đè lên Artboard khác của file).
    var pageArtboards = [curAb];
    if (bins.length > 1) {
        var maxRight = Math.max(baseAbRect[0], baseAbRect[2]);
        for (var ai = 0; ai < doc.artboards.length; ai++) {
            var rr = doc.artboards[ai].artboardRect;
            var rRight = Math.max(rr[0], rr[2]);
            if (rRight > maxRight) maxRight = rRight;
        }
        var nextLeft = maxRight + ARTBOARD_GAP;
        var abTop = Math.max(baseAbRect[1], baseAbRect[3]);
        var abBottom = Math.min(baseAbRect[1], baseAbRect[3]);

        for (var pg = 1; pg < bins.length; pg++) {
            var addedAb = doc.artboards.add([nextLeft, abTop, nextLeft + sheetW, abBottom]);
            addedAb.name = "DTF A3 - Trang " + (pg + 1);
            pageArtboards.push(addedAb);
            nextLeft += sheetW + ARTBOARD_GAP;
        }
    }

    var totalPackedCount = 0;
    var totalUsedArea = 0;
    var outOfBoundsCount = 0;
    var templateOriginalUsed = {};
    var TOL = 1; // pt

    for (var bIdx = 0; bIdx < bins.length; bIdx++) {
        var cBin = bins[bIdx];
        var abCoords = pageArtboards[bIdx].artboardRect;
        var abLeft = Math.min(abCoords[0], abCoords[2]);
        var abRight = Math.max(abCoords[0], abCoords[2]);
        var curAbTop = Math.max(abCoords[1], abCoords[3]);
        var curAbBottom = Math.min(abCoords[1], abCoords[3]);

        var originLeft = abLeft + margin;
        var originTop = curAbTop - margin;

        for (var pIdx = 0; pIdx < cBin.items.length; pIdx++) {
            var pData = cBin.items[pIdx];
            var baseTemplate = templateData[pData.t];
            var workingObj = null;

            // Nếu mẫu gốc chưa dùng lần nào: di chuyển chính mẫu gốc
            if (!templateOriginalUsed[pData.t]) {
                workingObj = baseTemplate.item;
                templateOriginalUsed[pData.t] = true;
            } else {
                // Nếu mẫu gốc đã dùng: nhân bản (Duplicate) một bản mới
                workingObj = baseTemplate.item.duplicate();
            }

            // Mở khóa layer & item
            if (workingObj.layer && workingObj.layer.locked) workingObj.layer.locked = false;
            if (workingObj.layer && !workingObj.layer.visible) workingObj.layer.visible = true;
            if (workingObj.locked) workingObj.locked = false;

            // Xoay về đúng chiều theo kích thước thực tế (bản gốc có thể đã bị xoay từ lần trước)
            dtfEnsureOrientation(workingObj, pData.w, pData.h);

            // Tọa độ mục tiêu trong Illustrator (góc trên-trái của hình):
            var targetX = originLeft + pData.x;
            var targetY = originTop - pData.y;

            var curBounds = workingObj.visibleBounds;
            workingObj.translate(targetX - curBounds[0], targetY - curBounds[1]);
            templateData[pData.t].timesUsed++;
            totalPackedCount++;
            totalUsedArea += pData.w * pData.h;

            // Kiểm tra lại: hình có nằm trong vùng khả dụng của Artboard không
            var fb = workingObj.visibleBounds;
            if (fb[0] < abLeft + margin - TOL || fb[2] > abRight - margin + TOL ||
                fb[1] > curAbTop - margin + TOL || fb[3] < curAbBottom + margin - TOL) {
                outOfBoundsCount++;
            }
        }
    }

    // ==========================================
    // 5. THÔNG BÁO KẾT QUẢ CHO NGƯỜI DÙNG
    // ==========================================
    var fillPercent = (totalUsedArea / (usableW * usableH * bins.length)) * 100;

    var modeDesc = "";
    if (isItemCountMode) {
        modeDesc = "Theo số lượng tem DTF (" + reqItemCount + " tem" + (templateData.length > 1 ? "/mẫu" : "") + ")";
    } else if (isFillPagesMode) {
        modeDesc = "Dàn kín theo số trang A3 (" + reqPageCount + " trang)";
    } else {
        modeDesc = "Chỉ sắp xếp các hình hiện có";
    }

    var resultMsg = "🎉 ĐÃ DÀN TRANG IN DTF THÀNH CÔNG!\n";
    resultMsg += "----------------------------------------\n";
    resultMsg += "✔ Chế độ: " + modeDesc + "\n";
    resultMsg += "✔ Tổng số tem đã dàn: " + totalPackedCount + " tem\n";
    resultMsg += "✔ Số trang A3 sử dụng: " + bins.length + " trang" + (bins.length > 1 ? " (đã tự động tạo thêm " + (bins.length - 1) + " trang mới)" : "") + "\n";
    resultMsg += "✔ Độ lấp đầy trung bình: " + fillPercent.toFixed(1) + "% (chiến lược: " + strategyName + ")\n";
    resultMsg += "✔ Lề mép: " + (margin * PT_TO_MM).toFixed(1) + " mm | Khoảng cách dao cắt: " + (spacing * PT_TO_MM).toFixed(1) + " mm\n";

    if (bins.length > 1) {
        resultMsg += "\nPhân bố số lượng từng trang:\n";
        for (var b = 0; b < bins.length; b++) {
            resultMsg += " - Trang " + (b + 1) + ": " + bins[b].items.length + " tem\n";
        }
    }

    if (templateData.length > 1) {
        resultMsg += "\nChi tiết số lượng từng mẫu:\n";
        for (var t = 0; t < templateData.length; t++) {
            resultMsg += " - Mẫu " + (t + 1) + ": " + templateData[t].timesUsed + " tem\n";
        }
    }

    if (oversizedItems.length > 0) {
        resultMsg += "\n⚠ CHÚ Ý: Có " + oversizedItems.length + " hình quá khổ không thể xếp vào A3.\n";
    }
    if (outOfBoundsCount > 0) {
        resultMsg += "\n⚠ CHÚ Ý: Có " + outOfBoundsCount + " hình lệch ra ngoài vùng in (kiểm tra lại Group có chứa đối tượng thừa/Clipping Mask).\n";
    }


    alert(resultMsg, "Kết quả Dàn Trang DTF");

})();
