import { requestContext } from '../context/request-context.js';

export function requestContextMiddleware(req, res, next) {
  const context = {
    userId: null,
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    customAction: null,
  };

  requestContext.run(context, () => next());
}
