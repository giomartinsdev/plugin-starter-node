#!/usr/bin/env node
/**
 * Plugin de exemplo em Node — contador por membro.
 *
 * Protocolo: JSON-RPC 2.0, uma mensagem JSON por linha, em stdin/stdout.
 * Zero dependência: só `node:readline`.
 */
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

const pending = new Map();
let seq = 0;

const send = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");
const log = (msg, level = "info") => process.stderr.write(`[${level}] ${msg}\n`);

/** Chamada síncrona ao core. Resolve quando a resposta do nosso id chega. */
function core(method, params) {
  const id = `p${++seq}`;
  send({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function handleCommand({ command, userId = "0", guildId = "0" }) {
  const key = `count:${userId}`;

  if (command === "contar") {
    const { value } = await core("kv.get", { guildId, key });
    const total = (value ?? 0) + 1;
    await core("kv.set", { guildId, key, value: total });
    const milestone = total % 10 === 0 ? `\n${total} é um número redondo!` : "";
    return [{ type: "reply", content: `<@${userId}> chegou a **${total}**.${milestone}` }];
  }

  if (command === "contagem") {
    const { value } = await core("kv.get", { guildId, key });
    const total = value ?? 0;
    if (!total) return [{ type: "reply", content: "Você nunca usou `!contar`. Comece agora." }];
    return [{ type: "reply", content: `Você usou \`!contar\` **${total}** vez(es).` }];
  }

  return [{ type: "reply", content: `Comando \`${command}\` não existe aqui.` }];
}

async function onRequest(msg) {
  const { id, method, params = {} } = msg;

  try {
    switch (method) {
      case "initialize":
        log(`inicializado para ${(params.guilds ?? []).length} servidor(es)`);
        return send({ jsonrpc: "2.0", id, result: { ok: true } });

      case "handleCommand":
        return send({ jsonrpc: "2.0", id, result: await handleCommand(params) });

      case "handleEvent":
        return send({ jsonrpc: "2.0", id, result: [] });

      case "health":
        return send({ jsonrpc: "2.0", id, result: { ok: true, detail: "contador ativo" } });

      case "shutdown":
        send({ jsonrpc: "2.0", id, result: { ok: true } });
        return process.exit(0);

      default:
        return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `método desconhecido: ${method}` } });
    }
  } catch (err) {
    log(`erro em ${method}: ${err.message}`, "error");
    send({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
  }
}

rl.on("line", (line) => {
  const text = line.trim();
  if (!text) return;

  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    return log(`linha inválida: ${text.slice(0, 80)}`, "warn");
  }

  if (typeof msg.method === "string") return void onRequest(msg);

  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(msg.error.message ?? "erro no core"));
  else p.resolve(msg.result ?? {});
});

log("contador iniciado");
