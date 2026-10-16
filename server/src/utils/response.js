export function ok(res, data, status = 200) {
  return res.status(status).json({ data, error: null });
}

export function fail(res, status, code, message) {
  return res.status(status).json({ data: null, error: { code, message } });
}

export function notImplemented(req, res) {
  return fail(res, 501, "NOT_IMPLEMENTED", "This endpoint will be built in a later phase.");
}
