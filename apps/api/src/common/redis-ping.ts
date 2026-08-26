import net from "node:net";

/** Lightweight Redis PING without adding a client dependency. */
export async function pingRedis(url: string, timeoutMs = 2000): Promise<void> {
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (!host) throw new Error("REDIS_URL is missing a host");
  const port = Number(parsed.port || 6379);
  const password = parsed.password ? decodeURIComponent(parsed.password) : "";

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error("Redis ping timeout")), timeoutMs);
    let buf = "";
    socket.on("connect", () => {
      if (password) {
        socket.write(`AUTH ${password}\r\nPING\r\n`);
      } else {
        socket.write("PING\r\n");
      }
    });
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.includes("+PONG")) {
        finish();
        return;
      }
      if (buf.includes("-NOAUTH") || buf.includes("-WRONGPASS") || buf.includes("-ERR")) {
        const line = buf.split("\r\n")[0] || buf.slice(0, 80);
        finish(new Error(`Redis ${line}`));
      }
    });
    socket.on("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
  });
}
