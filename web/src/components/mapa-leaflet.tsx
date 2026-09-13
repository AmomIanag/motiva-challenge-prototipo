"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { latLngBounds, type LatLngExpression } from "leaflet";

import { formatarAltura, obterRotuloStatus } from "@/lib/formatadores";
import type { PontoMonitorado } from "@/lib/pontos-monitorados";

interface PropriedadesMapaLeaflet {
  pontos: PontoMonitorado[];
  dispositivoSelecionadoId: string | null;
  aoSelecionar: (dispositivoId: string) => void;
}

function AjustarEnquadramento({ pontos }: { pontos: PontoMonitorado[] }) {
  const mapa = useMap();

  useEffect(() => {
    const coordenadas = pontos.map(
      ({ dispositivo }) =>
        [dispositivo.latitude, dispositivo.longitude] as LatLngExpression,
    );

    if (coordenadas.length === 1) {
      mapa.setView(coordenadas[0], 16);
      return;
    }

    mapa.fitBounds(latLngBounds(coordenadas), {
      maxZoom: 16,
      padding: [36, 36],
    });
  }, [mapa, pontos]);

  return null;
}

function corDoStatus(ponto: PontoMonitorado): string {
  const status = ponto.ultimaLeitura?.status;
  return status ? `var(--cor-${status})` : "var(--cor-neutro-500)";
}

export function MapaLeaflet({
  pontos,
  dispositivoSelecionadoId,
  aoSelecionar,
}: PropriedadesMapaLeaflet) {
  const primeiroPonto = pontos[0];

  if (!primeiroPonto) return null;

  return (
    <MapContainer
      className="mapa-leaflet"
      center={[
        primeiroPonto.dispositivo.latitude,
        primeiroPonto.dispositivo.longitude,
      ]}
      zoom={16}
      scrollWheelZoom
      aria-label="Mapa interativo dos pontos monitorados"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AjustarEnquadramento pontos={pontos} />

      {pontos.map((ponto) => {
        const { dispositivo, ultimaLeitura } = ponto;
        const selecionado = dispositivo.dispositivoId === dispositivoSelecionadoId;

        return (
          <CircleMarker
            key={dispositivo.dispositivoId}
            center={[dispositivo.latitude, dispositivo.longitude]}
            radius={selecionado ? 13 : 10}
            pathOptions={{
              color: "var(--cor-superficie)",
              fillColor: corDoStatus(ponto),
              fillOpacity: 1,
              opacity: 1,
              weight: selecionado ? 4 : 3,
            }}
            eventHandlers={{
              click: () => aoSelecionar(dispositivo.dispositivoId),
            }}
          >
            <Popup>
              <strong>{dispositivo.dispositivoId}</strong>
              <span>
                {ultimaLeitura
                  ? `${obterRotuloStatus(ultimaLeitura.status)} · ${formatarAltura(ultimaLeitura.alturaCm)}`
                  : "Sem leitura"}
              </span>
              <small>
                {[dispositivo.rodovia, dispositivo.km && `Km ${dispositivo.km}`]
                  .filter(Boolean)
                  .join(" · ") || "Localização operacional não cadastrada"}
              </small>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
