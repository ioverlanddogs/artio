export function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
