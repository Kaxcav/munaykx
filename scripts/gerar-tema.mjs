/**
 * Imprime o bloco de variáveis CSS do tema, calculado a partir do
 * lib/brand.ts. Uso: `npm run tema`, e cola o resultado no :root do
 * app/globals.css. O teste tests/tema.spec.ts garante que os dois batem.
 */
import { blocoCssDoTema } from "../lib/tema.ts";
console.log(blocoCssDoTema());
