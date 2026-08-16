#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include "esp_camera.h"

#include "credenciais.h"

// Pinagem oficial da placa AI Thinker ESP32-CAM.
constexpr int PINO_PWDN = 32;
constexpr int PINO_RESET = -1;
constexpr int PINO_XCLK = 0;
constexpr int PINO_SIOD = 26;
constexpr int PINO_SIOC = 27;
constexpr int PINO_Y9 = 35;
constexpr int PINO_Y8 = 34;
constexpr int PINO_Y7 = 39;
constexpr int PINO_Y6 = 36;
constexpr int PINO_Y5 = 21;
constexpr int PINO_Y4 = 19;
constexpr int PINO_Y3 = 18;
constexpr int PINO_Y2 = 5;
constexpr int PINO_VSYNC = 25;
constexpr int PINO_HREF = 23;
constexpr int PINO_PCLK = 22;

constexpr char ENDERECO_BACKEND[] = "192.168.15.44";
constexpr uint16_t PORTA_BACKEND = 3333;
constexpr char CAMINHO_UPLOAD[] = "/api/leituras/imagem";
constexpr char DISPOSITIVO_ID[] = "ESP-01";
constexpr char LIMITE_MULTIPART[] = "----MotivaESP32CAMBoundary";

constexpr unsigned long TEMPO_LIMITE_WIFI_MS = 20000;
constexpr unsigned long TEMPO_LIMITE_ENVIO_MS = 15000;
constexpr unsigned long TEMPO_LIMITE_RESPOSTA_MS = 45000;
constexpr size_t TAMANHO_BLOCO_ENVIO = 1024;

bool cameraInicializada = false;
bool leituraEmAndamento = false;

bool escreverBytes(
  WiFiClient &cliente,
  const uint8_t *dados,
  size_t tamanho
) {
  size_t totalEnviado = 0;
  unsigned long ultimoProgresso = millis();

  while (totalEnviado < tamanho) {
    if (!cliente.connected()) {
      return false;
    }

    const size_t restante = tamanho - totalEnviado;
    const size_t tamanhoBloco =
      restante < TAMANHO_BLOCO_ENVIO ? restante : TAMANHO_BLOCO_ENVIO;
    const size_t enviado = cliente.write(dados + totalEnviado, tamanhoBloco);

    if (enviado > 0) {
      totalEnviado += enviado;
      ultimoProgresso = millis();
      continue;
    }

    if (millis() - ultimoProgresso >= TEMPO_LIMITE_ENVIO_MS) {
      return false;
    }

    delay(1);
  }

  return true;
}

bool escreverTexto(WiFiClient &cliente, const String &texto) {
  return escreverBytes(
    cliente,
    reinterpret_cast<const uint8_t *>(texto.c_str()),
    texto.length()
  );
}

bool conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("[Motiva] Conectando ao Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  const unsigned long inicioTentativa = millis();
  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - inicioTentativa < TEMPO_LIMITE_WIFI_MS
  ) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Motiva] Não foi possível conectar ao Wi-Fi.");
    return false;
  }

  Serial.println("[Motiva] Wi-Fi conectado.");
  Serial.print("[Motiva] IP da ESP: ");
  Serial.println(WiFi.localIP());
  return true;
}

