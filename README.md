# Motiva ESP

Plataforma acadêmica para monitoramento de vegetação às margens de rodovias.

## Estrutura

- `web/`: interface web em Next.js, React e TypeScript.
- `backend/`: API REST em Express e TypeScript.
- `vision/`: módulo isolado em Python e OpenCV para estimar a altura da vegetação.

O backend será independente das interfaces clientes para que a mesma API possa ser consumida pelo dashboard web e por futuros aplicativos mobile.

## Pré-requisitos atuais

- Node.js 20.9 ou superior.
- npm 11 ou superior.
- Python com o ambiente virtual já criado em `vision/.venv/` e as dependências de `vision/requirements.txt`.

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

No pgAdmin, selecione o banco `motiva_esp` e abra o Query Tool. Em uma instalação nova, execute nesta ordem:

1. `backend/sql/criar-tabelas.sql` para criar a tabela e o índice;
2. `backend/sql/inserir-dados-teste.sql` para inserir manualmente os três registros de demonstração.

Em um banco criado antes da ETAPA 8, execute também `backend/sql/adicionar-imagem-leituras.sql`. A migração adiciona a coluna opcional `nome_imagem` sem alterar os registros existentes.

O seed é idempotente para os registros fornecidos e não é executado automaticamente pelo backend.

Depois, inicie a API:

```powershell
npm.cmd run dev:backend
```

A API será iniciada em `http://localhost:3333` e disponibiliza atualmente:

- `GET /api/saude`: estado da API e da conexão com PostgreSQL.
- `GET /api/leituras`: histórico persistido de leituras.
- `GET /api/leituras/ultima`: leitura persistida mais recente.
- `POST /api/leituras/imagem`: recebe, mede, classifica e persiste uma imagem JPEG ou PNG.
- `GET /uploads/<nome>`: disponibiliza uma imagem associada a uma leitura.

## Testar o upload de imagem

Envie uma imagem de até 5 MB no campo multipart `imagem`. O campo `dispositivoId` é opcional; na ausência dele, o backend usa temporariamente `ESP-01`:

```powershell
curl.exe -X POST `
  -F "imagem=@C:\caminho\foto-teste.jpg" `
  -F "dispositivoId=ESP-01" `
  http://localhost:3333/api/leituras/imagem
```

Em caso de sucesso, a API retorna a leitura com `alturaCm`, `status`, `medidoEm` e uma `imagemUrl` relativa. O backend executa `vision/.venv/Scripts/python.exe`, solicita a saída JSON do OpenCV, classifica a altura no TypeScript e só então grava a leitura no PostgreSQL. Se o processamento ou a persistência falhar, a imagem recém-salva é removida.

Teste uma requisição sem arquivo:

```powershell
curl.exe -X POST http://localhost:3333/api/leituras/imagem
```

As imagens válidas são armazenadas localmente em `backend/uploads/`. O conteúdo dessa pasta, exceto `.gitkeep`, é ignorado pelo Git.

Para conferir os dados diretamente pelo pgAdmin, execute:

```sql
SELECT id, dispositivo_id, altura_cm, status, medido_em, nome_imagem
FROM leituras
ORDER BY medido_em DESC, id DESC;
```

Depois de um upload concluído, atualize `http://localhost:3000` para ver a nova leitura e sua fotografia no dashboard.

## Limitações atuais da visão computacional

- A foto deve seguir aproximadamente o enquadramento usado na calibração experimental.
- A régua vertical de 60 cm precisa permanecer visível na região esperada.
- A linha da base e as regiões de interesse continuam assistidas e específicas para o protótipo atual.
- A integração com ESP32-CAM ainda não foi iniciada.
