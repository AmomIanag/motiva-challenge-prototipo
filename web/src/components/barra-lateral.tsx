import { MarcaMotiva } from "@/components/marca-motiva";
import { NavegacaoLateral } from "@/components/navegacao-lateral";

export function BarraLateral() {
  return (
    <aside className="barra-lateral">
      <div className="marca">
        <MarcaMotiva />
        <span className="marca-produto">Monitoramento viário</span>
      </div>

      <NavegacaoLateral />

      <div className="barra-lateral-rodape">
        <span className="indicador-integracao" aria-hidden="true">+</span>
        <div>
          <strong>Integração do protótipo</strong>
          <span>ESP32-CAM + API + visão computacional</span>
        </div>
      </div>
    </aside>
  );
}
