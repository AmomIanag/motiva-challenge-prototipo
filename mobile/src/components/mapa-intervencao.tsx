import MapView, { Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";

import { raios, useTema } from "@/theme/tema";
import type { Coordenadas } from "@/utils/localizacao";

interface PropriedadesMapaIntervencao {
  coordenadas: Coordenadas;
  intervencaoId: string;
}

export function MapaIntervencao({ coordenadas, intervencaoId }: PropriedadesMapaIntervencao) {
  const tema = useTema();

  return (
    <View style={[styles.moldura, { backgroundColor: tema.cores.superficie, borderColor: tema.cores.borda }]}>
      <MapView
        accessibilityLabel={`Mapa da intervenção ${intervencaoId}`}
        initialRegion={{
          ...coordenadas,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={styles.mapa}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={coordenadas}
          description="Localização registrada quando a intervenção foi criada"
          title={`Intervenção #${intervencaoId}`}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: {
    borderRadius: raios.lg,
    borderWidth: 1,
    minHeight: 360,
    overflow: "hidden",
  },
  mapa: {
    height: 360,
    width: "100%",
  },
});
