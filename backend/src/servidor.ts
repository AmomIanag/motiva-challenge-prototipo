import { aplicacao } from "./aplicacao";

const PORTA_PADRAO = 3333;
const ENDERECO_REDE = "0.0.0.0";
const porta = Number(process.env.PORT) || PORTA_PADRAO;

aplicacao.listen(porta, ENDERECO_REDE, () => {
  console.log(`API em execução em http://localhost:${porta}`);
});
