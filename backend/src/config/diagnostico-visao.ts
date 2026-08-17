const VALOR_VERDADEIRO = "true";

export function devePreservarUploadsFalhos(): boolean {
  return (
    process.env.PRESERVAR_UPLOADS_FALHOS?.trim().toLowerCase() ===
    VALOR_VERDADEIRO
  );
}
