import Cabinet from './cabinet.js'

function Space (repository) {
  this.repository = repository
  this.cabinets = {}
}

Space.prototype.getCabinet = function (name) {
  if (this.cabinets[name] === undefined) {
    this.cabinets[name] = new Cabinet(this.repository, name)
  }
  return this.cabinets[name]
}

export default Space
