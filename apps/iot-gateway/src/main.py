from __future__ import annotations

import os
import signal
import sys
import time

from pathlib import Path

from dotenv import load_dotenv

from mqtt_client import MqttClient, load_mqtt_config
from serial_bridge import SerialBridge
from topics import (
    ALL_LOGICAL_KEYS,
    LogicalFeedKey,
    get_feed_key,
    parse_keys_csv,
)


REVERSE_FEED_KEY_MAPPING = {get_feed_key(lk): lk for lk in ALL_LOGICAL_KEYS}


def resolve_logical_from_feed(topic: str) -> LogicalFeedKey | None:
    username = os.getenv("ADAFRUIT_IO_USERNAME", "").strip()
    prefix = f"{username}/feeds/"
    if not topic.startswith(prefix):
        return None
    feed_key_from_topic = topic[len(prefix) :]
    return REVERSE_FEED_KEY_MAPPING.get(feed_key_from_topic)


def main() -> int:
    root_env = Path(__file__).resolve().parents[3] / ".env"
    load_dotenv(dotenv_path=root_env)

    serial_port = os.getenv("SERIAL_PORT", "").strip()
    serial_baud = int(os.getenv("SERIAL_BAUD", "115200"))
    if not serial_port:
        print("Missing SERIAL_PORT in .env", file=sys.stderr)
        return 2

    publish_keys = parse_keys_csv(
        os.getenv("GATEWAY_PUBLISH_FEEDS", "temp,air_humidity,soil_humidity,light,status,stream"),
        ALL_LOGICAL_KEYS,
    )

    bridge = SerialBridge(port=serial_port, baud=serial_baud)

    def on_mqtt_message(topic: str, payload: str) -> None:
        logical = resolve_logical_from_feed(topic)
        if logical == "fan":
            bridge.write_line(f"FAN:{payload}")
        elif logical == "pump":
            bridge.write_line(f"PUMP:{payload}")
        elif logical == "speaker":
            bridge.write_line(f"SPEAKER:{payload}")
        elif logical == "rgb":
            bridge.write_line(f"RGB:{payload}")
        elif logical == "status":
            bridge.write_line(f"STATUS:{payload}")

    mqtt_cfg = load_mqtt_config()
    client = MqttClient(mqtt_cfg, on_message=on_mqtt_message)

    stop = False

    def _handle_stop(_sig, _frame) -> None:  # noqa: ANN001
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)

    bridge.start()
    client.connect()

    q = bridge.read_queue()
    try:
        while not stop:
            try:
                item = q.get(timeout=0.5)
            except Exception:
                continue

            # map microbit keys to logical keys directly
            key = item.key.strip().lower()
            if key not in publish_keys:
                continue

            client.publish(key, item.value)  # type: ignore[arg-type]
    finally:
        client.disconnect()
        bridge.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
