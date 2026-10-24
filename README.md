# Pannel TC - Adobe Illustrator 2024 Extension

Extension CEP dành cho **Adobe Illustrator 2024** (hỗ trợ CC 2020 đến 2024+).

---

## 1. Cấu trúc thư mục

```text
PannelTC/
├── CSXS/
│   └── manifest.xml          # Khai báo cấu hình Extension (Host: ILST v24.0-99.0)
├── client/
│   ├── css/
│   │   └── panel.css         # Giao diện hiện đại tông tối, hỗ trợ Accordion thu gọn
│   ├── js/
│   │   ├── bridge.js         # Cầu nối gọi ExtendScript qua CEP evalScript
│   │   └── panel.js          # Xử lý logic hiển thị và tương tác các công cụ
│   └── index.html            # Giao diện chính của Panel (chế độ Accordion)
├── host/
│   ├── illustrator.jsx       # Mã ExtendScript điều khiển Illustrator (ES3)
│   ├── DTF_AutoNest_A3 copy.jsx
│   ├── ExportArtboard.jsx
│   └── AutoDimensionGroups_Illustrator2024.jsx
├── templates/
│   ├── Xuong gom viet bat trang 1 mat.ait
│   ├── bat trang viet nam 1 mat.ait
│   └── day ko in 1 mat.ait
├── scripts/
│   ├── Install-Panel.ps1     # Script cài đặt tự động (hỗ trợ cả Junction và Copy dự phòng)
│   └── Uninstall-Panel.ps1   # Script gỡ cài đặt sạch sẽ
├── Install.cmd               # Double-click để cài đặt nhanh
├── Uninstall.cmd             # Double-click để gỡ cài đặt
└── README.md
```

---

## 2. Các công cụ tích hợp trong Pannel TC (v1.4)

> [!NOTE]
> **Chế độ thu gọn thông minh (Accordion Collapsible):** Tất cả các công cụ mặc định được thu gọn thành thanh tiêu đề gọn gàng. Người dùng cần dùng công cụ nào chỉ cần click vào thanh đó để mở rộng nội dung, giúp không gian làm việc luôn thoáng và tiện dụng.

### 🖨️ 1. Tạo File In (Template)
- **Mở nhanh bằng 1 click**:
  - **Gốm Bát Tràng**: `Xuong gom viet bat trang 1 mat.ait`
  - **Bát Tràng VN**: `bat trang viet nam 1 mat.ait`
  - **Đáy ko in**: `day ko in 1 mat.ait`
  - Nút `📁` duyệt file mẫu `.ait` tùy chọn.

### 🧩 2. Dàn Trang DTF A3 (DTF Auto Nesting)
- Hỗ trợ 2 chế độ linh hoạt: **Nhập số lượng tem DTF cần in** (tự động tạo thêm trang A3 mới khi vượt quá sức chứa của 1 trang) HOẶC **nhập số lượng trang A3 cần dàn kín** (Fill Full Sheet). Tối ưu diện tích bằng thuật toán Block Grid & MaxRects 2D Bin Packing.

### 📐 3. Ghi Kích Thước Group (Auto Dimension)
- Tự động đo và vẽ đường dóng, mũi tên, số đo vector chuẩn xác lên layer `__BG_AUTO_DIMENSIONS__` với **3 chức năng chuyên biệt**:
  1. **1. Kích thước tổng đối tượng**: Đo phủ bì bao quát toàn bộ vùng chọn (1 bộ kích thước tổng Ngang x Cao cho cả cụm đang chọn).
  2. **2. Kích thước từng Group cha**: Đo kích thước tổng của từng Group cha cấp ngoài cùng trong vùng chọn (mỗi Group cha 1 kích thước tổng riêng, không đo chi tiết con bên trong).
  3. **3. Group cha & con lồng nhau**: Đo chi tiết cả Group cha và đệ quy đo tất cả các Group con lồng nhau các cấp bên trong (tự động tính khoảng cách tránh đè nét).
- **Xóa layer kích thước**: Xóa sạch các đường kích thước cũ chỉ với 1 click.
- **Tùy chỉnh thông số**: Đơn vị (`mm`/`cm`), số lẻ, khoảng cách cách vật, cỡ chữ, độ dày nét, màu sắc, tính viền stroke...

### 📦 4. Xuất Bản File In (Export Artboards)
- Tự động convert text sang outlines, unite đối tượng cùng màu.
- Tùy chọn **"Tất cả Artboards"** hoặc **"Chỉ Artboard này"**.
- Xuất song song file **PNG (RGB - 300 DPI)** và **PDF (CMYK - 300 DPI)** cho từng artboard độc lập.
- Bảo toàn tuyệt đối file thiết kế gốc (tự động đóng tài liệu biến đổi và mở lại file gốc).

