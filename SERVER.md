# Run My Benchmarks on your own workstation 🖥️

This runs the whole app on your PC and keeps **all your data in a `vault/`
folder** next to the code. Your phone reaches it over your private network
(Tailscale or home Wi-Fi), and **every device shares the same data live** —
projects, to-dos, notes, and your weekly tallies/streaks.

No installs beyond Python (which you already have).

---

## 1. Get the files onto your PC

Download the repo: **github.com/okuyazu/routine → green “Code” button →
Download ZIP**, then unzip it somewhere like `C:\MyBenchmarks`.

*(Or, if you use git: `git clone https://github.com/okuyazu/routine`.)*

## 2. Start the server

- **Windows:** double-click **`start-windows.bat`**.
- **Any OS, from a terminal:** `python server.py` (use `python3` on macOS/Linux).

Leave that window open. You’ll see:

```
My Benchmarks server is running.
  On this computer:   http://localhost:8777
  From your phone:    http://<this-PC-IP>:8777  (LAN or Tailscale)
  Your data folder:   ...\vault
```

Open **http://localhost:8777** in your browser. (To use a different port:
`set PORT=9000 && python server.py` on Windows.)

## 3. Reach it from your phone over Tailscale

1. Install **Tailscale** on both the PC and the phone (tailscale.com), sign in
   to the same account on both.
2. On the PC, find its Tailscale address: open the Tailscale app → it shows an
   IP like `100.x.y.z` (or a name like `my-pc`).
3. On the phone’s browser, go to **`http://100.x.y.z:8777`** → **Add to Home
   Screen** to install it like an app.

Now the phone and PC are the same app, same data.

*(On your home Wi-Fi without Tailscale, use the PC’s LAN IP, e.g.
`http://192.168.1.50:8777`. Windows Firewall may ask to allow Python the first
time — say yes for private networks.)*

## 4. Bring your existing data across

On whichever device currently has your data (the hosted app at
`okuyazu.github.io/routine`):

1. Open **⟳ → Backup & sync → ⬆ Export vault** and save the file.
2. Copy that file to the PC.
3. In the **server** app (http://localhost:8777), open **⟳ → Backup & sync →
   ⬇ Import vault** and pick the file. It uploads to the server, and every
   device sees it.

Your Hyrox project, to-do lists, and weekly streaks all come across.

---

## Good to know

- **Your data = the `vault/` folder.** Back it up (copy it, or point a cloud
  folder at it). Deleting it resets the app.
- **The server has no password.** Only expose it on a network you trust — your
  Tailscale tailnet or home LAN — never port-forward it to the open internet.
- **Keep the window open** while using the app. To have it start automatically
  on boot, add `start-windows.bat` to your Startup folder
  (`Win+R` → `shell:startup`).
- **The hosted version still works** too; the server is just an independent,
  self-contained copy. Pick one as your “main” and export/import if you ever
  want to move between them.
