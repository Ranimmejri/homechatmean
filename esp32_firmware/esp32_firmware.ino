/*
 * ESP32 — MQTT Sensor Publisher + Servo Subscriber
 *
 * Data flow:
 *   ESP32 publishes sensor JSON → MQTT broker → backend subscribes, filters → SSE → frontend
 *   Frontend POST /api/servo   → backend publishes MQTT command → ESP32 subscribes, moves servo
 *
 * Topics:
 *   PUBLISH  esp32/sensors        {"temperature":...,"humidity":...,"flame":...,"movement":...,"gas":...,"gas_alert":...}
 *   SUBSCRIBE esp32/servo/command  "open" | "close"
 *
 * Libraries (install via Arduino Library Manager):
 *   - PubSubClient   by Nick O'Leary
 *   - ArduinoJson    by Benoit Blanchon
 *   - ESP32Servo     by Kevin Harrington
 *   - DHT sensor library by Adafruit  +  Adafruit Unified Sensor
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT.h>

// ─── WiFi ─────────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ─── MQTT broker ──────────────────────────────────────────────────────────────
const char* MQTT_BROKER   = "192.168.1.x";   // your broker IP
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";              // leave empty if no auth
const char* MQTT_PASS     = "";
const char* CLIENT_ID     = "esp32-sensor-node";

// ─── MQTT topics ──────────────────────────────────────────────────────────────
const char* TOPIC_SENSORS = "esp32/sensors";
const char* TOPIC_SERVO   = "esp32/servo/command";

// ─── Pin assignments ──────────────────────────────────────────────────────────
#define DHT_PIN       4
#define DHT_TYPE      DHT22
#define FLAME_PIN     34    // active-LOW: LOW = flame detected
#define GAS_PIN       35    // analog MQ-2/MQ-5
#define 
  27    // PIR: HIGH = motion
#define SERVO_PIN     18

// ─── Thresholds ───────────────────────────────────────────────────────────────
#define GAS_ALERT_THRESHOLD  500    // raw ADC (0–4095)
#define SERVO_OPEN_ANGLE     90
#define SERVO_CLOSE_ANGLE    0
#define PUBLISH_INTERVAL_MS  2000   // publish every 2 s

// ─── Globals ──────────────────────────────────────────────────────────────────
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);
DHT          dht(DHT_PIN, DHT_TYPE);
Servo        doorServo;
unsigned long lastPublish = 0;

// ─── MQTT message callback (servo commands) ───────────────────────────────────
void onMqttMessage(const char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();

  if (String(topic) == TOPIC_SERVO) {
    if (msg == "open") {
      doorServo.write(SERVO_OPEN_ANGLE);
      Serial.println("[servo] opened");
    } else if (msg == "close") {
      doorServo.write(SERVO_CLOSE_ANGLE);
      Serial.println("[servo] closed");
    }
  }
}

// ─── WiFi connect ─────────────────────────────────────────────────────────────
void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[wifi] connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[wifi] connected: " + WiFi.localIP().toString());
}

// ─── MQTT connect / reconnect ─────────────────────────────────────────────────
void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("[mqtt] connecting…");
    bool ok = strlen(MQTT_USER)
      ? mqtt.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)
      : mqtt.connect(CLIENT_ID);

    if (ok) {
      Serial.println(" connected");
      mqtt.subscribe(TOPIC_SERVO, 1);
      Serial.println("[mqtt] subscribed to " + String(TOPIC_SERVO));
    } else {
      Serial.printf(" failed (rc=%d), retry in 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

// ─── Publish sensor data ──────────────────────────────────────────────────────
void publishSensors() {
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  bool  flame       = (digitalRead(FLAME_PIN) == LOW);
  bool  movement    = (digitalRead(MOVEMENT_PIN) == HIGH);
  int   gas         = analogRead(GAS_PIN);
  bool  gasAlert    = gas > GAS_ALERT_THRESHOLD;

  StaticJsonDocument<200> doc;
  if (!isnan(temperature)) doc["temperature"] = temperature;
  if (!isnan(humidity))    doc["humidity"]    = humidity;
  doc["flame"]     = flame;
  doc["movement"]  = movement;
  doc["gas"]       = gas;
  doc["gas_alert"] = gasAlert;

  char buf[200];
  serializeJson(doc, buf, sizeof(buf));
  mqtt.publish(TOPIC_SENSORS, buf, /*retained=*/false);
  Serial.println("[mqtt] published: " + String(buf));
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(FLAME_PIN,    INPUT);
  pinMode(MOVEMENT_PIN, INPUT);
  dht.begin();

  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_CLOSE_ANGLE);

  connectWifi();

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setKeepAlive(30);
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected())             connectMqtt();

  mqtt.loop(); // process incoming servo commands

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL_MS) {
    lastPublish = now;
    publishSensors();
  }
}
