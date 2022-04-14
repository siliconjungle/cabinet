const SHELF_TYPES = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  NULL: 'null',
  OTHER: 'other',
}

export const SHELF_TYPE_RANKINGS = {
  'object': 0,
  'array': 1,
  'string': 2,
  'number': 3,
  'boolean': 4,
  'null': 5,
  'other': 6,
}

// All unsupported types are equal to one another.
// Should throw an unsupported error.
export const getShelfType = (value) => {
  if (value === null) return SHELF_TYPES.NULL
  if (Array.isArray(value)) return SHELF_TYPES.ARRAY
  return Object.keys(SHELF_TYPE_RANKINGS).includes(typeof value) ? typeof(value) : SHELF_TYPES.OTHER
}

const cabinetTypes = {}

const getCabinetTypes = () => Object.values(cabinetTypes)

const setCabinetTypeByName = (name, type) => {
  cabinetTypes[name] = type
}

const getCabinetTypeByName = name => cabinetTypes[name]

const getDeepValueByKey = (data, key) => {
  if (key.length === 0) {
    return data
  }
  if (data === null) {
    return undefined
  }
  let layer = data
  for (let i = 0; i < key.length - 1; i++) {
    layer = layer[key[i]]
    if (layer === null || layer === undefined) {
      return undefined
    }
  }

  layer = layer[key[key.length - 1]]

  return layer
}

// Currently validation only works on a per operation which means incomplete shelves can get through.
const validateChange = (cabinet, key, value) => {
  const cabinetType = cabinetTypes[cabinet]
  // Cabinets with no types added allow all values to be assigned
  if (cabinetType === undefined) {
    return true
  }

  const typeAtKey = getDeepValueByKey(cabinetType, key)
  return typeAtKey === getShelfType(value)
}
