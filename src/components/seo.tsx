import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { localizedPublicPath, type PublicBasePath } from "@/i18n/public-paths";

// Origen canónico de la instancia pública. Los buscadores necesitan URLs
// absolutas y estables: no se deriva de window.location para que un despliegue
// detrás de otro dominio (staging, preview) no genere canónicos duplicados.
export const SITE_URL = "https://www.iagentshub.com";
export const SITE_NAME = "iAgents Hub";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_IMAGE_ALT = {
  es: "iAgents Hub, plataforma para crear y orquestar agentes de IA",
  en: "iAgents Hub, a platform for building and orchestrating AI agents",
} as const;

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let tag = document.head.querySelector<HTMLLinkElement>(selector);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    if (hreflang) tag.setAttribute("hreflang", hreflang);
    document.head.append(tag);
  }
  tag.setAttribute("href", href);
}

function removeLanguageAlternates() {
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')
    .forEach((tag) => tag.remove());
}

export type SeoProps = {
  /** Título completo de la pestaña; se usa tal cual en <title> y og:title. */
  title: string;
  description: string;
  /** Ruta absoluta desde la raíz, incluida la barra final si la ruta la tiene. */
  path: string;
  /** Páginas privadas, de autenticación o de error: fuera del índice. */
  noindex?: boolean;
  image?: string;
  imageAlt?: string;
  localizedPath?: PublicBasePath;
};

/**
 * Escribe las etiquetas <head> de la ruta activa.
 *
 * Actualiza en sitio las etiquetas que ya vienen en index.html en vez de
 * añadir nuevas (que es lo que hace el hoisting nativo de React 19): así nunca
 * hay dos <title> ni dos description compitiendo, y el prerender de build
 * captura exactamente un juego de metadatos por ruta.
 */
export function Seo({
  title,
  description,
  path,
  noindex = false,
  image,
  imageAlt,
  localizedPath,
}: SeoProps) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "es";

  useEffect(() => {
    const canonicalPath = localizedPath ? localizedPublicPath(localizedPath, language) : path;
    const url = `${SITE_URL}${canonicalPath}`;
    const ogImage = image ?? DEFAULT_OG_IMAGE;
    const ogImageAlt = imageAlt ?? DEFAULT_IMAGE_ALT[language];

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1",
    );
    upsertLink("canonical", url);
    removeLanguageAlternates();
    if (localizedPath) {
      upsertLink("alternate", `${SITE_URL}${localizedPublicPath(localizedPath, "es")}`, "es");
      upsertLink("alternate", `${SITE_URL}${localizedPublicPath(localizedPath, "en")}`, "en");
      upsertLink(
        "alternate",
        `${SITE_URL}${localizedPublicPath(localizedPath, "es")}`,
        "x-default",
      );
    }

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", language === "en" ? "en_US" : "es_ES");
    upsertMeta("property", "og:locale:alternate", language === "en" ? "es_ES" : "en_US");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:image:secure_url", ogImage);
    upsertMeta("property", "og:image:type", "image/png");
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", ogImageAlt);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);
    upsertMeta("name", "twitter:image:alt", ogImageAlt);
  }, [title, description, path, noindex, image, imageAlt, localizedPath, language]);

  return null;
}
