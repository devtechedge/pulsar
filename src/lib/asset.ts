/**
 * basePath helper — prefixes asset URLs when deployed under a subpath
 * (e.g. GitHub Pages: username.github.io/pulsar/).
 *
 * Next.js handles <Link> and next/image automatically, but raw <img src="/foo">,
 * CSS url(/foo), and metadata icon paths need manual prefixing.
 *
 * Usage:
 *   <img src={asset("/pulsar.svg")} />
 *   icons: { icon: asset("/favicon.svg") }
 */

export function asset(path: string): string {
  // Respect runtime basePath (set by Next.js via process.env at build).
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  if (!path.startsWith("/")) path = "/" + path;
  return `${base}${path}`;
}
