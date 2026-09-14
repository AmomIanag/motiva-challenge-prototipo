# Motiva — Operação em Campo

Aplicativo React Native/Expo destinado à equipe de campo do Motiva ESP. Ele é um cliente independente da mesma API usada pela plataforma web.

## Requisitos

- Node.js 20.9 ou superior;
- npm;
- Expo Go compatível, Android Emulator ou dispositivo Android físico.

## Instalação e execução

Na raiz do repositório:

```powershell
npm.cmd install
npm.cmd run dev:mobile
```

Também é possível iniciar diretamente para Android:

```powershell
npm.cmd --workspace mobile run android
```

## Configuração da API

Copie `mobile/.env.example` para `mobile/.env` e ajuste `EXPO_PUBLIC_API_URL`.

```dotenv
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3333
```

- Dispositivo físico: use o IPv4 LAN do computador que executa o backend; `localhost` aponta para o próprio celular.
- Android Emulator: use o endereço do host disponibilizado pelo emulador, normalmente `10.0.2.2` no emulador padrão.
- O aparelho/emulador e o backend precisam conseguir se alcançar pela rede.

Essa variável é pública no bundle do Expo e deve conter somente a URL da API. Não adicione senhas, tokens ou outras credenciais.

## Comandos

```powershell
npm.cmd --workspace mobile run start
npm.cmd --workspace mobile run android
npm.cmd --workspace mobile run typecheck
```

A tela Configuração permite testar `GET /api/saude`. Esse diagnóstico verifica apenas a comunicação aplicativo → backend; ele não informa conectividade da ESP32-CAM.
