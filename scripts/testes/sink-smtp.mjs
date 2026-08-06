/**
 * Caixa de entrada falsa para os testes: fala SMTP na 1025 e grava cada
 * mensagem como JSON em /tmp/inbox. Não vai pro repositório — é andaime.
 */
import fs from "node:fs";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";

fs.mkdirSync("/tmp/inbox", { recursive: true });
let n = 0;

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((mail) => {
        const arquivo = `/tmp/inbox/${String(++n).padStart(3, "0")}.json`;
        fs.writeFileSync(
          arquivo,
          JSON.stringify(
            {
              to: mail.to?.text ?? "",
              from: mail.from?.text ?? "",
              subject: mail.subject ?? "",
              text: mail.text ?? "",
              html: mail.html || "",
            },
            null,
            2,
          ),
        );
        console.log(`[sink] ${mail.to?.text} · ${mail.subject}`);
        callback();
      })
      .catch(callback);
  },
});

server.listen(1025, () => console.log("[sink] ouvindo na 1025"));
