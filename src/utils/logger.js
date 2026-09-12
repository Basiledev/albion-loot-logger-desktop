const winston = require('winston')
const util = require('util')

const isProd = require('./is-prod')

const { combine, timestamp, printf, errors } = winston.format

const logger = winston.createLogger({
  format: combine(
    timestamp(),
    errors({ stack: true }),
    printf((params) => {
      const { timestamp, level, message } = params
      const extra = params[Symbol.for('splat')]

      if (extra) {
        return `${timestamp} [${level}]: ${
          typeof message === 'string' ? message : util.format(message)
        } ${util.format(extra)}`
      }

      return `${timestamp} [${level}]: ${
        typeof message === 'string' ? message : util.format(message)
      }`
    })
  ),
  transports: [
    new winston.transports.File({
      level: isProd() ? 'error' : 'debug',
      maxFiles: 2,
      maxsize: 1024 * 1024 * 5, // 10mb
      tailable: true,
      filename: 'debug-logs.txt',
      zippedArchive: true,
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.Console({
      // La console ne garde que les vraies erreurs — tout le détail (debug/warn/silly, un
      // event par paquet réseau) va uniquement dans debug-logs.txt. Les infos utiles
      // (loot ramassé, changement de map) sont imprimées directement via console.info
      // dans index.js, indépendamment de ce logger.
      level: 'error',
      handleExceptions: true,
      handleRejections: true
    })
  ]
})

module.exports = logger
