# DigiConnect Print Station

The program that actually prints.

A customer scans the QR taped to your counter, chooses A4 or A3, black or
colour, uploads their file and pays. This program — running on the computer
your printer is plugged into — collects that job, prints it, and deletes the
file. Nobody in the shop opens the customer's document, and nothing of theirs
is left on the computer afterwards.

---

## Install it (Windows)

**The easy way.** In your partner dashboard, open **Print counter** and press
**Print Station download kijiye**. You get a zip with your key already inside —
nothing to paste.

1. Unzip the folder somewhere you will find it again. Do not run it from
   inside the zip.
2. Double-click **Start Print Station**.
3. If it asks for Node.js, install the **LTS** build from
   [nodejs.org](https://nodejs.org/en/download) and double-click again.

Every download issues a new key and retires the old one, so keep one folder on
one computer.

**The other way**, if the download is blocked. Open **PowerShell** and paste:

```powershell
irm https://www.rnos.in/print-station/install.ps1 | iex
```

Then copy your key from the dashboard into the settings page yourself. If
PowerShell refuses to run it, run `Set-ExecutionPolicy -Scope Process -Bypass`
first.

### Printing helper

The program fetches a small helper on first run, by itself. You do not install
anything. If it cannot be fetched, printing falls back to Windows' own PDF
viewer — still correct on copies, paper size and colour, just slower, one copy
at a time.

## Install it (macOS or Linux)

Download the folder, then:

```sh
./start-print-station.sh
```

Printing goes through CUPS (`lp`), which is already there. Nothing else to
install.

---

## Set it up

The program opens a page on your own computer at **http://localhost:7171**.

1. **Your key** — copy it from your partner dashboard under **Print counter**.
   It starts with `dcp_` and is shown only once. If you have lost it, issue a
   new one from the same screen; the old one stops working immediately.
2. **Printer** — pick the printer from the list. The list is what Windows or
   macOS itself reports, so if the printer is missing here it is missing from
   the computer too.
3. **Print a test page** — do this before your first customer. A page comes
   out of the tray, and you know the whole chain works.

If you used the download, steps 1 and 2 are already done for you.

Then leave it running. The window can be minimised, but closing it stops
printing.

---

## What the screen tells you

| It says | It means |
| --- | --- |
| **Connected** | Talking to the website. Jobs will print. |
| **Trying to reach the website…** | Your internet is down. Jobs are safe and will print when it returns. |
| **Stopped** | Something needs you — the message underneath says what. |
| **Waiting** | Jobs paid for and not yet printed. |

---

## When something goes wrong

**"Your key was refused."**
The key is wrong or has been replaced — most often because a newer download
retired it. Download the bundle again, or issue a new key from the dashboard.

**"The server cannot reach its database right now."**
Not your key, and nothing to re-paste. The site is having trouble; the program
keeps retrying and will pick up where it left off.

**"No internet."**
Nothing is lost. The jobs stay on the server and print the moment the
connection is back.

**"The printer did not accept the job."**
Paper, power, or an error light on the printer itself. Fix it, then use
**Print a test page** to confirm before the next customer.

**Nothing prints and the screen says Connected.**
The job is queueing against a different counter. Check the key belongs to this
shop — the shop's name appears next to the Connected light once it has spoken
to the website.

---

## What this program does with a customer's file

- Downloads it to a temporary folder only when it is about to print.
- Deletes it as soon as the print command returns — including when printing
  failed.
- Never writes a customer's file name or contents to a log file.
- Listens on `127.0.0.1` only, so nothing else on the shop's network — or the
  internet — can reach it.
- Stores your key in your own user profile, readable only by you.

The counter is at
`%LOCALAPPDATA%\DigiConnectPrintStation\config.json` on Windows and
`~/.config/digiconnect-print-station/config.json` elsewhere. Deleting it
resets the setup.

---

## For developers

Source of truth is `print-station/` in the repository. `public/print-station/`
is a copy for downloading, rebuilt with:

```sh
node scripts/build-print-station.mjs
```

`print-station/distribution.test.mjs` fails if the two drift apart. The rest
of the tests run with the main suite (`npm test`).
