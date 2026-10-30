import { localStorage } from './local.js'
import { s3Storage } from './s3.js'
export function createStorage(config, { s3Client } = {}) {
  const drivers = {
    local: localStorage(config.storageDir),
    s3: s3Storage(config, s3Client),
  }
  const invoke = (method, args) => {
    const driver = drivers[args.driver]
    if (!driver) throw new Error('UNKNOWN_STORAGE_DRIVER')
    return driver[method](args)
  }
  return {
    put: (args) => invoke('put', args),
    get: (args) => invoke('get', args),
    delete: (args) => invoke('delete', args),
  }
}
