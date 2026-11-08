// Test process only. Never preload in the deployed Functions runtime.
const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const allowed = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host));
function check(host) {
  if (!allowed(host)) throw new Error('Migration test blocked external network destination');
}
for (const module of [net, tls]) {
  const original = module.connect;
  module.connect = function (...args) {
    const options = args[0];
    check(typeof options === 'object' ? options.host || options.hostname || 'localhost' : typeof args[1] === 'string' ? args[1] : 'localhost');
    return original.apply(this, args);
  };
}
for (const module of [http, https]) {
  for (const name of ['request', 'get']) {
    const original = module[name];
    module[name] = function (...args) {
      const options = args[0];
      check(typeof options === 'string' || options instanceof URL ? new URL(options).hostname : options.hostname || options.host || 'localhost');
      return original.apply(this, args);
    };
  }
}
const originalFetch = global.fetch;
global.fetch = (input, ...args) => {
  check(new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname);
  return originalFetch(input, ...args);
};
