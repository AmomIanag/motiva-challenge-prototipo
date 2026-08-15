import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

const NOME_ARQUIVO_LOGO = "motiva-logo-anil.svg";
const CAMINHO_PUBLICO_LOGO = `/brand/${NOME_ARQUIVO_LOGO}`;

export function MarcaMotiva() {
  const logoExiste = existsSync(
    join(process.cwd(), "public", "brand", NOME_ARQUIVO_LOGO),
  );

  return (
    <div className="marca-identidade">
      {logoExiste ? (
        <Image
          className="marca-logo"
          src={CAMINHO_PUBLICO_LOGO}
          alt="Motiva"
          width={132}
          height={38}
          priority
        />
      ) : (
        <span className="marca-placeholder">Motiva</span>
      )}
    </div>
  );
}
