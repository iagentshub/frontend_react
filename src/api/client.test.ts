import { describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

describe("api client", () => {
  it("envía idioma y devuelve JSON", async () => {
    document.documentElement.lang = "en";
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get<{ ok: boolean }>("/api/example")).resolves.toEqual({ ok: true });
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get("Accept-Language")).toBe("en");
    expect(requestInit?.credentials).toBe("same-origin");
  });

  it("convierte errores FastAPI en ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ detail: [{ msg: "Campo obligatorio" }] }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await api.get("/api/example", undefined, false).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: "Campo obligatorio" });
  });

  it("serializa cuerpos JSON sin añadir Content-Type a FormData", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/api/example", { name: "Gaia" });
    const jsonInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(jsonInit?.headers).get("Content-Type")).toBe("application/json");
    expect(jsonInit?.body).toBe(JSON.stringify({ name: "Gaia" }));

    const formData = new FormData();
    formData.set("file", new Blob(["test"]), "test.txt");
    await api.upload("/api/upload", formData);
    const uploadInit = fetchMock.mock.calls[1]?.[1];
    expect(new Headers(uploadInit?.headers).has("Content-Type")).toBe(false);
  });
});
