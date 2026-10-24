#target illustrator
/*
 AUTO DIMENSION GROUPS - Adobe Illustrator 2024 (ExtendScript / JSX)
 Copyright (c) 2026. Free for internal use and modification.

 HOW TO USE
 1. Select a parent Group, several Groups, or individual objects.
 2. File > Scripts > Other Script... > choose this file.
 3. Choose the groups to measure, then click "Vẽ kích thước".

 OUTPUT
 - Editable dimension vectors: horizontal and vertical dimension lines,
   extension lines, triangular arrowheads and live text labels.
 - 1 group per measured item, on layer "__BG_AUTO_DIMENSIONS__".
 - Measurements are based on axis-aligned bounding rectangles, not
   slanted edges. Re-run to refresh after changing source artwork.
 - Does NOT produce native Illustrator Dimension Tool objects.
*/

(function () {
    if (app.documents.length === 0) {
        alert("Hãy mở tài liệu Illustrator trước khi chạy script.");
        return;
    }

    var doc = app.activeDocument;
    var source = [];
    var rawSelection = doc.selection;
    if (!rawSelection || rawSelection.length === 0) {
        alert("Hãy chọn Group hoặc đối tượng cần đo kích thước.");
        return;
    }
    for (var s = 0; s < rawSelection.length; s++) source.push(rawSelection[s]);

    var LAYER_NAME = "__BG_AUTO_DIMENSIONS__";
    var TAG = "AUTO_DIMENSION_GROUPS_V2";
    var MM_TO_PT = 72 / 25.4;
    var PT_TO_MM = 25.4 / 72;

    // ---------- Input / dialog ----------
    var w = new Window("dialog", "TỰ ĐỘNG GHI KÍCH THƯỚC GROUP | AI 2024");
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];
    w.spacing = 9;
    w.margins = 16;

    var scopePanel = w.add("panel", undefined, "Đối tượng cần ghi kích thước");
    scopePanel.orientation = "column";
    scopePanel.alignChildren = "left";
    scopePanel.margins = 12;
    var includeDirect = scopePanel.add("checkbox", undefined, "Đo các Group con trực tiếp bên trong Group đã chọn");
    includeDirect.value = true;
    var includeNested = scopePanel.add("checkbox", undefined, "Đo thêm Group lồng nhiều cấp");
    includeNested.value = false;
    var includeParent = scopePanel.add("checkbox", undefined, "Đo cả Group cha đang được chọn");
    includeParent.value = false;

    var layoutPanel = w.add("panel", undefined, "Kiểu đường kích thước");
    layoutPanel.orientation = "column";
    layoutPanel.alignChildren = ["fill", "top"];
    layoutPanel.margins = 12;
    var row1 = layoutPanel.add("group");
    row1.add("statictext", undefined, "Đơn vị:");
    var unitList = row1.add("dropdownlist", undefined, ["mm", "cm"]);
    unitList.selection = 0;
    row1.add("statictext", undefined, "Số lẻ:");
    var decimalList = row1.add("dropdownlist", undefined, ["0", "1", "2"]);
    decimalList.selection = 1;
    row1.add("statictext", undefined, "Tỷ lệ đo 1:");
    var ratioInput = row1.add("edittext", undefined, "1");
    ratioInput.characters = 5;

    var row2 = layoutPanel.add("group");
    row2.add("statictext", undefined, "Cách vật (mm):");
    var offsetInput = row2.add("edittext", undefined, "6");
    offsetInput.characters = 5;
    row2.add("statictext", undefined, "Cỡ chữ (pt):");
    var fontInput = row2.add("edittext", undefined, "9");
    fontInput.characters = 5;
    row2.add("statictext", undefined, "Nét (pt):");
    var strokeInput = row2.add("edittext", undefined, "0.6");
    strokeInput.characters = 5;

    var row3 = layoutPanel.add("group");
    row3.add("statictext", undefined, "Ngang:");
    var hPosList = row3.add("dropdownlist", undefined, ["Phía trên", "Phía dưới"]);
    hPosList.selection = 0;
    row3.add("statictext", undefined, "Dọc:");
    var vPosList = row3.add("dropdownlist", undefined, ["Bên phải", "Bên trái"]);
    vPosList.selection = 0;
    row3.add("statictext", undefined, "Màu:");
    var colorList = row3.add("dropdownlist", undefined, ["Xanh đậm", "Đen", "Đỏ"]);
    colorList.selection = 0;

    var strokeBox = layoutPanel.add("checkbox", undefined, "Tính cả độ dày nét viền (visible bounds)");
    strokeBox.value = false;
    var replaceBox = layoutPanel.add("checkbox", undefined, "Xóa các kích thước do script tạo ở lần chạy trước");
    replaceBox.value = true;

    w.add("statictext", undefined, "Group không có Group con sẽ được đo trực tiếp.");
    w.add("statictext", undefined, "Đường đo là vector thường; chạy lại script khi sản phẩm thay đổi.");
    var actions = w.add("group");
    actions.alignment = "right";
    var cancel = actions.add("button", undefined, "Hủy", {name:"cancel"});
    var run = actions.add("button", undefined, "Vẽ kích thước", {name:"ok"});
    if (w.show() !== 1) return;

    function parseNumber(field) {
        // Accept either "6.5" or "6,5" (Vietnamese decimal separator).
        var value = parseFloat(String(field.text).replace(/,/g, "."));
        return value;
    }
    var options = {
        direct: includeDirect.value,
        nested: includeNested.value,
        parent: includeParent.value,
        unit: unitList.selection ? unitList.selection.text : "mm",
        decimals: decimalList.selection ? parseInt(decimalList.selection.text,10) : 1,
        ratio: parseNumber(ratioInput),
        offset: parseNumber(offsetInput) * MM_TO_PT,
        fontSize: parseNumber(fontInput),
        strokeWidth: parseNumber(strokeInput),
        hSide: (hPosList.selection && hPosList.selection.index === 1) ? -1 : 1,
        vSide: (vPosList.selection && vPosList.selection.index === 1) ? -1 : 1,
        color: colorList.selection ? colorList.selection.index : 0,
        withStroke: strokeBox.value,
        replace: replaceBox.value
    };
    if (!(options.ratio > 0 && options.ratio <= 100000) ||
        !(options.offset > 0 && options.offset <= 1000 * MM_TO_PT) ||
        !(options.fontSize >= 3 && options.fontSize <= 72) ||
        !(options.strokeWidth > 0 && options.strokeWidth <= 10)) {
        alert("Thông số không hợp lệ. Tỷ lệ > 0, cách vật > 0, cỡ chữ 3–72 pt, nét > 0 đến 10 pt.");
        return;
    }

    // ---------- Collect eligible source objects before changing document ----------
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
        try { return item.layer && item.layer.name === LAYER_NAME; }
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
        // Illustrator returns [left, top, right, bottom] in point coordinates.
        return {left: Math.min(b[0],b[2]), right: Math.max(b[0],b[2]),
                top: Math.max(b[1],b[3]), bottom: Math.min(b[1],b[3])};
    }
    function addTarget(item, depth) {
        if (shouldSkip(item) || alreadyAdded(item)) return;
        try {
            var b = boundsOf(item);
            if (!isFinite(b.left) || !isFinite(b.right) ||
                !isFinite(b.top) || !isFinite(b.bottom)) return;
            if (b.right - b.left < 0.01 || b.top - b.bottom < 0.01) return;
            targets.push({item: item, bounds: b, depth: depth});
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
            if (options.parent || (!options.direct && !options.nested) || item.groupItems.length === 0) addTarget(item, 0);
        } else {
            addTarget(item, 0);
        }
    }
    if (targets.length === 0) {
        alert("Không tìm thấy Group/đối tượng hợp lệ. Kiểm tra vùng chọn và tùy chọn đo Group cha.");
        return;
    }

    // Process narrower groups first; larger/outer groups take separate annotation lanes.
    targets.sort(function (a,b) {
        var areaA = (a.bounds.right-a.bounds.left)*(a.bounds.top-a.bounds.bottom);
        var areaB = (b.bounds.right-b.bounds.left)*(b.bounds.top-b.bounds.bottom);
        return areaA - areaB;
    });

    // ---------- Set up a dedicated, reusable layer ----------
    var dimensionLayer = null;
    try { dimensionLayer = doc.layers.getByName(LAYER_NAME); } catch (e) {}
    var madeLayer = false;
    if (!dimensionLayer) {
        dimensionLayer = doc.layers.add();
        dimensionLayer.name = LAYER_NAME;
        madeLayer = true;
    }
    var initialLock = dimensionLayer.locked;
    var initialVisible = dimensionLayer.visible;
    dimensionLayer.locked = false;
    dimensionLayer.visible = true;

    if (options.replace) {
        // Delete ONLY tagged groups produced by this script, not other artwork.
        for (i = dimensionLayer.groupItems.length - 1; i >= 0; i--) {
            var oldGroup = dimensionLayer.groupItems[i];
            try {
                if (oldGroup.note === TAG) oldGroup.remove();
            } catch (e) {}
        }
    }

    // ---------- Drawing helpers ----------
    function makeColor(index) {
        // CMYK colors for CMYK print documents; RGB for RGB documents.
        var isCmyk = false;
        try { isCmyk = (doc.documentColorSpace === DocumentColorSpace.CMYK); }
        catch (e) {}
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
    function line(group, x1,y1,x2,y2) {
        return path(group, [[x1,y1],[x2,y2]], false);
    }
    function arrow(group, tipX,tipY, dirX,dirY) {
        // Triangle points toward (dirX,dirY) from the triangle's base.
        var bx = tipX - dirX * arrowLen;
        var by = tipY - dirY * arrowLen;
        var px = -dirY * arrowHalf;
        var py = dirX * arrowHalf;
        return path(group, [[tipX,tipY],[bx+px,by+py],[bx-px,by-py]], true);
    }
    function label(ptValue) {
        var result = Math.abs(ptValue) * PT_TO_MM * options.ratio;
        if (options.unit === "cm") result /= 10;
        return result.toFixed(options.decimals) + " " + options.unit;
    }
    function textCentered(group, contents, targetX, targetY, rotation) {
        var tf = group.textFrames.add();
        // textFrames.add() already creates point text. TextFrame.kind is read-only.
        tf.contents = contents;
        tf.position = [0, 0];
        tf.textRange.characterAttributes.size = options.fontSize;
        tf.textRange.characterAttributes.fillColor = ink;
        // Do not require a specific system font; current default font is safe.
        if (rotation) tf.rotate(rotation);
        // Position using actual rendered bounds, independent of font metrics.
        var rect = tf.visibleBounds;
        var cx = (rect[0] + rect[2]) / 2;
        var cy = (rect[1] + rect[3]) / 2;
        tf.translate(targetX - cx, targetY - cy);
        return tf;
    }
    function textLength(tf, horizontal) {
        var b = tf.visibleBounds;
        return horizontal ? Math.abs(b[2]-b[0]) : Math.abs(b[1]-b[3]);
    }
    function intervalsOverlap(a,b,c,d,padding) {
        return a <= d+padding && c <= b+padding;
    }
    function chooseHorizontalY(left, right, top, bottom) {
        var side = options.hSide;
        var base = side > 0 ? top : bottom;
        var dist = options.offset;
        for (var iter=0; iter<300; iter++) {
            var y = base + side*dist;
            var collision = false;
            for (var t=0; t<hTracks.length; t++) {
                var tr = hTracks[t];
                if (intervalsOverlap(left,right,tr.start,tr.end,options.fontSize*0.75) &&
                    Math.abs(y-tr.coord) < options.fontSize * 1.9) {
                    collision = true; break;
                }
            }
            if (!collision) {
                hTracks.push({start:left,end:right,coord:y});
                return y;
            }
            dist += collisionStep;
        }
        return base + side*dist;
    }
    function chooseVerticalX(top, bottom, left, right) {
        var side = options.vSide;
        var base = side > 0 ? right : left;
        var dist = options.offset;
        for (var iter=0; iter<300; iter++) {
            var x = base + side*dist;
            var collision = false;
            for (var t=0; t<vTracks.length; t++) {
                var tr=vTracks[t];
                if (intervalsOverlap(bottom,top,tr.start,tr.end,options.fontSize*0.75) &&
                    Math.abs(x-tr.coord) < options.fontSize*1.9) {
                    collision=true;break;
                }
            }
            if (!collision) {
                vTracks.push({start:bottom,end:top,coord:x});
                return x;
            }
            dist += collisionStep;
        }
        return base + side*dist;
    }
    function drawHorizontal(group, b) {
        var x1 = b.left, x2 = b.right, mid=(x1+x2)/2;
        var y = chooseHorizontalY(x1,x2,b.top,b.bottom);
        var edge = options.hSide > 0 ? b.top : b.bottom;
        // 2 perpendicular extension lines, offset slightly away from artwork.
        var sy = edge + options.hSide * Math.min(2*MM_TO_PT,options.offset*0.33);
        var ey = y + options.hSide * beyond;
        line(group, x1,sy,x1,ey);
        line(group, x2,sy,x2,ey);

        var t = textCentered(group, label(x2-x1), mid, y, 0);
        var labelW = textLength(t,true);
        var minSpace = labelW + (2*arrowLen) + 10;
        if ((x2-x1) > minSpace) {
            var halfGap = labelW/2 + gap;
            line(group,x1,y,mid-halfGap,y);
            line(group,mid+halfGap,y,x2,y);
            arrow(group,x1,y,-1,0);
            arrow(group,x2,y,1,0);
        } else {
            // Very short measurement: keep the text above and arrows outside.
            t.translate(0,options.hSide * (options.fontSize + gap));
            var extra = arrowLen + 2;
            line(group,x1-extra,y,x2+extra,y);
            arrow(group,x1,y,1,0);
            arrow(group,x2,y,-1,0);
        }
    }
    function drawVertical(group, b) {
        var top=b.top, bottom=b.bottom, mid=(top+bottom)/2;
        var x=chooseVerticalX(top,bottom,b.left,b.right);
        var edge=options.vSide>0 ? b.right : b.left;
        var sx=edge + options.vSide * Math.min(2*MM_TO_PT,options.offset*0.33);
        var ex=x + options.vSide*beyond;
        line(group,sx,top,ex,top);
        line(group,sx,bottom,ex,bottom);

        // Vertical text reads bottom to top. The geometric bounds determine
        // exact centering even after rotation.
        var t=textCentered(group,label(top-bottom),x,mid,90);
        var labelH=textLength(t,false);
        var minSpace=labelH+(2*arrowLen)+10;
        if ((top-bottom)>minSpace) {
            var halfGap=labelH/2+gap;
            line(group,x,bottom,x,mid-halfGap);
            line(group,x,mid+halfGap,x,top);
            arrow(group,x,bottom,0,-1);
            arrow(group,x,top,0,1);
        } else {
            t.translate(options.vSide*(options.fontSize+gap),0);
            var extra=arrowLen+2;
            line(group,x,bottom-extra,x,top+extra);
            arrow(group,x,bottom,0,1);
            arrow(group,x,top,0,-1);
        }
    }

    // ---------- Render ----------
    var successes=0, fails=0;
    var firstError="";
    for (i=0; i<targets.length; i++) {
        var obj=targets[i];
        var container=null;
        try {
            container=dimensionLayer.groupItems.add();
            container.note=TAG;
            var originalName="";
            try { originalName=obj.item.name; } catch (ignore) {}
            container.name="DIM " + (originalName || obj.item.typename) + " [" + (i+1) + "]";
            drawHorizontal(container,obj.bounds);
            drawVertical(container,obj.bounds);
            successes++;
        } catch (e) {
            fails++;
            if (!firstError) firstError=String(e);
            try { if (container) container.remove(); } catch (e2) {}
        }
    }
    // Keep the dimension graphics visible and editable; source art untouched.
    // Re-select original objects where still possible.
    try {
        doc.selection = null;
        for (i=0; i<source.length; i++) {
            try { if (!inDimensionLayer(source[i])) source[i].selected=true; } catch (e) {}
        }
    } catch (e) {}
    if (!madeLayer && initialLock) dimensionLayer.locked=true;
    // A previously hidden dimension layer is shown intentionally so the user
    // can inspect the new annotations.
    try { app.redraw(); } catch (e) {}

    var message = "Đã vẽ kích thước: " + successes + " đối tượng.\n" +
                  "Layer: " + LAYER_NAME + "\n" +
                  "Ngang / dọc: " + options.unit + ", hệ số tỷ lệ 1:" + options.ratio + ".";
    if (fails) message += "\nKhông vẽ được: " + fails + ".\nLỗi đầu tiên: " + firstError;
    message += "\n\nLưu ý: Khi chỉnh sửa kích thước sản phẩm, hãy chạy lại script để cập nhật.";
    alert(message);
})();
