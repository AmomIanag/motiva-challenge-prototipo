"use client";

import { useEffect, useState } from "react";

type Tema = "claro" | "escuro";

const CHAVE_TEMA = "tema-motiva";

export function ControleTema() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const temaAplicado = document.documentElement.dataset.theme;
    setTema(temaAplicado === "escuro" ? "escuro" : "claro");
  }, []);

  function alternarTema() {
    const proximoTema: Tema = tema === "escuro" ? "claro" : "escuro";

    document.documentElement.dataset.theme = proximoTema;
    document.documentElement.style.colorScheme =
      proximoTema === "escuro" ? "dark" : "light";
    try {
      localStorage.setItem(CHAVE_TEMA, proximoTema);
    } catch {
      // O tema continua funcional mesmo se o navegador bloquear o armazenamento.
    }
    setTema(proximoTema);
  }

  const descricao =
    tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      className="controle-tema"
      type="button"
      onClick={alternarTema}
      aria-label={tema ? descricao : "Alternar tema"}
      title={tema ? descricao : "Alternar tema"}
    >
      <span className="controle-tema-trilho" aria-hidden="true">
        <span className="controle-tema-sol">☀</span>
        <span className="controle-tema-lua">☾</span>
        <span className="controle-tema-seletor" />
      </span>
      <span className="controle-tema-texto">
        {tema === null ? "Tema" : tema === "escuro" ? "Escuro" : "Claro"}
      </span>
    </button>
  );
}
