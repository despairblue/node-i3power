const Promise = require('bluebird')
const dbus = require('dbus-native')
// const logger = require('tracer').colorConsole()

const constants = require('./constants')

const systemBus = dbus.systemBus()
const upowerService = Promise.promisifyAll(systemBus.getService(constants.UPowerServiceName))
let upower

const createDevice = Promise.coroutine(function * (name) {
  let properties = yield upowerService.getInterfaceAsync(
    name,
    constants.Interfaces.DBus.Properties
  )
  properties = Promise.promisifyAll(properties)

  const ret = {}
  const allProperties = yield properties.GetAllAsync(constants.Interfaces.Device)

  allProperties.forEach(property => {
    Object.defineProperty(
      ret,
      property[0],
      {
        get: function () {
          return properties.GetAsync(constants.Interfaces.Device, property[0])
            // only return the value not the type
            .then(v => v[1][0])
        }
      }
    )
  })

  return ret
})

export const EnumerateDevices = Promise.coroutine(function * () {
  if (!upower) {
    upower = yield upowerService.getInterfaceAsync(
      constants.UPowerObjectPath,
      constants.Interfaces.UPower
    )
    upower = Promise.promisifyAll(upower)
  }

  const devices = yield upower.EnumerateDevicesAsync()

  return Promise.all(devices.map(createDevice))
})
