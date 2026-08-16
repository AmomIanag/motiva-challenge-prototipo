# Firmware Motiva ESP32-CAM

Firmware para a placa AI Thinker ESP32-CAM com sensor OV3660. A compilação e o envio são realizados pela Arduino IDE.

## Configuração

1. Copie `credenciais.exemplo.h` para `credenciais.h` na mesma pasta.
2. Preencha `WIFI_SSID` e `WIFI_SENHA` somente em `credenciais.h`.
3. Em `motiva-esp32-cam.ino`, atualize `ENDERECO_BACKEND` se o IPv4 do PC não for mais `192.168.15.44`.

O arquivo `credenciais.h` é ignorado pelo Git. Não coloque SSID, senha ou outras credenciais no `.ino` ou em arquivos versionados.

O endpoint configurado atualmente é `http://192.168.15.44:3333/api/leituras/imagem`.

## Compilar e enviar

1. No PC, execute o backend com `npm.cmd run dev:backend` a partir da raiz do projeto.
2. Confirme que a ESP32-CAM e o PC estão na mesma rede local.
3. Abra `motiva-esp32-cam.ino` na Arduino IDE.
4. Selecione a placa `AI Thinker ESP32-CAM`.
5. Selecione a porta serial correspondente ao dispositivo conectado.
6. Faça o Upload usando o mesmo procedimento físico já validado com o CameraWebServer.
7. Reinicie a placa no modo normal de execução após o Upload.
8. Abra o Serial Monitor em `115200` baud.

## Realizar uma leitura manual

1. Aguarde a mensagem `[Motiva] Sistema pronto.` no Serial Monitor.
2. Digite `f` ou `F`.
3. Pressione Enter.
4. Aguarde a captura, o envio e a resposta HTTP do backend.
5. Depois da nova mensagem de espera, digite `F` novamente quando desejar outra leitura.

Nenhuma imagem é capturada automaticamente. O modo manual foi escolhido para o protótipo e a demonstração porque permite posicionar corretamente a câmera, a planta e a régua, evita armazenar imagens aleatórias e executa a medição somente quando desejado.

Esse comportamento não é uma exigência da arquitetura definitiva. Uma implantação futura poderá iniciar capturas por intervalo programado ou por outro evento.

A ESP acessa o backend pelo IPv4 do PC, nunca por `localhost`. Como o IPv4 pode mudar, verifique-o com `ipconfig` e ajuste `ENDERECO_BACKEND` quando necessário.
