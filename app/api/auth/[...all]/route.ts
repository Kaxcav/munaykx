import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/** Rotas do Better Auth (STORY-007). Tudo passa por aqui: pedir link, consumir token, sair. */
export const { GET, POST } = toNextJsHandler(auth.handler);
