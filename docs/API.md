# YOLO Farm Backend API

Tài liệu API cho backend NestJS (`http://localhost:3001`).

## Base URL

- Local: `http://localhost:3001`

## Auth

- Hiện tại chưa bật auth/JWT cho API.

## Data Types

### Telemetry Type

- `temp`
- `air_humidity`
- `soil_humidity`
- `light`
- `fan`
- `pump`
- `speaker`
- `rgb`
- `status`
- `stream`

### Toggle Value

- `ON`
- `OFF`
- `1`
- `0`

---

## 1) Health

### GET `/health`

Kiểm tra backend đang chạy.

**Response (200)**

```json
{
  "ok": true,
  "ts": "2026-03-27T16:00:00.000Z"
}
```

---

## 2) Telemetry

### GET `/telemetry/latest`

Lấy bản ghi telemetry mới nhất (toàn bộ hoặc theo `type`).

**Query params**

- `type` (optional): một giá trị trong Telemetry Type

**Ví dụ**

- `/telemetry/latest`
- `/telemetry/latest?type=soil_humidity`

**Response (200)**

```json
{
  "_id": "67e57b...",
  "type": "soil_humidity",
  "feedKey": "soil-humidity",
  "topic": "QuocTu2405/feeds/soil-humidity",
  "raw": "40",
  "numericValue": 40,
  "thresholdLevel": "normal",
  "receivedAt": "2026-03-27T16:05:22.000Z",
  "createdAt": "2026-03-27T16:05:22.100Z",
  "updatedAt": "2026-03-27T16:05:22.100Z"
}
```

Nếu chưa có dữ liệu phù hợp, có thể trả `null`.

### GET `/telemetry`

Lấy danh sách telemetry (tối đa 1000 records, sort mới nhất trước).

**Query params**

- `type` (optional)
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)

**Ví dụ**

- `/telemetry?type=temp`
- `/telemetry?type=air_humidity&from=2026-03-27T00:00:00.000Z&to=2026-03-27T23:59:59.999Z`

**Response (200)**

```json
[
  {
    "_id": "67e57b...",
    "type": "temp",
    "feedKey": "temperature",
    "raw": "39",
    "numericValue": 39,
    "thresholdLevel": "normal",
    "receivedAt": "2026-03-27T16:10:10.000Z"
  }
]
```

### GET `/alerts`

Lấy danh sách alert threshold mới nhất (mức `low`/`high` của sensor).

**Response (200)**

```json
[
  {
    "_id": "67e57c...",
    "type": "temp",
    "level": "high",
    "value": 41,
    "feedKey": "temperature",
    "topic": "QuocTu2405/feeds/temperature",
    "triggeredAt": "2026-03-27T16:20:00.000Z"
  }
]
```

---

## 3) Commands (Device Control)

### Header hỗ trợ idempotency

Tất cả command endpoint đều hỗ trợ header:

- `Idempotency-Key: <unique-string>`

Nếu gửi lại cùng key, backend sẽ trả kết quả deduplicated, không publish lặp.

### POST `/commands/fan`

**Body**

```json
{ "value": "ON" }
```

### POST `/commands/pump`

**Body**

```json
{ "value": "OFF" }
```

### POST `/commands/speaker`

**Body**

```json
{ "value": "ON" }
```

### POST `/commands/rgb`

**Body**

```json
{ "r": 28, "g": 102, "b": 238, "format": "csv" }
```

hoặc

```json
{ "r": 28, "g": 102, "b": 238, "format": "json" }
```

### Response command thành công (200)

```json
{
  "ok": true,
  "commandId": "3a3e8cf1-57dc-4f3f-83af-5a76a6f7be93",
  "status": "sent"
}
```

### Response deduplicated (200)

```json
{
  "ok": true,
  "deduplicated": true,
  "command": {
    "commandId": "3a3e8cf1-57dc-4f3f-83af-5a76a6f7be93",
    "target": "fan",
    "payload": "ON",
    "status": "sent"
  }
}
```

### GET `/commands/logs`

Danh sách command log mới nhất (`sent` / `acked` / `failed`).

**Response (200)**

```json
[
  {
    "_id": "67e57d...",
    "commandId": "3a3e8cf1-57dc-4f3f-83af-5a76a6f7be93",
    "target": "fan",
    "payload": "ON",
    "status": "acked",
    "ackPayload": "ACK:3a3e8cf1-57dc-4f3f-83af-5a76a6f7be93",
    "issuedAt": "2026-03-27T16:30:00.000Z",
    "ackedAt": "2026-03-27T16:30:02.000Z"
  }
]
```

---

## 4) Realtime SSE (for FE)

### GET `/realtime/telemetry`

Server-Sent Events stream realtime telemetry.

**Query params**

- `type` (optional): lọc theo telemetry type

**Ví dụ**

- `/realtime/telemetry`
- `/realtime/telemetry?type=temp`

**Event format**

```
event: telemetry
data: {"type":"temp","feedKey":"temperature","topic":"QuocTu2405/feeds/temperature","raw":"39","numericValue":39,"thresholdLevel":"normal","receivedAt":"2026-03-27T16:35:10.000Z"}
```

---

## 5) Error Responses

### 404 Not Found

Ví dụ gọi sai URL:

```json
{
  "message": "Cannot GET /telemetry/type=soil_humidity",
  "error": "Not Found",
  "statusCode": 404
}
```

### 400 Validation Error

Ví dụ RGB sai range:

```json
{
  "statusCode": 400,
  "message": [
    "r must not be greater than 255"
  ],
  "error": "Bad Request"
}
```

---

## 6) Quick Postman Checklist

- `GET /health` -> `ok: true`
- `POST /commands/fan` -> feed `fan` trên Adafruit có điểm mới
- `GET /telemetry/latest?type=soil_humidity` -> có record sau khi feed `soil-humidity` nhận data
- `GET /alerts` -> có alert khi sensor vượt ngưỡng
- `GET /commands/logs` -> thấy trạng thái `sent/acked/failed`

