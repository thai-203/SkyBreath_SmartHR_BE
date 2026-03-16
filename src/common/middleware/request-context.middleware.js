import { requestContext } from "../context/request-context";

export function requestContextMiddleware(req, res, next) {

  const context = {
    userId: null,
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null
  };

  requestContext.run(context, () => next());
}