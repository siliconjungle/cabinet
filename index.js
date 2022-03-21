import EventEmitter from 'events'
import {
  createShelf,
  getLocalChanges,
  applyOp,
  applyOps,
} from './shelf.js'

// Repository on the client would be a wrapper around local storage
// On the server it would be hooking into a database.
function Index (repository) {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.shelfEmitter = new EventEmitter()
  this.shelfEmitter.setMaxListeners(0)
  this.repository = repository
  this.store = {}
}

Index.prototype.getSubscribedKeys = function() {
  return Object.keys(this.store)
}

Index.prototype.getKeys = async function() {
  return (await this.repository.getKeys())
}

Index.prototype.removeShelfCache = function(key) {
  delete this.store[key]
}

Index.prototype.removeShelf = async function(key) {
  delete this.store[key]
  await this.repository.removeShelf(key)
}

Index.prototype.getState = async function(key) {
  return this.store[key]?.value || (await this.repository.getShelf(key).value) || null
}

Index.prototype.setState = function (key, state) {
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

Index.prototype.getShelf = async function(key) {
  return this.store[key] || (await this.repository.getShelf(key).value) || null
}

Index.prototype.setShelf = function(key, shelf) {
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

Index.prototype.applyOp = function(key, op) {
  if (this.store[key]) {
    this.setShelf(key, applyOp(this.store[key], op))
  }
}

Index.prototype.applyOps = function(key, ops) {
  if (this.store[key]) {
    this.setShelf(key, applyOps(this.store[key], ops))
  }
}

Index.prototype.initShelf = function(key) {
  this.repository.getShelfByKey(key).then(shelf => {
    // Detect differences between current shelf and shelf being returned
    this.setShelf(shelf)
  })
}

Index.prototype.addSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.emitter.addListener(key, callback)
}

Index.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelfCache(key)
  }
}

Index.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

Index.prototype.addShelfSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.shelfEmitter.addListener(key, callback)
}

Index.prototype.removeShelfSubscription = function(key, callback) {
  this.shelfEmitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelfCache(key)
  }
}

Index.prototype.getShelfSubscriptionCount = function(key) {
  this.shelfEmitter.listenerCount(key)
}

export default Index
