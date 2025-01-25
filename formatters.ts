export function formatFatalError (message) {
  return JSON.stringify({
    errors: [
      {
        type: 'JSONError',
        component: 'solcjs',
        severity: 'error',
        message,
        formattedMessage: 'Error: ' + message
      }
    ]
  });
}
