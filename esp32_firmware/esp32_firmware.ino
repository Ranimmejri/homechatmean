/*
 * ESP32 Sensor + Servo Server
 * Exposes:
 *   GET  /sensors     → JSON with all sensor readings
 *   POST /servo/open  → rotates servo to open position
 *   POST /servo/close → rotates servo to closed position
 *
 * Libraries needed (install via Arduino Library Manager):
 *   - ESP32Servo  by Kevin Harrington
 *   - ArduinoJson by Benoit Blanchon
 *   - (WiFi, WebServer, DHT are built-in for ESP32)
 *   - DHT sensor library by Adafruit + Adafruit Unified Sensor
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT.h>

// ─── WiFi credentials ────────────────────────────────────────────────────────
const char* SSID     = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// ─── Pin assignments ──────────────────────────────────────────────────────────
#define DHT_PIN       4      // DHT22 data pin
#define DHT_TYPE      DHT22
#define FLAME_PIN     34     // Analog/digital flame sensor (LOW = flame detected)
#define GAS_PIN       35     // Analog MQ-2/MQ-5 gas sensor (ADC)
#define MOVEMENT_PIN  27     // PIR motion sensor
#define SERVO_PIN     18     // Servo signal pin

// ─── Thresholds ───────────────────────────────────────────────────────────────
#define GAS_ALERT_THRESHOLD 500   // raw ADC (0–4095); tune to your sensor
#define SERVO_OPEN_ANGLE    90
#define SERVO_CLOSE_ANGLE   0

// ─── Globals ──────────────────────────────────────────────────────────────────
WebServer server(80);
DHT       dht(DHT_PIN, DHT_TYPE);
Servo     doorServo;

void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  addCORSHeaders();
  server.send(204);
}

void handleSensors() {
  addCORSHeaders();

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  bool  flame       = (digitalRead(FLAME_PIN) == LOW); // active-low
  bool  movement    = (digitalRead(MOVEMENT_PIN) == HIGH);
  int   gas         = analogRead(GAS_PIN);
  bool  gasAlert    = gas > GAS_ALERT_THRESHOLD;

  StaticJsonDocument<200> doc;
  doc["temperature"] = isnan(temperature) ? nullptr : temperature;
  doc["humidity"]    = isnan(humidity)    ? nullptr : humidity;
  doc["flame"]       = flame;
  doc["movement"]    = movement;
  doc["gas"]         = gas;
  doc["gas_alert"]   = gasAlert;

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleServoOpen() {
  addCORSHeaders();
  doorServo.write(SERVO_OPEN_ANGLE);
  server.send(200, "application/json", "{\"status\":\"ok\",\"position\":\"open\"}");
}

void handleServoClose() {
  addCORSHeaders();
  doorServo.write(SERVO_CLOSE_ANGLE);
  server.send(200, "application/json", "{\"status\":\"ok\",\"position\":\"close\"}");
}

void setup() {
  Serial.begin(115200);

  pinMode(FLAME_PIN,    INPUT);
  pinMode(MOVEMENT_PIN, INPUT);

  dht.begin();

  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_CLOSE_ANGLE);

  WiFi.begin(SSID, PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  // Register routes (preflight OPTIONS + actual handlers)
  server.on("/sensors",     HTTP_GET,  handleSensors);
  server.on("/servo/open",  HTTP_POST, handleServoOpen);
  server.on("/servo/close", HTTP_POST, handleServoClose);
  server.on("/sensors",     HTTP_OPTIONS, handleOptions);
  server.on("/servo/open",  HTTP_OPTIONS, handleOptions);
  server.on("/servo/close", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
