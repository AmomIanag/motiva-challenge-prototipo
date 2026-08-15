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

Crie o arquivo local de ambiente a partir do exemplo:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edite `backend/.env` e substitua `usuario` e `senha` pelas credenciais locais do PostgreSQL. Esse arquivo é ignorado pelo Git e não deve ser versionado.

No pgAdmin, selecione o banco `motiva_esp`, abra o Query Tool e execute, nesta ordem:

1. `backend/sql/criar-tabelas.sql` para criar a tabela e o índice;
2. `backend/sql/inserir-dados-teste.sql` para inserir manualmente os três registros de demonstração.

O seed é idempotente para os registros fornecidos e não é executado automaticamente pelo backend.

Depois, inicie a API:

```powershell
npm.cmd run dev:backend
```

A API será iniciada em `http://localhost:3333` e disponibiliza atualmente:

- `GET /api/saude`: estado da API e da conexão com PostgreSQL.
- `GET /api/leituras`: histórico persistido de leituras.
- `GET /api/leituras/ultima`: leitura persistida mais recente.

Para conferir os dados diretamente pelo pgAdmin, execute:

```sql
SELECT id, dispositivo_id, altura_cm, status, medido_em
FROM leituras
ORDER BY medido_em ASC, id ASC;
```

Visão computacional e integração com ESP32-CAM serão implementadas em etapas posteriores.
