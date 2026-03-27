## User requirements (tổng quan)

### Bối cảnh
- Hệ thống IoT cho nông trại mini: theo dõi môi trường và điều khiển thiết bị.

### Thiết bị
- **Input**: nhiệt độ, độ ẩm, ánh sáng
- **Output**: máy bơm, RGB

### Module tối thiểu (>= 5)
- **M1 Telemetry**: thu thập & hiển thị dữ liệu sensor realtime + lịch sử
- **M2 Threshold**: phát hiện vượt ngưỡng (nhiệt/ẩm/ánh sáng) và cảnh báo
- **M3 Control**: điều khiển bơm + RGB từ dashboard/web
- **M4 Logging/Audit**: ghi nhận hoạt động (telemetry + điều khiển)
- **M5 Web app**: dashboard người dùng (FE đợi Figma)

### Tích hợp cloud (Adafruit IO)
- Sensor/actuator map vào Adafruit IO feeds, giao tiếp qua MQTT.

