import EventEmitter from 'events'
import {
  createShelf,
  getLocalChanges,
  applyOp,
  applyOps,
} from './shelf-op.js'

// Repository on the client would be a wrapper around local storage
// On the server it would be hooking into a database.
function CabinetOp (repository) {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.shelfEmitter = new EventEmitter()
  this.shelfEmitter.setMaxListeners(0)
  this.repository = repository
  this.store = {}
}

CabinetOp.prototype.getSubscribedKeys = function() {
  return Object.keys(this.store)
}

CabinetOp.prototype.getKeys = async function() {
  return (await this.repository.getKeys())
}

CabinetOp.prototype.removeShelfCache = function(key) {
  delete this.store[key]
}

CabinetOp.prototype.removeShelf = async function(key) {
  delete this.store[key]
  await this.repository.removeShelf(key)
}

CabinetOp.prototype.getState = async function(key) {
  return this.store[key]?.value || (await this.repository.getShelf(key).value) || null
}

CabinetOp.prototype.setState = function (key, state) {
  if (this.store[key]) {
    const shelf = this.store[key]
    const localChanges = getLocalChanges(shelf.value, state, shelf.versions)
    const appliedOps = applyOps(shelf, localChanges)
    this.setShelf(key, appliedOps)
  } else {
    const shelf = createShelf(state)
    this.setShelf(key, shelf)
  }
}

CabinetOp.prototype.getShelf = async function(key) {
  return this.store[key] || (await this.repository.getShelf(key).value) || null
}

CabinetOp.prototype.setShelf = function(key, shelf) {
  this.store[key] = shelf
  // Currently not handling success / failure.
  this.repository.setShelfByKey(key, shelf)

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

CabinetOp.prototype.initShelf = function(key) {
  this.repository.getShelfByKey(key).then(shelf => {
    // Detect differences between current shelf and shelf being returned
    this.setShelf(shelf)
  })
}

CabinetOp.prototype.addSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.emitter.addListener(key, callback)
}

CabinetOp.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelfCache(key)
  }
}

CabinetOp.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

CabinetOp.prototype.addShelfSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.shelfEmitter.addListener(key, callback)
}

CabinetOp.prototype.removeShelfSubscription = function(key, callback) {
  this.shelfEmitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelfCache(key)
  }
}

CabinetOp.prototype.getShelfSubscriptionCount = function(key) {
  this.shelfEmitter.listenerCount(key)
}

export default CabinetOp
