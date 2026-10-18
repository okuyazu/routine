#!/usr/bin/env python3
"""My Benchmarks — self-hosted local server.

Runs the app on your own workstation and keeps ALL its data in a `vault/`
folder right next to this file. Every device that can reach this server — your
PC, and your phone over your LAN or Tailscale — shares the same data live
(projects, to-dos, notes, and your weekly tallies/streaks).

No dependencies: uses only the Python standard library.

    python server.py            # then open http://localhost:8777
    set PORT=9000 && python server.py   # choose a different port (Windows)
    PORT=9000 python server.py          # (macOS/Linux)

Stop with Ctrl+C. Your data lives in the `vault/` folder — back that up.

NOTE: the server has no password. Only expose it on networks you trust —
your Tailscale tailnet or home LAN — not the open internet.
"""
import http.server
import socketserver
import os
import json
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
VAULT = os.path.join(ROOT, "vault")
PORT = int(os.environ.get("PORT", "8777"))

# Paths under these prefixes are the editable data vault (read + write).
# Everything else is a static app file (read-only).
VAULT_PREFIXES = ("data/", "projects/", "inbox/", "todos/", "money/")


def is_vault_path(rel):
    return any(rel.startswith(p) for p in VAULT_PREFIXES)


def safe_join(base, rel):
    """Join and refuse anything that escapes `base` (path-traversal guard)."""
    rel = rel.lstrip("/")
    full = os.path.normpath(os.path.join(base, rel))
    if full != base and not full.startswith(base + os.sep):
        return None
    return full


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _rel(self):
        path = urllib.parse.urlparse(self.path).path
        return urllib.parse.unquote(path).lstrip("/")

    def _send(self, code, body=b"", ctype="application/octet-stream"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    # ---- reads ----
    def do_GET(self):
        rel = self._rel()
        if rel == "__server__":
            return self._send(200, '{"server":true}', "application/json")
        if is_vault_path(rel):
            vf = safe_join(VAULT, rel)              # user's saved copy wins
            if vf and os.path.isfile(vf):
                return self._send(200, open(vf, "rb").read(), self.guess_type(vf))
            bf = safe_join(ROOT, rel)               # fall back to the shipped base file
            if bf and os.path.isfile(bf):
                return self._send(200, open(bf, "rb").read(), self.guess_type(bf))
            return self._send(404, "not found", "text/plain")
        # static app files — but never expose dotfiles (.git, etc.)
        if rel.startswith(".") or "/." in rel:
            return self._send(404, "not found", "text/plain")
        return super().do_GET()

    # ---- writes (vault only) ----
    def do_PUT(self):
        rel = self._rel()
        if not is_vault_path(rel):
            return self._send(403, "writes are only allowed under the data vault", "text/plain")
        vf = safe_join(VAULT, rel)
        if not vf:
            return self._send(400, "bad path", "text/plain")
        data = self.rfile.read(int(self.headers.get("Content-Length", "0") or 0))
        os.makedirs(os.path.dirname(vf), exist_ok=True)
        with open(vf, "wb") as f:
            f.write(data)
        return self._send(200, '{"ok":true}', "application/json")

    def do_DELETE(self):
        rel = self._rel()
        if not is_vault_path(rel):
            return self._send(403, "forbidden", "text/plain")
        vf = safe_join(VAULT, rel)
        if vf and os.path.isfile(vf):
            os.remove(vf)
        return self._send(200, '{"ok":true}', "application/json")

    # ---- bulk import of an exported vault bundle ----
    def do_POST(self):
        rel = self._rel()
        if rel != "__import__":
            return self._send(404, "not found", "text/plain")
        try:
            raw = self.rfile.read(int(self.headers.get("Content-Length", "0") or 0))
            bundle = json.loads(raw.decode("utf-8"))
            if bundle.get("format") != "mybenchmarks-vault":
                return self._send(400, "not a My Benchmarks vault export", "text/plain")
            files = bundle.get("files", {})
            written = removed = 0
            for path, info in files.items():
                if not is_vault_path(path):
                    continue
                vf = safe_join(VAULT, path)
                if not vf:
                    continue
                if info.get("deleted"):
                    if os.path.isfile(vf):
                        os.remove(vf); removed += 1
                    continue
                os.makedirs(os.path.dirname(vf), exist_ok=True)
                with open(vf, "w", encoding="utf-8") as f:
                    f.write(info.get("text", ""))
                written += 1
            # shared mutable state (done toggles, counts, history, captures)
            overlays = bundle.get("overlays", {})
            sf = safe_join(VAULT, "data/state.json")
            os.makedirs(os.path.dirname(sf), exist_ok=True)
            with open(sf, "w", encoding="utf-8") as f:
                json.dump({"overlays": overlays}, f)
            return self._send(200, json.dumps({"ok": True, "written": written, "removed": removed}),
                              "application/json")
        except Exception as e:  # noqa: BLE001 — report any import failure to the client
            return self._send(400, "import failed: " + str(e), "text/plain")

    def log_message(self, *a):
        pass  # keep the console quiet


def main():
    os.makedirs(VAULT, exist_ok=True)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("My Benchmarks server is running.")
        print(f"  On this computer:   http://localhost:{PORT}")
        print(f"  From your phone:    http://<this-PC-IP>:{PORT}  (LAN or Tailscale)")
        print(f"  Your data folder:   {VAULT}")
        print("  (No password — only share on a network you trust.)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
