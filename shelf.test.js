import {
  createShelf,
  getDataFromShelf,
  createLocalChangesDiff,
} from './shelf.js'

test('Create single value shelf', () => {
  const shelf = createShelf(5)
  expect(shelf).toEqual([5, 0])
})

test('Create object shelf', () => {
  const shelf = createShelf({
    x: 50,
    y: 50,
    name: 'James',
    color: {
      r: 255,
      g: 0,
      b: 0,
    },
  })

  expect(shelf).toEqual([
    {
      x: [50, 0],
      y: [50, 0],
      name: ['James', 0],
      color: [
        {
          r: [255, 0],
          g: [0, 0],
          b: [0, 0],
        },
        0,
      ]
    },
    0
  ])
})

test('Create local changes, single value to single value', () => {
  const shelf = createShelf(5)
  const shelf2 = createLocalChangesDiff(shelf, 8)
  expect(shelf2).toEqual([8, 1])
})

test('Create local changes, single value to object value', () => {
  const shelf = createShelf(5)
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0] }, 1])
})

test('Create local changes, object value to single value', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, 5)
  expect(shelf2).toEqual([5, 1])
})

test('Create local changes, object value to object value', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 100, y: 50 })
  expect(shelf2).toEqual([{ x: [100, 1], y: [50, 0] }, 0])
})

test('Create local changes, add object', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0] }, 0] }, 0])
})

test('Create local changes, remove object', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 } })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [null, 1] }, 0])
})

test('Create local changes, object value add field', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, z: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], z: [50, 0] }, 0])
})

test('Create local changes, object value remove field', () => {
  const shelf = createShelf({ x: 50, y: 50, z: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], z: [null, 1] }, 0])
})

test('Create local changes, nested object update field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 0, g: 0, b: 255 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [0, 1], g: [0, 0], b: [255, 1] }, 0] }, 0])
})

test('Create local changes, nested object add field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0, a: 1 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0], a: [1, 0] }, 0] }, 0])
})

test('Create local changes, nested object remove field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0, a: 1 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0], a: [null, 1] }, 0] }, 0])
})

test('Create local changes, nested object add object', () => {
  const shelf = createShelf({ x: 50, y: 50, colorMap: {} })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, colorMap: { shirt: {} } })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], colorMap: [{ shirt: [{}, 0] }, 0] }, 0])
})

test('Create local changes, nested object remove object', () => {
  const shelf = createShelf({ x: 50, y: 50, colorMap: { shirt: {} } })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, colorMap: {} })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], colorMap: [{ shirt: [null, 1] }, 0] }, 0])
})

test('Create local changes, array', () => {
  const shelf = createShelf([0, 1, 2, 3, 4])
  const shelf2 = createLocalChangesDiff(shelf, [0, 2, 3])
  expect(shelf2).toEqual([[0, 2, 3], 1])
})

test('Create local changes, string', () => {
  const shelf = createShelf('Hello world')
  const shelf2 = createLocalChangesDiff(shelf, 'Hello world!')
  expect(shelf2).toEqual(['Hello world!', 1])
})

test('Create local changes, object with string field', () => {
  const shelf = createShelf({ x: 50, y: 100, name: 'James' })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 100, name: 'Greg' })
  expect(shelf2).toEqual([{ x: [50, 0], y: [100, 0], name: ['Greg', 1] }, 0])
})

test('Get data from shelf, single value', () => {
  const shelf = [50, 4]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual(50)
})

test('Get data from shelf, object', () => {
  const shelf = [{ x: [50, 0], y: [100, 1] }, 3]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 50, y: 100 })
})

test('Get data from shelf, array', () => {
  const shelf = [[25, 25], 3]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual([25, 25])
})

test('Get data from shelf, string', () => {
  const shelf = ['Hello world', 1]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual('Hello world')
})

test('Get data from shelf, object contains null fields', () => {
  const shelf = [{ x: [100, 0], y: [0, 0], z: [null, 1] }, 1]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 100, y: 0 })
})

test('Get data from shelf, nested objects', () => {
  const shelf = [{ x: [100, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [255, 0]}, 0] }]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 100, y: 50, color: { r: 255, g: 0, b: 255 } })
})

// Still needs tests for compareShelves, diffShelves and mergeShelves.
