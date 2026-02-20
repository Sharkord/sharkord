function parseCookie(cookieHeader: string | undefined, name: string) {
  if (cookieHeader === undefined) { return undefined }
  const cookies = cookieHeader.split(";").map(v => v.trim());
  for (const c of cookies) {
    if (c.startsWith(name + "=")) {
      return decodeURIComponent(c.slice(name.length + 1));
    }
  }
  return undefined;
}

export { parseCookie }