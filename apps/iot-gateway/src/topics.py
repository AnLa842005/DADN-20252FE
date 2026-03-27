from __future__ import annotations

from typing import Literal

LogicalFeedKey = Literal[
    "temp",
    "air_humidity",
    "soil_humidity",
    "light",
    "fan",
    "pump",
    "speaker",
    "rgb",
    "status",
    "stream",
]


def logical_key_to_feed_key(key: LogicalFeedKey) -> str:
    import os

    defaults = {
        "temp": os.getenv("FEED_TEMP_KEY", "yolo-farm-temp"),
        "air_humidity": os.getenv("FEED_AIR_HUMIDITY_KEY", "yolo-farm-air-humidity"),
        "soil_humidity": os.getenv("FEED_SOIL_HUMIDITY_KEY", "yolo-farm-soil-humidity"),
        "light": os.getenv("FEED_LIGHT_KEY", "yolo-farm-light"),
        "fan": os.getenv("FEED_FAN_KEY", "yolo-farm-fan"),
        "pump": os.getenv("FEED_PUMP_KEY", "yolo-farm-pump"),
        "speaker": os.getenv("FEED_SPEAKER_KEY", "yolo-farm-speaker"),
        "rgb": os.getenv("FEED_RGB_KEY", "yolo-farm-rgb"),
        "status": os.getenv("FEED_STATUS_KEY", "yolo-farm-status"),
        "stream": os.getenv("FEED_STREAM_KEY", "yolo-farm-stream"),
    }
    return defaults[key]


def adafruit_topic(key: LogicalFeedKey) -> str:
    import os

    username = os.getenv("ADAFRUIT_IO_USERNAME", "").strip()
    feed_key = logical_key_to_feed_key(key)
    return f"{username}/feeds/{feed_key}"


def parse_keys_csv(raw: str, allowed: list[LogicalFeedKey]) -> list[LogicalFeedKey]:
    keys = [k.strip() for k in (raw or "").split(",") if k.strip()]
    out: list[LogicalFeedKey] = []
    for k in keys:
        if k in allowed:
            out.append(k)  # type: ignore[arg-type]
    return out

