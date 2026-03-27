# YOLO Farm (IoT)

## Backend (NestJS)

- Copy env:
  - `.env.example` → `.env` (ở root) và điền credential
- Run:
  - `npm install`
  - `npm run dev:backend`

### Endpoints

- `GET /health`
- `GET /telemetry/latest?type=temp|air_humidity|soil_humidity|light|fan|pump|speaker|rgb|status|stream`
- `GET /telemetry?type=...&from=ISO8601&to=ISO8601`
- `GET /alerts`
- `POST /commands/fan` body: `{ "value": "ON" | "OFF" | "1" | "0" }`
- `POST /commands/pump` body: `{ "value": "ON" | "OFF" | "1" | "0" }`
- `POST /commands/speaker` body: `{ "value": "ON" | "OFF" | "1" | "0" }`
- `POST /commands/rgb` body: `{ "r":0-255, "g":0-255, "b":0-255, "format"?: "csv"|"json" }`
- `GET /commands/logs`
- `GET /realtime/telemetry` (SSE)

## API Document

- Xem chi tiết tại `docs/API.md`.

## IoT Gateway (Python)

Xem `apps/iot-gateway/README.md`.

