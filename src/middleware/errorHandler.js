export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ error: message });
}