### 🔤 5. Đổi Chữ Theo Danh Sách (Data Merge / Variable)
- Giải pháp thay thế hoàn hảo, nhanh gấp 10 lần so với công cụ Variable XML phức tạp của Illustrator.
- **Cách dùng cực nhanh**:
  1. Quét chọn mẫu thiết kế (Logo + Chữ tên / chức danh / lời chúc / mã sản phẩm).
  2. Bấm **"🔍 Nhận diện mẫu"**: Hệ thống liệt kê các dòng text tìm thấy kèm nội dung xem trước và mở bảng công cụ.
  3. **Gán cột**: Với mỗi dòng chữ trong mẫu (Tên, Chức vụ, Lời chúc...), chọn dropdown gán vào Cột 1 (A), Cột 2 (B), Cột 3 (C)... hoặc `-- Giữ nguyên --` nếu không muốn đổi.
  4. **Nạp dữ liệu (Hỗ trợ cả CSV & Excel)**:
     - **Tải file CSV mẫu**: Bấm nút `📥 Tải file CSV mẫu` để tải file CSV có sẵn tiêu đề các cột tương ứng với mẫu thiết kế (hỗ trợ tiếng Việt UTF-8 BOM chuẩn cho Excel).
     - **Tải lên file CSV**: Điền danh sách vào file CSV rồi bấm `📤 Tải lên file CSV` (hệ thống tự động đọc và nạp vào danh sách).
     - **Hoặc dán trực tiếp**: Copy trực tiếp các cột từ Excel rồi paste vào ô danh sách.
  5. Chọn **Số cột dàn lưới** (ví dụ: 2 cột, 3 cột...). Hệ thống **tự động tính toán giãn cách 10mm** giữa các cột và hàng dựa trên kích thước thật của chữ mới, hoàn toàn không bị dính đè nhau.
  6. Bấm **"Tạo Danh Sách Tự Động"**: Hệ thống tự động nhân bản, đổi chữ chính xác theo từng cột và xếp lưới ngay ngắn!

### 📂 6. Mở Nhanh Thư Mục Dự Án (Windows Explorer)
- Mở trực tiếp thư mục bằng Windows Explorer với 1 click chuột (không tốn RAM, 0% CPU, chạy qua tiến trình native của Windows):
  - **Nút trên thanh trạng thái (Top Bar)**: Nút icon thư mục `[📂]` cạnh nút làm mới, bấm là mở ngay trình quản lý Windows Explorer (không cần mở file trước).
  - **Trong mục "Tài liệu hiện hành"**: Nút `Mở thư mục chứa file (.ai)` (mở đúng thư mục lưu file thiết kế đang làm việc, tự động nhắc lưu nếu chưa bấm `Ctrl + S`).
  - **Trong mục "Xuất bản file in"**: Nút `Mở thư mục file in` (mở ngay thư mục vừa xuất file PNG & PDF).

### 🚀 7. Tự Động Cập Nhật Qua GitHub (Auto-Updater)
- Giúp các máy nhân viên / máy khác tự động nhận code mới nhất khi bạn cập nhật code trên máy của bạn:
  1. **Bước 1**: Đẩy (Push) toàn bộ thư mục `PannelTC` lên một kho lưu trữ GitHub (ví dụ: `thiet/PannelTC`).
  2. **Bước 2**: Trên panel của các máy khác, mở mục *"Tài liệu hiện hành"* -> Nhập tên repo vào ô `GitHub Repo` (ví dụ `thiet/PannelTC`) rồi bấm **Lưu**.
  3. **Bước 3 (Khi bạn có bản cập nhật mới)**:
     - Trên máy bạn, chỉnh sửa tính năng, nâng số phiên bản trong file `version.json` (ví dụ từ `1.4.0` lên `1.4.1`) rồi `git push` lên GitHub.
     - Các máy khác khi mở panel sẽ **tự động hiện Banner màu tím**:  
       `🚀 Bản mới: v1.4.1 - [⚡ Cập nhật]`.
     - Người dùng chỉ việc bấm **"⚡ Cập nhật"**: Hệ thống tự động tải gói mới về, giải nén ghi đè và làm mới panel trong 3 giây!

---

## 3. Cách mở & ghim lên thanh công cụ Illustrator
1. Vào thanh menu Illustrator: `Window > Extensions > Pannel TC` (hoặc `Cửa sổ > Tiện ích mở rộng > Pannel TC`).
2. Kéo tab **Pannel TC** thả vào cột thanh panel bên phải để ghim cố định.
