from __future__ import annotations

import os
import ssl
import time
from dataclasses import dataclass
from typing import Callable

from paho.mqtt.client import Client as PahoClient  # type: ignore[import-untyped]

from topics import LogicalFeedKey, adafruit_topic, parse_keys_csv


@dataclass(frozen=True)
class MqttConfig:
    broker: str
    port: int
    use_tls: bool
    username: str
    key: str
    subscribe: list[LogicalFeedKey]


def load_mqtt_config() -> MqttConfig:
    broker = os.getenv("ADAFRUIT_IO_BROKER", "io.adafruit.com")
    port = int(os.getenv("ADAFRUIT_IO_PORT", "1883"))
    use_tls = os.getenv("ADAFRUIT_IO_USE_TLS", "false").lower() == "true"
    username = os.getenv("ADAFRUIT_IO_USERNAME", "").strip()
    key = os.getenv("ADAFRUIT_IO_KEY", "").strip()
    subscribe = parse_keys_csv(
        os.getenv("GATEWAY_SUBSCRIBE_FEEDS", "fan,pump,speaker,rgb,status,stream"),
        [
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
        ],
    )
    return MqttConfig(
        broker=broker,
        port=port,
        use_tls=use_tls,
        username=username,
        key=key,
        subscribe=subscribe,
    )


class MqttClient:
    def __init__(self, cfg: MqttConfig, on_message: Callable[[str, str], None]) -> None:
        self._cfg = cfg
        self._on_message = on_message
        self._client = PahoClient(client_id=f"yolo-farm-gateway-{int(time.time())}")
        self._client.username_pw_set(cfg.username, cfg.key)
        self._client.on_connect = self._handle_connect
        self._client.on_message = self._handle_message

        if cfg.use_tls:
            self._client.tls_set(cert_reqs=ssl.CERT_REQUIRED)

    def connect(self) -> None:
        if not self._cfg.username or not self._cfg.key:
            raise RuntimeError("Missing ADAFRUIT_IO_USERNAME / ADAFRUIT_IO_KEY")
        self._client.connect(self._cfg.broker, self._cfg.port, keepalive=30)
        self._client.loop_start()

    def disconnect(self) -> None:
        try:
            self._client.loop_stop()
        finally:
            try:
                self._client.disconnect()
            except Exception:
                pass

    def publish(self, key: LogicalFeedKey, value: str) -> None:
        topic = adafruit_topic(key)
        self._client.publish(topic, payload=value, qos=0, retain=False)

    def _handle_connect(self, client, userdata, flags, rc, properties=None) -> None:  # noqa: ANN001
        if rc != 0:
            raise RuntimeError(f"MQTT connect failed rc={rc}")
        topics = [adafruit_topic(k) for k in self._cfg.subscribe]
        for t in topics:
            client.subscribe(t, qos=0)

    def _handle_message(self, client, userdata, msg) -> None:  # noqa: ANN001
        topic = str(msg.topic)
        payload = msg.payload.decode("utf-8", errors="replace")
        self._on_message(topic, payload)

