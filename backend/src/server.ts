import { app } from "./app";

const DEFAULT_PORT = 3333;
const port = Number(process.env.PORT) || DEFAULT_PORT;

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

