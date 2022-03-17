import EventEmitter from 'events'
import {
  createShelf,
  getLocalChanges,
  applyOp,
  applyOps,
} from './shelf-op.js'

function CabinetOp () {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.shelfEmitter = new EventEmitter()
  this.shelfEmitter.setMaxListeners(0)
  this.store = {}
}

CabinetOp.prototype.getKeys = function() {
  return Object.keys(this.store)
}

CabinetOp.prototype.removeShelf = function(key) {
  delete this.store[key]
}

CabinetOp.prototype.getState = function(key) {
  return this.store[key]?.value || null
}

CabinetOp.prototype.setState = function (key, state) {
  const shelf = this.store[key]
  if (shelf) {
    const localChanges = getLocalChanges(shelf.value, state, shelf.versions)
    this.setShelf(key, applyOps(shelf, localChanges))
  } else {
    this.setShelf(key, createShelf(state))
  }
}

CabinetOp.prototype.getShelf = function(key) {
  return this.store[key] || null
}

CabinetOp.prototype.setShelf = function(key, shelf) {
  this.store[key] = shelf

  this.shelfEmitter.emit(
    key,
    key,
    this.store[key],
  )
  if (this.emitter.listenerCount(key) > 0) {
    this.emitter.emit(
      key,
      key,
      this.getState(key),
    )
  }
}

CabinetOp.prototype.applyOp = function(key, op) {
  if (this.store[key]) {
    this.setShelf(key, applyOp(this.store[key], op))
  }
}

CabinetOp.prototype.applyOps = function(key, ops) {
  if (this.store[key]) {
    this.setShelf(key, applyOps(this.store[key], ops))
  }
}

CabinetOp.prototype.addSubscription = function(key, callback) {
  this.emitter.addListener(key, callback)
}

CabinetOp.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
}

CabinetOp.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

CabinetOp.prototype.addShelfSubscription = function(key, callback) {
  this.shelfEmitter.addListener(key, callback)
}

CabinetOp.prototype.removeShelfSubscription = function(key, callback) {
  this.shelfEmitter.removeListener(key, callback)
}

CabinetOp.prototype.getShelfSubscriptionCount = function(key) {
  this.shelfEmitter.listenerCount(key)
}

export default CabinetOp
