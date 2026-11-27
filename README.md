# plugin starter — Node

Plugin de exemplo mínimo para a [plugin platform](https://github.com/giomartinsdev/discord-plugin-platform). Conta quantas vezes
cada membro usou `!contar`. Zero dependência — só `node:readline`.

## Rodar

```bash
git clone https://github.com/giomartinsdev/discord-plugin-platform
git clone https://github.com/giomartinsdev/plugin-starter-node
cd discord-plugin-platform

node core/cli.js conformance ../plugin-starter-node
node core/cli.js install ../plugin-starter-node
node core/cli.js simulate contador contar

# ou direto, sem o core:
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"guilds":[]}}' \
  '{"jsonrpc":"2.0","id":2,"method":"handleCommand","params":{"command":"contagem","userId":"1","guildId":"1"}}' \
  | node ../plugin-starter-node/main.js
```

## Comandos de teste

| comando | resposta esperada |
|---|---|
| `!contar` | `<@1> chegou a **1**.` e, a cada 10, mais `10 é um número redondo!` |
| `!contagem` | `Você usou !contar **1** vez(es).` |
| `!contagem` (primeira vez) | `Você nunca usou !contar. Comece agora.` |
| `!outro` | `Comando outro não existe aqui.` |

## O contrato

- `stdout`: JSON-RPC 2.0, uma mensagem por linha. Nada mais.
- `stderr`: log livre.
- Chamadas ao core (`kv.get`, `economy.grant`, …) são síncronas: escreva o pedido e leia linhas até
  achar o seu `id`.
- O plugin nunca recebe o token do Discord.

Veja [`PROTOCOL.md`](https://github.com/giomartinsdev/discord-plugin-platform/blob/main/PROTOCOL.md).

## Por que a fila de promises

O core serializa as chamadas principais, então durante uma chamada ao core nada mais chega. Ainda
assim, guardar em `pending` deixa o código correto se o core um dia paralelizar — e é o mesmo padrão
dos plugins maiores.