bool inicializarCamera() {
  Serial.println("[Motiva] Inicializando câmera...");

  camera_config_t configuracao = {};
  configuracao.ledc_channel = LEDC_CHANNEL_0;
  configuracao.ledc_timer = LEDC_TIMER_0;
  configuracao.pin_d0 = PINO_Y2;
  configuracao.pin_d1 = PINO_Y3;
  configuracao.pin_d2 = PINO_Y4;
  configuracao.pin_d3 = PINO_Y5;
  configuracao.pin_d4 = PINO_Y6;
  configuracao.pin_d5 = PINO_Y7;
  configuracao.pin_d6 = PINO_Y8;
  configuracao.pin_d7 = PINO_Y9;
  configuracao.pin_xclk = PINO_XCLK;
  configuracao.pin_pclk = PINO_PCLK;
  configuracao.pin_vsync = PINO_VSYNC;
  configuracao.pin_href = PINO_HREF;
  configuracao.pin_sccb_sda = PINO_SIOD;
  configuracao.pin_sccb_scl = PINO_SIOC;
  configuracao.pin_pwdn = PINO_PWDN;
  configuracao.pin_reset = PINO_RESET;
  configuracao.xclk_freq_hz = 20000000;
  configuracao.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    configuracao.frame_size = FRAMESIZE_SVGA;
    configuracao.jpeg_quality = 12;
    configuracao.fb_count = 2;
    configuracao.fb_location = CAMERA_FB_IN_PSRAM;
    configuracao.grab_mode = CAMERA_GRAB_LATEST;
    Serial.println("[Motiva] PSRAM detectada; usando frame buffer externo.");
  } else {
    configuracao.frame_size = FRAMESIZE_VGA;
    configuracao.jpeg_quality = 15;
    configuracao.fb_count = 1;
    configuracao.fb_location = CAMERA_FB_IN_DRAM;
    configuracao.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    Serial.println("[Motiva] PSRAM não detectada; usando configuração reduzida.");
  }

  const esp_err_t erro = esp_camera_init(&configuracao);
  if (erro != ESP_OK) {
    Serial.printf("[Motiva] Falha ao inicializar câmera: 0x%x\n", erro);
    return false;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  if (sensor != nullptr && sensor->id.PID == OV3660_PID) {
    sensor->set_vflip(sensor, 1);
    sensor->set_brightness(sensor, 1);
    sensor->set_saturation(sensor, -2);
    Serial.println("[Motiva] Sensor OV3660 detectado.");
  } else if (sensor != nullptr) {
    Serial.printf("[Motiva] Sensor detectado com PID 0x%x.\n", sensor->id.PID);
  }

  Serial.println("[Motiva] Câmera inicializada.");
  return true;
}

int aguardarCodigoHttp(WiFiClient &cliente) {
  const unsigned long inicioEspera = millis();
  while (
    !cliente.available() &&
    cliente.connected() &&
    millis() - inicioEspera < TEMPO_LIMITE_RESPOSTA_MS
  ) {
    delay(10);
  }

  if (!cliente.available()) {
    Serial.println("[Motiva] O backend não respondeu dentro do limite.");
    return -1;
  }

  String linhaStatus = cliente.readStringUntil('\n');
  linhaStatus.trim();
  const int primeiroEspaco = linhaStatus.indexOf(' ');

  if (!linhaStatus.startsWith("HTTP/") || primeiroEspaco < 0) {
    Serial.println("[Motiva] Resposta HTTP inválida.");
    return -1;
  }

  return linhaStatus.substring(primeiroEspaco + 1, primeiroEspaco + 4).toInt();
}

