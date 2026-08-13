# Motiva ESP

Plataforma acadêmica para monitoramento de vegetação às margens de rodovias.

## Estrutura

- `web/`: interface web em Next.js, React e TypeScript.
- `backend/`: futura API REST em Express e TypeScript.
- `vision/`: placeholder para o futuro módulo isolado em Python e OpenCV.

O backend será independente das interfaces clientes para que a mesma API possa ser consumida pelo dashboard web e por futuros aplicativos mobile.

## Pré-requisitos atuais

- Node.js 20.9 ou superior.
- npm 11 ou superior.

No PowerShell deste ambiente, utilize `npm.cmd` enquanto o launcher `npm.ps1` não estiver corrigido.

## Instalação

```powershell
npm.cmd install
```

## Executar o frontend inicial

```powershell
npm.cmd run dev:web
```

Acesse `http://localhost:3000`. O dashboard utiliza `http://localhost:3333` como URL padrão da API. Para utilizar outro endereço, copie `web/.env.example` para `web/.env.local` e altere `URL_API`.

## Executar o backend

```powershell
npm.cmd run dev:backend
```

A API será iniciada em `http://localhost:3333` e disponibiliza atualmente:

- `GET /api/saude`: estado da API.
- `GET /api/leituras`: histórico mockado de leituras.
- `GET /api/leituras/ultima`: leitura mockada mais recente.

PostgreSQL, visão computacional e integração com ESP32-CAM serão implementados em etapas posteriores.
