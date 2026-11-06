/* Senhor Multas · service worker
 * - Páginas: sempre da rede (dados sempre atuais); sem internet, mostra /offline.
 * - Arquivos estáticos do Next (/_next/static, com hash no nome): cache permanente.
 * - Ícones e imagens públicas: cache com atualização em segundo plano.
 * - Nunca guarda /api, dados de defesas, documentos ou qualquer requisição que não seja GET.
 */
const VERSAO = "sm-v1";
const ESTATICO = `${VERSAO}-estatico`;
const PAGINAS = `${VERSAO}-paginas`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGINAS).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/imprimir/")) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline")));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(ESTATICO).then(async (c) => (await c.match(req)) ?? fetch(req).then((r) => (r.ok && c.put(req, r.clone()), r))),
    );
    return;
  }
  if (/^\/(icons\/|favicon\.ico|apple-touch-icon\.png|og\.png)/.test(url.pathname)) {
    e.respondWith(
      caches.open(ESTATICO).then(async (c) => {
        const cache = await c.match(req);
        const rede = fetch(req).then((r) => (r.ok && c.put(req, r.clone()), r)).catch(() => cache);
        return cache ?? rede;
      }),
    );
  }
});
