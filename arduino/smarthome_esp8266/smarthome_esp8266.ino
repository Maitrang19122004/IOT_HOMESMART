#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* ssid = "_thwchaq_";
const char* password = "00000000";
const char* mqtt_server = "172.20.10.3";
const int mqtt_port = 1884;
const char* mqtt_user = "Maithutrang";
const char* mqtt_pass = "19122004";

#define DHT_PIN  4
#define LDR_PIN  A0
#define LED_TEMP 14
#define LED_HUM  12
#define LED_LDR  13
#define DHTTYPE  DHT11

DHT dht(DHT_PIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSendTime = 0;

bool isBlinking = false;
unsigned long lastBlinkTime = 0;
int blinkState = HIGH;


void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  message.trim();
  Serial.print("Da nhan lenh dieu khien: [");
  Serial.print(message);
  Serial.println("]");

  // --- LOGIC NHẤP NHÁY ---
  if (message.indexOf("NHAY_ON") >= 0) {
    isBlinking = true;
    blinkState = HIGH;
    client.publish("smarthome/devices/status", "Thanh cong: Da BAT nhap nhay 3 den");
    Serial.println("=> Da BAT nhap nhay");
  }
  else if (message.indexOf("NHAY_OFF") >= 0) {
    isBlinking = false;
    digitalWrite(LED_TEMP, HIGH);
    digitalWrite(LED_HUM, HIGH);
    digitalWrite(LED_LDR, HIGH);
    client.publish("smarthome/devices/status", "Thanh cong: Da TAT nhap nhay");
    Serial.println("=> Da TAT nhap nhay");
  }

  // --- ĐIỀU KHIỂN ĐÈN 1 ---
  else if (message.indexOf("DEN1_ON") >= 0) {
    isBlinking = false;
    digitalWrite(LED_TEMP, LOW);
    client.publish("smarthome/devices/status", "Thanh cong: Den 1 da BAT");
    Serial.println("=> Da BAT den 1");
  }
  else if (message.indexOf("DEN1_OFF") >= 0) {
    isBlinking = false;
    digitalWrite(LED_TEMP, HIGH);
    client.publish("smarthome/devices/status", "Thanh cong: Den 1 da TAT");
    Serial.println("=> Da TAT den 1");
  }

  // --- ĐIỀU KHIỂN ĐÈN 2 ---
  else if (message.indexOf("DEN2_ON") >= 0) {
    isBlinking = false;
    digitalWrite(LED_HUM, LOW);
    client.publish("smarthome/devices/status", "Thanh cong: Den 2 da BAT");
    Serial.println("=> Da BAT den 2");
  }
  else if (message.indexOf("DEN2_OFF") >= 0) {
    isBlinking = false;
    digitalWrite(LED_HUM, HIGH);
    client.publish("smarthome/devices/status", "Thanh cong: Den 2 da TAT");
    Serial.println("=> Da TAT den 2");
  }

  // --- ĐIỀU KHIỂN ĐÈN 3 ---
  else if (message.indexOf("DEN3_ON") >= 0) {
    isBlinking = false;
    digitalWrite(LED_LDR, LOW);
    client.publish("smarthome/devices/status", "Thanh cong: Den 3 da BAT");
    Serial.println("=> Da BAT den 3");
  }
  else if (message.indexOf("DEN3_OFF") >= 0) {
    isBlinking = false;
    digitalWrite(LED_LDR, HIGH);
    client.publish("smarthome/devices/status", "Thanh cong: Den 3 da TAT");
    Serial.println("=> Da TAT den 3");
  }

  // --- ĐIỀU KHIỂN TẤT CẢ ---
  else if (message.indexOf("ALL_ON") >= 0) {
    isBlinking = false;
    digitalWrite(LED_TEMP, LOW); digitalWrite(LED_HUM, LOW);
    digitalWrite(LED_LDR,  LOW); digitalWrite(LED_TV,  LOW); digitalWrite(LED_PUMP, LOW);
    client.publish("smarthome/devices/status", "Thanh cong: Tat ca den da BAT");
    Serial.println("=> Da BAT tat ca");
  }
  else if (message.indexOf("ALL_OFF") >= 0) {
    isBlinking = false;
    digitalWrite(LED_TEMP, HIGH); digitalWrite(LED_HUM, HIGH);
    digitalWrite(LED_LDR,  HIGH); digitalWrite(LED_TV,  HIGH); digitalWrite(LED_PUMP, HIGH);
    client.publish("smarthome/devices/status", "Thanh cong: Tat ca den da TAT");
    Serial.println("=> Da TAT tat ca");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT voi user Mtran...");
    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println(" KET NOI THANH CONG!");
      client.subscribe("smarthome/devices/control");
    } else {
      Serial.print(" That bai, ma loi=");
      Serial.print(client.state());
      Serial.println(" Thu lai sau 5 giay...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_TEMP, OUTPUT); digitalWrite(LED_TEMP, HIGH);
  pinMode(LED_HUM,  OUTPUT); digitalWrite(LED_HUM,  HIGH);
  pinMode(LED_LDR,  OUTPUT); digitalWrite(LED_LDR,  HIGH);
  dht.begin();

  Serial.println();
  Serial.print("Dang ket noi den Wi-Fi: "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi da ket noi!");
  Serial.print("IP cua mach: "); Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();

  // Xử lý hiệu ứng nhấp nháy
  if (isBlinking) {
    if (now - lastBlinkTime >= 500) {
      lastBlinkTime = now;

      if (blinkState == HIGH) {
        blinkState = LOW;
        Serial.println(">>> Blink: OFF");
      } else {
        blinkState = HIGH;
        Serial.println(">>> Blink: ON");
      }

      digitalWrite(LED_TEMP, blinkState);
      digitalWrite(LED_HUM, blinkState);
      digitalWrite(LED_LDR, blinkState);
    }
  }

  // Gửi dữ liệu cảm biến
  if (now - lastSendTime > 5000) {
    lastSendTime = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("Loi khong doc duoc DHT11!");
    } else {
      int adcValue = analogRead(LDR_PIN);
      float lux = 0;
      if (adcValue > 0 && adcValue < 1023) {
        float voltage = adcValue * (3.3 / 1023.0);
        float rLDR = 10000.0 * voltage / (3.3 - voltage);
        lux = 500000.0 / rLDR;
      }

      Serial.print("TEM: "); Serial.print(t); Serial.print(" *C | ");
      Serial.print("HUM: "); Serial.print(h); Serial.print(" % | ");
      Serial.print("LDR: "); Serial.print(lux); Serial.println(" Lux");
      Serial.println("-----------------------");

      String payload = "Nhiet do: " + String(t) + "C | Do am: " + String(h) + "% | Anh sang: " + String(lux) + " Lux";
      client.publish("smarthome/environment", payload.c_str());
    }
  }
}
