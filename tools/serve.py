# Dev server: static files with no-store caching so edits show up immediately.
# Usage: python tools/serve.py [port] [host]   (host 0.0.0.0 = reachable from other devices on the Wi-Fi)
import http.server, socketserver, sys, os
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
HOST = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass
# Threaded: browsers open spare connections and keep them idle, which would stall a single-threaded server.
class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
with Server((HOST, PORT), H) as httpd:
    print('serving on http://%s:%d' % (HOST, PORT), flush=True)
    httpd.serve_forever()
