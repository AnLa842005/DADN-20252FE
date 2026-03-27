## System requirements + Use-cases

### Actors
- **User**: xem dashboard, điều khiển thiết bị
- **Device (Microbit)**: publish telemetry, nhận lệnh
- **IoT Gateway (Python)**: bridge serial ↔ MQTT
- **Backend (NestJS)**: subscribe/publish MQTT, lưu DB, cung cấp API

### Use-cases (chi tiết)

#### UC1: Xem dữ liệu sensor realtime
- **Trigger**: user mở dashboard
- **Main flow**:
  - Device gửi telemetry → Gateway publish MQTT → BE ingest & lưu Mongo
  - FE gọi BE lấy “latest” và/hoặc stream realtime
- **Post-condition**: user thấy giá trị mới nhất

#### UC2: Xem lịch sử theo khoảng thời gian
- **Trigger**: user chọn khoảng thời gian
- **Main flow**: FE gọi `GET /telemetry?type=...&from=...&to=...`
- **Post-condition**: render chart/table

#### UC3: Điều khiển bơm
- **Trigger**: user bật/tắt bơm
- **Main flow**:
  - FE gọi `POST /commands/pump`
  - BE publish feed `pump`
  - Gateway subscribe feed `pump` → gửi serial `PUMP:<payload>` xuống Microbit
- **Post-condition**: bơm thay đổi trạng thái, log được ghi nhận

#### UC4: Điều khiển RGB
- Giống UC3, với `POST /commands/rgb` và serial `RGB:<payload>`

#### UC5: Cảnh báo vượt ngưỡng
- **Trigger**: telemetry mới tới
- **Main flow**:
  - BE so sánh với threshold config
  - tạo alert record / notification (mở rộng)
- **Post-condition**: alert được lưu & hiển thị

### Yêu cầu phi chức năng (đo được)
- **Realtime latency**: < 2s (device → UI)
- **Uptime**: gateway reconnect MQTT tự động
- **Data retention**: lưu telemetry tối thiểu 7 ngày (cấu hình)
- **Security**: credential Adafruit IO trong `.env`, không commit

