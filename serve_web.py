import http.server
import os
import socket
import socketserver
import sys
import webbrowser
from contextlib import suppress

# Serve the ./web directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
if not os.path.isdir(WEB_DIR):
    print("Error: web directory not found:", WEB_DIR)
    sys.exit(1)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    # Quiet logs a bit
    def log_message(self, format, *args):
        pass


def find_available_port(start_port: int, max_tries: int = 20) -> int:
    port = start_port
    for _ in range(max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                port += 1
    raise OSError("No available port found in range")


if __name__ == "__main__":
    # Allow override via PORT env var; fallback to 8000; then auto-increment if busy
    try:
        base_port = int(os.environ.get("PORT", "8000"))
    except ValueError:
        base_port = 8000
    port = find_available_port(base_port)

    with socketserver.ThreadingTCPServer(("", port), Handler) as httpd:
        url = f"http://localhost:{port}/index.html" # Opens the landing page
        print(f"Serving {WEB_DIR} at {url}")
        with suppress(Exception):
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")
            httpd.server_close()
