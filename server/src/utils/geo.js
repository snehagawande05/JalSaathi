export function parsePointEwkb(hex) {
  if (!hex || typeof hex !== "string") return null;
  try {
    const buf = Buffer.from(hex, "hex");
    if (buf.length < 25) return null;
    const lng = buf.readDoubleLE(9);
    const lat = buf.readDoubleLE(17);
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  } catch {
    return null;
  }
}

export function toPointWkt(lng, lat) {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
