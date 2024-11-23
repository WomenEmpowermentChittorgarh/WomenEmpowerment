const {createLogger, format, transports} = require("winston");

const logger = createLogger({
  level: "debug",
  format: format.json(),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
      //
      // - Write all logs with importance level of `info` or higher to `combined.log`
      //   (i.e., fatal, error, warn, and info, but not trace)
      //
      new transports.File({ filename: 'combined.log' }),
],
  
});

module.exports = logger;