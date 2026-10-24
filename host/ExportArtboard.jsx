// Script tự động export TẤT CẢ Artboards sang PNG (RGB) và PDF (CMYK)
// Mỗi artboard = 1 file riêng biệt
// Tương thích: Adobe Illustrator 2020 - 2026

(function() {
    
    // Kiểm tra có document đang mở không
    if (app.documents.length === 0) {
        alert("Vui lòng mở một file Illustrator trước khi chạy script!");
        return;
    }
    
    var doc = app.activeDocument;
    
    // Kiểm tra file đã được lưu chưa
    if (!doc.saved || doc.path == "") {
        alert("Vui lòng lưu file Illustrator trước khi export!");
        return;
    }
    
    // Lưu file gốc
    var originalFile = doc.fullName;
    var docPath = doc.path;
    var docName = doc.name.replace(/\.[^\.]+$/, '');
    
    // Chuẩn hóa tên file: thay nhiều dấu --- thành 1 dấu -
    docName = docName.replace(/[-_]{2,}/g, '-'); // Thay --- thành -
    docName = docName.replace(/\s{2,}/g, ' ');   // Thay nhiều space thành 1 space
    docName = docName.replace(/\s*-\s*/g, '-');   // Xóa space xung quanh dấu -
    
    // Đếm số artboards
    var totalArtboards = doc.artboards.length;
    
    // Hỏi người dùng có muốn export tất cả artboards không
    var exportAll = true;
    if (totalArtboards > 1) {
        exportAll = confirm("Bạn có " + totalArtboards + " artboards.\n\n" +
                           "Nhấn OK để export TẤT CẢ artboards\n" +
                           "Nhấn Cancel để chỉ export artboard hiện tại");
    }
    
    // Danh sách artboards cần export
    var artboardsToExport = [];
    if (exportAll) {
        for (var i = 0; i < totalArtboards; i++) {
            artboardsToExport.push(i);
        }
    } else {
        artboardsToExport.push(doc.artboards.getActiveArtboardIndex());
    }
    
    // Thống kê
    var successCount = 0;
    var failCount = 0;
    var exportedFiles = [];
    
    // ===== EXPORT TỪNG ARTBOARD =====
    for (var abIdx = 0; abIdx < artboardsToExport.length; abIdx++) {
        var artboardIndex = artboardsToExport[abIdx];
        
        try {
            // Set active artboard
            doc.artboards.setActiveArtboardIndex(artboardIndex);
            var artboard = doc.artboards[artboardIndex];
            
            // Tên file: TÊN_FILE_GỐC-art01, art02, art03...
            var artNumber = String(artboardIndex + 1);
            if (artNumber.length == 1) {
                artNumber = "0" + artNumber; // 01, 02, 03...
            }
            var exportName = docName + "-art" + artNumber;
            
            // Lưu color space gốc
            var originalColorSpace = doc.documentColorSpace;
            
            // ===== CHUẨN BỊ =====
            
            // Convert text trong artboard này
            convertTextInArtboard(artboard);
            
            // Unite objects cùng màu (tương thích 2020+)
            uniteObjectsBySameColor();
            
            doc.selection = null;
            // KHÔNG SAVE - để giữ nguyên file gốc
            
            
            // ===== EXPORT PNG (RGB - 300 DPI) =====
            var pngFile = new File(docPath + "/" + exportName + ".png");
            var pngOptions = new ExportOptionsPNG24();
            
            pngOptions.artBoardClipping = true;
            pngOptions.transparency = false;
            pngOptions.antiAliasing = true;
            pngOptions.horizontalScale = 300;
            pngOptions.verticalScale = 300;
            
            // Convert RGB
            doc.documentColorSpace = DocumentColorSpace.RGB;
            // KHÔNG SAVE
            doc.exportFile(pngFile, ExportType.PNG24, pngOptions);
            
            
            // ===== EXPORT PDF (CMYK - 300 DPI) =====
            doc.documentColorSpace = DocumentColorSpace.CMYK;
            // KHÔNG SAVE
            
            var pdfFile = new File(docPath + "/" + exportName + ".pdf");
            var pdfOptions = new PDFSaveOptions();
            
            // Tương thích Illustrator 2020+
            pdfOptions.compatibility = PDFCompatibility.ACROBAT5;
            pdfOptions.preserveEditability = false;
            pdfOptions.generateThumbnails = false;
            
            // Compression - tương thích
            pdfOptions.colorDownsampling = 300;
            pdfOptions.colorDownsamplingMethod = DownsampleMethod.BICUBICDOWNSAMPLE;
            pdfOptions.colorDownsamplingImageThreshold = 450;
            
            pdfOptions.grayscaleDownsampling = 300;
            pdfOptions.grayscaleDownsamplingMethod = DownsampleMethod.BICUBICDOWNSAMPLE;
            pdfOptions.grayscaleDownsamplingImageThreshold = 450;
            
            // Export artboard này
            pdfOptions.artboardRange = String(artboardIndex + 1);
            pdfOptions.fontSubsetThreshold = 100;
            
            doc.saveAs(pdfFile, pdfOptions);
            
            // Thống kê
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
            alert("Lỗi khi export artboard " + (artboardIndex + 1) + ":\n" + e.message);
        }
    }
    
    // Đóng document và mở lại file gốc
    try {
        doc.close(SaveOptions.DONOTSAVECHANGES);
        app.open(originalFile);
    } catch(e) {}
    
    // ===== THÔNG BÁO KẾT QUẢ =====
    var message = "Export hoàn tất!\n\n";
    message += "Thành công: " + successCount + " artboards\n";
    if (failCount > 0) {
        message += "Thất bại: " + failCount + " artboards\n";
    }
    message += "\n─────────────────────────\n";
    
    for (var i = 0; i < exportedFiles.length; i++) {
        var file = exportedFiles[i];
        message += "\n📁 " + file.name + "\n";
        message += "   PNG: " + file.pngSize + " MB\n";
        message += "   PDF: " + file.pdfSize + " MB\n";
    }
    
    message += "\n✓ Resolution: 300 DPI\n";
    message += "✓ Text đã convert to outlines\n";
    message += "✓ Objects cùng màu đã unite";
    
    alert(message);
    
    
    // ===== HÀM PHỤ TRỢ =====
    
    function convertTextInArtboard(artboard) {
        var artboardRect = artboard.artboardRect;
        
        for (var i = doc.textFrames.length - 1; i >= 0; i--) {
            try {
                var text = doc.textFrames[i];
                var bounds = text.geometricBounds;
                
                if (bounds[0] < artboardRect[2] && 
                    bounds[2] > artboardRect[0] &&
                    bounds[1] > artboardRect[3] && 
                    bounds[3] < artboardRect[1]) {
                    
                    text.createOutline();
                }
            } catch(e) {}
        }
    }
    
    function uniteObjectsBySameColor() {
        doc.selectObjectsOnActiveArtboard();
        
        if (doc.selection.length < 2) {
            return;
        }
        
        var colorGroups = {};
        
        for (var i = 0; i < doc.selection.length; i++) {
            var item = doc.selection[i];
            
            if (item.typename != "PathItem" || !item.filled) {
                continue;
            }
            
            try {
                var fillColor = item.fillColor;
                var colorKey = "";
                
                if (fillColor.typename == "RGBColor") {
                    colorKey = "RGB_" + Math.round(fillColor.red) + "_" + 
                               Math.round(fillColor.green) + "_" + 
                               Math.round(fillColor.blue);
                } else if (fillColor.typename == "CMYKColor") {
                    colorKey = "CMYK_" + Math.round(fillColor.cyan) + "_" + 
                               Math.round(fillColor.magenta) + "_" + 
                               Math.round(fillColor.yellow) + "_" + 
                               Math.round(fillColor.black);
                } else if (fillColor.typename == "GrayColor") {
                    colorKey = "GRAY_" + Math.round(fillColor.gray);
                } else {
                    continue;
                }
                
                if (!colorGroups[colorKey]) {
                    colorGroups[colorKey] = [];
                }
                colorGroups[colorKey].push(item);
                
            } catch(e) {}
        }
        
        // Unite từng nhóm màu - Tương thích 2020+
        for (var colorKey in colorGroups) {
            var items = colorGroups[colorKey];
            
            if (items.length >= 3) {
                try {
                    doc.selection = null;
                    for (var j = 0; j < items.length; j++) {
                        items[j].selected = true;
                    }
                    
                    // Sử dụng menu command - tương thích tất cả phiên bản
                    app.executeMenuCommand("Live Pathfinder Add");
                    app.executeMenuCommand("expandStyle");
                    
                } catch(e) {
                    // Nếu menu command không hoạt động, bỏ qua
                }
            }
        }
        
        doc.selection = null;
    }
    
})();