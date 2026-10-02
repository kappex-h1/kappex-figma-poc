// HTTP Header Capture — preloaded via NODE_OPTIONS="--require=./header-hook.cjs"
// Patches http.createServer to log all incoming request headers
// Results written to public/headers.txt
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const OUT = path.join(process.cwd(), 'public', 'headers.txt');
try { fs.mkdirSync(path.dirname(OUT), { recursive: true }); } catch(e) {}
fs.writeFileSync(OUT, '=== HEADER CAPTURE START ' + new Date().toISOString() + ' ===\n');

let count = 0;

function patchServer(original) {
  return function() {
    const server = original.apply(this, arguments);
    const origEmit = server.emit.bind(server);
    server.emit = function(event) {
      if (event === 'request') {
        const req = arguments[1];
        if (req && req.headers && count < 200) {
          count++;
          let entry = '\n--- REQUEST #' + count + ' ' + new Date().toISOString() + ' ---\n';
          entry += 'METHOD: ' + req.method + '\n';
          entry += 'URL: ' + req.url + '\n';
          entry += 'HTTP_VERSION: ' + req.httpVersion + '\n';
          const hdrs = req.rawHeaders || [];
          for (let i = 0; i < hdrs.length; i += 2) {
            entry += 'HEADER: ' + hdrs[i] + ': ' + hdrs[i+1] + '\n';
          }
          entry += 'REMOTE: ' + req.socket.remoteAddress + ':' + req.socket.remotePort + '\n';
          try { fs.appendFileSync(OUT, entry); } catch(e) {}
        }
      }
      return origEmit.apply(this, arguments);
    };
    return server;
  };
}

http.createServer = patchServer(http.createServer);
https.createServer = patchServer(https.createServer);
