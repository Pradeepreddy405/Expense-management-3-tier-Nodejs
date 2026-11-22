# Source provenance and validation notes

## Supplied source transcribed into this archive

- Frontend: `server.js`, `package.json`, `public/index.html`, `public/css/style.css`, `public/js/app.js`
- Backend: `server.js`, `package.json`, `db.js`, `test-db.js`
- Global Nginx configuration: reference transcription of the supplied `/etc/nginx/nginx.conf`
- MySQL observations: database `transactions`; account `expense`; host pattern `172.31.%`; port `3306`; authentication plugin observed as `caching_sha2_password`

## Reconstructed templates (not claimed as exact originals)

- `database/schema.sql`: inferred from backend SQL column names and validation constraints. Compare with `SHOW CREATE TABLE expenses\\G` before use.
- systemd units: templates generated from the observed application paths and ports. Compare with the live `systemctl cat` output.
- Nginx site configuration: example reverse proxy. The supplied global nginx.conf does not itself show the active virtual-host configuration.

## Important integration check

The frontend code requests `/api/expenses` from the same origin. The frontend Express server only serves static files and has no proxy middleware configured in the supplied `server.js`. Therefore, the Nginx site configuration (or another reverse proxy) must route `/api/` to the backend. The example site config does this.

The frontend `package.json` includes `http-proxy-middleware`, but the supplied frontend `server.js` does not use it. This archive preserves that source as supplied rather than silently changing its behavior.
