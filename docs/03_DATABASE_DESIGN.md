## Database design (MongoDB)

### Collection: telemetry
- **Mục đích**: lưu mọi message ingest từ MQTT (sensor + trạng thái actuator nếu có)
- **Fields** (đã có trong BE):
  - `type`: `temp|humi|light|pump|rgb`
  - `feedKey`, `topic`
  - `raw`
  - `numericValue?`
  - `receivedAt`

### Collection đề xuất (mở rộng)

#### command_logs
- **Mục đích**: audit điều khiển thiết bị
- Fields:
  - `target`: `pump|rgb`
  - `payload`
  - `requestedBy?` (userId)
  - `ts`
  - `status`: `sent|failed|acked?`

#### thresholds
- **Mục đích**: cấu hình ngưỡng
- Fields:
  - `type`: `temp|humi|light`
  - `min?`, `max?`
  - `enabled`

#### alerts
- **Mục đích**: lưu cảnh báo vượt ngưỡng
- Fields:
  - `type`, `value`, `threshold`, `ts`, `resolved?`

