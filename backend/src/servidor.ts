import { aplicacao } from "./aplicacao";

const PORTA_PADRAO = 3333;
const porta = Number(process.env.PORT) || PORTA_PADRAO;

aplicacao.listen(porta, () => {
  console.log(`API em execução em http://localhost:${porta}`);
});