bool enviarImagem(const camera_fb_t *frame) {
  WiFiClient cliente;
  cliente.setTimeout(5000);

  Serial.println("[Motiva] Enviando para o backend...");
  if (!cliente.connect(ENDERECO_BACKEND, PORTA_BACKEND)) {
    Serial.println("[Motiva] Não foi possível conectar ao backend.");
    return false;
  }

  String inicioMultipart;
  inicioMultipart.reserve(320);
  inicioMultipart += "--";
  inicioMultipart += LIMITE_MULTIPART;
  inicioMultipart += "\r\nContent-Disposition: form-data; name=\"dispositivoId\"\r\n\r\n";
  inicioMultipart += DISPOSITIVO_ID;
  inicioMultipart += "\r\n--";
  inicioMultipart += LIMITE_MULTIPART;
  inicioMultipart += "\r\nContent-Disposition: form-data; name=\"imagem\"; filename=\"captura.jpg\"\r\n";
  inicioMultipart += "Content-Type: image/jpeg\r\n\r\n";

  String fimMultipart = "\r\n--";
  fimMultipart += LIMITE_MULTIPART;
  fimMultipart += "--\r\n";

  const size_t tamanhoConteudo =
    inicioMultipart.length() + frame->len + fimMultipart.length();

  String cabecalhoHttp;
  cabecalhoHttp.reserve(280);
  cabecalhoHttp += "POST ";
  cabecalhoHttp += CAMINHO_UPLOAD;
  cabecalhoHttp += " HTTP/1.1\r\nHost: ";
  cabecalhoHttp += ENDERECO_BACKEND;
  cabecalhoHttp += ":";
  cabecalhoHttp += String(PORTA_BACKEND);
  cabecalhoHttp += "\r\nConnection: close\r\n";
  cabecalhoHttp += "User-Agent: Motiva-ESP32-CAM/1.0\r\n";
  cabecalhoHttp += "Content-Type: multipart/form-data; boundary=";
  cabecalhoHttp += LIMITE_MULTIPART;
  cabecalhoHttp += "\r\nContent-Length: ";
  cabecalhoHttp += String(static_cast<unsigned long>(tamanhoConteudo));
  cabecalhoHttp += "\r\n\r\n";

  const bool envioConcluido =
    escreverTexto(cliente, cabecalhoHttp) &&
    escreverTexto(cliente, inicioMultipart) &&
    escreverBytes(cliente, frame->buf, frame->len) &&
    escreverTexto(cliente, fimMultipart);

  if (!envioConcluido) {
    Serial.println("[Motiva] Falha durante o envio da imagem.");
    cliente.stop();
    return false;
  }

  const int codigoHttp = aguardarCodigoHttp(cliente);
  cliente.stop();

  if (codigoHttp < 0) {
    return false;
  }

  Serial.printf("[Motiva] HTTP %d\n", codigoHttp);
  if (codigoHttp >= 200 && codigoHttp < 300) {
    Serial.println("[Motiva] Leitura enviada com sucesso.");
    return true;
  }

  Serial.println("[Motiva] O backend rejeitou ou não processou a leitura.");
  return false;
}

void capturarEEnviar() {
  Serial.println("[Motiva] Capturando imagem...");
  camera_fb_t *frame = esp_camera_fb_get();

  if (frame == nullptr) {
    Serial.println("[Motiva] Falha ao capturar imagem.");
    return;
  }

  Serial.printf("[Motiva] Imagem capturada: %u bytes\n", frame->len);

  if (frame->format != PIXFORMAT_JPEG) {
    Serial.println("[Motiva] A câmera não retornou uma imagem JPEG.");
    esp_camera_fb_return(frame);
    return;
  }

  enviarImagem(frame);
  esp_camera_fb_return(frame);
}

void limparEntradaSerial() {
  while (Serial.available() > 0) {
    Serial.read();
  }
}

void exibirMensagemEspera() {
  Serial.println("[Motiva] Pronto para nova leitura. Digite F e pressione Enter.");
}

void realizarLeituraManual() {
  if (leituraEmAndamento) {
    return;
  }

  leituraEmAndamento = true;
  Serial.println("[Motiva] Comando de captura recebido.");

  if (!cameraInicializada) {
    cameraInicializada = inicializarCamera();
  }

  if (WiFi.status() != WL_CONNECTED && !conectarWifi()) {
    Serial.println("[Motiva] Leitura cancelada; Wi-Fi indisponível.");
  } else if (!cameraInicializada) {
    Serial.println("[Motiva] Leitura cancelada; câmera indisponível.");
  } else {
    capturarEEnviar();
  }

  leituraEmAndamento = false;
  limparEntradaSerial();
  exibirMensagemEspera();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("[Motiva] Iniciando firmware...");

  cameraInicializada = inicializarCamera();
  conectarWifi();

  Serial.println("[Motiva] Sistema pronto.");
  Serial.println("[Motiva] Digite F e pressione Enter para realizar uma leitura.");
}

void loop() {
  if (Serial.available() <= 0) {
    delay(10);
    return;
  }

  const char comando = static_cast<char>(Serial.read());

  if (comando == '\r' || comando == '\n') {
    return;
  }

  if (comando == 'f' || comando == 'F') {
    realizarLeituraManual();
    return;
  }

  limparEntradaSerial();
  Serial.println("[Motiva] Comando desconhecido. Use F para realizar uma leitura.");
}
