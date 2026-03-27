## Checklist (code: BE + IoT gateway)

### Module demo bắt buộc

- **Module 1**: Nhận và hiển thị dữ liệu từ thiết bị  
  - BE: `GET /telemetry/latest`, `GET /telemetry`  
  - Gateway: đọc serial → publish MQTT → BE subscribe & lưu Mongo

- **Module 2**: Kiểm tra dữ liệu vượt ngưỡng  
  - (sẽ làm ở BE: rule/threshold + cảnh báo/log)

- **Module 3**: Điều khiển thiết bị  
  - BE: `POST /commands/fan`, `POST /commands/pump`, `POST /commands/speaker`, `POST /commands/rgb` → publish MQTT  
  - Gateway: subscribe `fan/pump/speaker/rgb` → forward xuống serial cho Microbit

- **Module 4**: Ghi nhận hoạt động  
  - BE: lưu `Telemetry` + (sẽ thêm) `CommandLog` / audit log

- **Module 5**: Ứng dụng Web/Mobile  
  - FE đợi Figma (đã tách riêng)

### Mốc theo tuần (phần có thể “làm trong code”)

- **Tuần 3**: IoT Gateway Python + System requirement/use-case (docs)  
- **Tuần 5**: DB design + hoàn thiện tích hợp Microbit  
- **Tuần 6**: Kết nối CSDL + điều khiển thiết bị thật end-to-end

