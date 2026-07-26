import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Seo, SITE_URL } from "./seo";

function head(selector: string) {
  return document.head.querySelector(selector);
}

describe("Seo", () => {
  it("escribe título, descripción, canónico y Open Graph de la ruta", () => {
    render(<Seo title="Precios · iAgents Hub" description="Planes y precios" path="/pricing/" />);

    expect(document.title).toBe("Precios · iAgents Hub");
    expect(head('meta[name="description"]')).toHaveAttribute("content", "Planes y precios");
    expect(head('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/pricing/`);
    expect(head('meta[property="og:url"]')).toHaveAttribute("content", `${SITE_URL}/pricing/`);
    expect(head('meta[property="og:title"]')).toHaveAttribute("content", "Precios · iAgents Hub");
    expect(head('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE_URL}/og-image.png`,
    );
    expect(head('meta[name="twitter:image:alt"]')).toHaveAttribute(
      "content",
      expect.stringContaining("iAgents Hub"),
    );
    expect(head('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow, max-image-preview:large, max-snippet:-1",
    );
  });

  it("no duplica etiquetas al cambiar de ruta", () => {
    const { rerender } = render(<Seo title="Uno" description="Primera" path="/" />);
    rerender(<Seo title="Dos" description="Segunda" path="/about" />);

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head('meta[name="description"]')).toHaveAttribute("content", "Segunda");
    expect(head('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/about`);
  });

  it("marca noindex las páginas privadas", () => {
    render(<Seo title="Login" description="Acceso" path="/login/" noindex />);

    expect(head('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  it("publica canonical y alternates reciprocos para paginas localizadas", () => {
    render(
      <Seo
        title="Documentacion - iAgents Hub"
        description="Guia"
        path="/docs"
        localizedPath="/docs"
      />,
    );

    expect(head('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/docs`);
    expect(head('link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/docs`,
    );
    expect(head('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/en/docs`,
    );
    expect(head('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/docs`,
    );
  });
});
