const pkg = require('../package.json')
const Promise = require('bluebird')

const child_process = Promise.promisifyAll(require('child_process'))

const {partial} = require('ramda')
const program = require('commander')
const logger = require('tracer').colorConsole()

const {EnumerateDevices} = require('./upower')

program
  .version(pkg.version)
  .option('-t --time-action <float>', 'The time remaining in minutes of the battery when critical action is taken.', Number.parseFloat, 10)
  .option('-p --polling-interval <integer>', 'How often to poll the time left from dbus.', Number.parseInt, 10)
  .option('-r --repeat <bool>', 'Should the action be repeated?', opt => opt === 'true', false)
  .option('-a --action <string>', 'The action that\'s supposed to be done', 'echo Situation Critical!')
  .parse(process.argv)


let execute = true


const printTimeLeft = Promise.coroutine(function * (device) {
  if ((yield device.IsRechargeable) === true) {
    const minutesLeft = (yield device.TimeToEmpty) / 60

    logger.info(minutesLeft)

    setTimeout(partial(printTimeLeft, device), program.pollingInterval * 1000)

    if (minutesLeft < program.timeAction && minutesLeft > 0.0000001) {
      if (execute) {
        try {
          const [stdout, stderr] = yield child_process.execAsync(program.action)
          if (stderr) {
            logger.error(stderr)
          }

          logger.log(stdout)
        } catch (e) {
          logger.trace(e)
        }

        execute = program.repeat
      }
    } else {
      execute = true
    }
  }
})

export const start = Promise.coroutine(function * () {
  const devices = yield EnumerateDevices()

  devices.forEach(printTimeLeft)
})
