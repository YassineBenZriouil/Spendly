// Fixed time zone with DST so local-day boundary tests are deterministic on any machine
module.exports = () => {
  process.env.TZ = 'America/New_York';
};
