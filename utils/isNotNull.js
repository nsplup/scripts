module.exports = function isNotNull (val) {
  return typeof val === 'string' && val.length > 0
}