module.exports = (req, res, next) => {
  const allowIps = [
    '::1',
    '127.0.0.1',
    '::ffff:127.0.0.1',
  ];

  const ip = req.ip;

  if (allowIps.includes(ip)) return next();

  return res.status(401).json({
    message: 'You are not authorized',
    ip,
  });
};
