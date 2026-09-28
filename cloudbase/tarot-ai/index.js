import http from "node:http";
import { once } from "node:events";
import tarotReading from "./tarot-reading.mjs";

const PORT = Number(process.env.PORT || 9000);
const API_PATH = "/tarot-api/tarot-reading";
const MAX_BODY_BYTES = 64 * 1024;

function jsonResponse(response, status, message) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify({ error: message }));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url || "/", `http://${incoming.headers.host || "localhost"}`);
    if (url.pathname !== API_PATH) {
      outgoing.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      outgoing.end("Not found");
      return;
    }

    const declaredLength = Number(incoming.headers["content-length"] || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      jsonResponse(outgoing, 413, "请求内容过长。");
      incoming.resume();
      return;
    }

    const body = incoming.method === "GET" || incoming.method === "HEAD" ? undefined : await readBody(incoming);
    const request = new Request(url, {
      method: incoming.method,
      headers: incoming.headers,
      body: body?.length ? body : undefined,
    });
    const result = await tarotReading(request);

    const headers = {};
    for (const [name, value] of result.headers) {
      if (!["connection", "transfer-encoding", "content-length"].includes(name.toLowerCase())) headers[name] = value;
    }
    outgoing.writeHead(result.status, headers);
    if (!result.body) {
      outgoing.end();
      return;
    }

    for await (const chunk of result.body) {
      if (!outgoing.write(Buffer.from(chunk))) await once(outgoing, "drain");
    }
    outgoing.end();
  } catch (error) {
    if (!outgoing.headersSent) jsonResponse(outgoing, Number(error.statusCode) || 500, "连接解读服务失败，请稍后重试。");
    else outgoing.destroy();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Tarot AI HTTP function listening on ${PORT}`);
});
