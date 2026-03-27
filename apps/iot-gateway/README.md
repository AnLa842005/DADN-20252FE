# IoT Gateway (Python)

Gateway bridge giữa Microbit (serial) ↔ Adafruit IO (MQTT).

## Setup

- Copy env (root):
  - `.env.example` → `.env` (ở thư mục root) và điền:
    - `ADAFRUIT_IO_USERNAME`, `ADAFRUIT_IO_KEY`
    - `SERIAL_PORT` (vd `COM3`)
    - `FEED_*_KEY`

## Run

```bash
cd apps/iot-gateway
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

## Microbit protocol (mặc định)

- Telemetry từ microbit (newline-delimited):
  - JSON: `{"temp":25.1,"humi":60,"light":123}`
  - hoặc CSV: `temp=25.1,humi=60,light=123`
- Command gửi xuống microbit:
  - Pump: `PUMP:<payload>`
  - RGB: `RGB:<payload>`

