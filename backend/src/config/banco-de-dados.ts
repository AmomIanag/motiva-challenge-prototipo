import { Pool } from "pg";

const urlBancoDados = process.env.DATABASE_URL;

if (!urlBancoDados) {
  throw new Error(
    "A variável de ambiente DATABASE_URL não foi definida. Crie backend/.env a partir de backend/.env.example.",
  );
}

export const poolBancoDados = new Pool({
  connectionString: urlBancoDados,
});

poolBancoDados.on("error", (erro) => {
  console.error("Erro inesperado na conexão com o PostgreSQL:", erro);
});

export async function verificarConexaoBancoDados(): Promise<void> {
  await poolBancoDados.query("SELECT 1");
}

