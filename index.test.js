import Cabinet from './index.js'
import { v4 as uuidv4 } from 'uuid'

test('Create empty Cabinet, no keys', () => {
  const cabinet = new Cabinet()
  const keys = cabinet.getKeys()
  expect(keys).toEqual([])
})

test('Create empty Cabinet, add version, get latest version', () => {
  const cabinet = new Cabinet()
  const uuid = uuidv4()
  cabinet.addVersionByKey('/', uuid)
  const version = cabinet.getLatestVersionByKey('/')
  expect(version).toEqual(uuid)
})

test('Create empty Cabinet, add version, get versions', () => {
  const cabinet = new Cabinet()
  const uuid = uuidv4()
  cabinet.addVersionByKey('/', uuid)
  const versions = cabinet.getVersionsByKey('/')
  expect(versions).toEqual([uuid])
})

test('Create empty Cabinet, add version, key includes version', () => {
  const cabinet = new Cabinet()
  const uuid = uuidv4()
  cabinet.addVersionByKey('/', uuid)
  const includesVersion = cabinet.keyIncludesVersion('/', uuid)
  expect(includesVersion).toEqual(true)
})

test('Create empty Cabinet, set state, get state', () => {
  const cabinet = new Cabinet()
  cabinet.setState('/', { x: 50, y: 100 })
  const state = cabinet.getState('/')
  expect(state).toEqual({ x: 50, y: 100 })
})

test('Create empty Cabinet, set shelf, get shelf', () => {
  const cabinet = new Cabinet()
  const uuid = uuidv4()
  cabinet.setShelf('/', [0, 0], uuid)
  const shelf = cabinet.getShelf('/')
  expect(shelf).toEqual([0, 0])
})

test('Create two cabinets and send data', () => {
  const cabinet = new Cabinet()
  const cabinet2 = new Cabinet()
  const uuid = uuidv4()
  cabinet.setShelf('/', [0, 0], uuid)
  // Do these two need to be bundled together so they don't get chosen separately? I think so.
  const shelf = cabinet.getShelf('/')
  const version = cabinet.getLatestVersionByKey('/')
  cabinet2.setShelf('/', shelf, version)
  const shelf2 = cabinet2.getShelf('/')
  expect(shelf2).toEqual(shelf)
})

test('Sync two cabinets with different values', () => {
  const cabinet = new Cabinet()
  const cabinet2 = new Cabinet()
  const uuid = uuidv4()
  const uuid2 = uuidv4()
  cabinet.setShelf('/', [{ x: [25, 0], y: [50, 0] }, 0], uuid)
  cabinet2.setShelf('/', [{ x: [100, 1] }, 0], uuid2)
  const shelf2 = cabinet2.getShelf('/')
  const version2 = cabinet2.getLatestVersionByKey('/')
  cabinet.setShelf('/', shelf2, version2)
  const shelf = cabinet.getShelf('/')
  expect(shelf).toEqual([{ x: [100, 1], y: [50, 0] }, 0])
})
