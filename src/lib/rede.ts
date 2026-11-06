/** Chamada à API pelo navegador com tempo limite e mensagens claras: a tela nunca fica presa esperando. */
export async function chamarApi<T = Record<string, unknown>>(url: string, init: RequestInit = {}, limiteMs = 90_000): Promise<T & { erro?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), limiteMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const texto = await r.text();
    try {
      return JSON.parse(texto);
    } catch {
      if (r.status === 413) return { erro: "Arquivo grande demais para envio. Tire uma foto da notificação (o app reduz o tamanho) ou envie um PDF de até 4 MB." } as T & { erro: string };
      if (r.status === 504 || r.status === 502) return { erro: "O servidor demorou para responder. Tente de novo em instantes; nada foi cobrado." } as T & { erro: string };
      return { erro: `Não foi possível concluir (erro ${r.status}). Tente de novo; nada foi cobrado.` } as T & { erro: string };
    }
  } catch (e) {
    const abortado = (e as Error).name === "AbortError";
    return { erro: abortado ? "Está demorando mais que o normal. Verifique sua internet e tente de novo; nada foi cobrado." : "Sem conexão com o servidor. Verifique sua internet e tente de novo." } as T & { erro: string };
  } finally {
    clearTimeout(t);
  }
}
