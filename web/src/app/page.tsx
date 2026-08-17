import { BarraLateral } from "@/components/barra-lateral";
import { DashboardInterativo } from "@/components/dashboard-interativo";
import { carregarLeiturasDashboard } from "@/lib/api";
import type { LeituraVegetacao } from "@/types/leitura";

export const dynamic = "force-dynamic";

export default async function PaginaInicial() {
  let leiturasIniciais: LeituraVegetacao[] = [];
  let sincronizadoEmInicial: string | null = null;
  let erroInicial: string | null = null;

  try {
    leiturasIniciais = await carregarLeiturasDashboard();
    sincronizadoEmInicial = new Date().toISOString();
  } catch (erro) {
    console.error("Falha ao carregar os dados do dashboard:", erro);
    erroInicial = "Não foi possível carregar os dados.";
  }

  return (
    <div className="estrutura-dashboard">
      <BarraLateral />
      <main className="conteudo-dashboard" id="visao-geral">
        <DashboardInterativo
          leiturasIniciais={leiturasIniciais}
          sincronizadoEmInicial={sincronizadoEmInicial}
          erroInicial={erroInicial}
        />
      </main>
    </div>
  );
}
