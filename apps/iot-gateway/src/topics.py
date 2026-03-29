from __future__ import annotations

import os
from typing import Literal, TypeAlias, get_args

LogicalFeedKey: TypeAlias = Literal[
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

ALL_LOGICAL_KEYS: list[LogicalFeedKey] = list(get_args(LogicalFeedKey))

FEED_KEY_MAPPING: dict[LogicalFeedKey, tuple[str, str]] = {
    "temp": ("FEED_TEMP_KEY", "yolo-farm-temp"),
    "air_humidity": ("FEED_AIR_HUMIDITY_KEY", "yolo-farm-air-humidity"),
    "soil_humidity": ("FEED_SOIL_HUMIDITY_KEY", "yolo-farm-soil-humidity"),
    "light": ("FEED_LIGHT_KEY", "yolo-farm-light"),
    "fan": ("FEED_FAN_KEY", "yolo-farm-fan"),
    "pump": ("FEED_PUMP_KEY", "yolo-farm-pump"),
    "speaker": ("FEED_SPEAKER_KEY", "yolo-farm-speaker"),
    "rgb": ("FEED_RGB_KEY", "yolo-farm-rgb"),
    "status": ("FEED_STATUS_KEY", "yolo-farm-status"),
    "stream": ("FEED_STREAM_KEY", "yolo-farm-stream"),
}


def get_feed_key(logical_key: LogicalFeedKey) -> str:
    """
    Gets the specific Adafruit IO feed key for a given logical key.
    It reads from an environment variable, falling back to a default if not set.
    """
    env_var_name, default_value = FEED_KEY_MAPPING[logical_key]
    return os.getenv(env_var_name, default_value).strip()


def adafruit_topic(logical_key: LogicalFeedKey) -> str:
    """
    Constructs the full MQTT topic string for a given logical key to be used with Adafruit IO.
    Format: <username>/feeds/<feed_key>
    """
    username = os.getenv("ADAFRUIT_IO_USERNAME", "").strip()
    feed_key = get_feed_key(logical_key)
    return f"{username}/feeds/{feed_key}"


def parse_keys_csv(
    csv_string: str | None, allowed_keys: list[LogicalFeedKey]
) -> list[LogicalFeedKey]:
    """
    Parses a comma-separated string of logical keys, validates them against a list
    of allowed keys, and returns a clean list.
    """
    if not csv_string:
        return []

    keys_from_csv = {key.strip().lower() for key in csv_string.split(",")}

    # Filter to ensure only allowed keys are returned.
    valid_keys = [
        key for key in allowed_keys if key in keys_from_csv
    ]

    return valid_keys  # type: ignore[return-value]
