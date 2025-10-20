export function getSite(): string {
  // subdomínio: kitsch.seusite.com → "kitsch"
  const host = window.location.hostname.split('.')[0];
  if (host && !['www','app'].includes(host)) return host.toLowerCase();
  // caminho: seusite.com/app/kitsch → "kitsch"
  const parts = window.location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('app');
  if (idx >= 0 && parts[idx+1]) return parts[idx+1].toLowerCase();
  return 'default';
}
