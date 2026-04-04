export function createLogger(scope, sink) {
  return (message, details) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${scope}]`;

    if (details !== undefined) {
      console.log(prefix, message, details);
    } else {
      console.log(prefix, message);
    }

    sink?.(`${timestamp} ${prefix} ${message}`);
  };
}