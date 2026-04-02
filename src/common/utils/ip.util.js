export const getClientIp = (req) => {
  return (
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.headers['x-real-ip'] || // Nginx
    req.headers['x-forwarded-for']?.split(',')[0].trim() || // Load balancer
    req.socket.remoteAddress
  );
};
