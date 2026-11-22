# Expense Management System

Three-tier AWS deployment using a static HTML/CSS/JavaScript frontend served by Node.js/Express, a Node.js/Express REST API, and MySQL.

## Architecture

Browser → Frontend EC2 (Express, port 3000; Nginx can expose port 80) → Backend EC2 (Express, port 5000) → Database EC2 (MySQL, port 3306).

The frontend JavaScript calls `/api/expenses`. Configure Nginx on the frontend to proxy `/api/` to the backend private address.

## Project layout

- `frontend/` — supplied frontend source
- `backend/` — supplied REST API and MySQL connection pool
- `database/schema.sql` — schema reconstructed from the API's column usage; validate against the live database before applying
- `deployment/systemd/` — service unit templates based on the supplied paths and ports
- `deployment/nginx/` — example reverse-proxy site configuration
- `.env.example` files — variable names only; never commit real credentials

## Setup

1. Copy the relevant `.env.example` to `.env` and set real values on the appropriate server.
2. Install dependencies with `npm install`.
3. Start each application with `npm start`, or install the matching systemd unit.
4. On the frontend server, configure Nginx to serve the frontend and proxy `/api/` to the backend private IP.
5. Restrict security groups: public HTTP/HTTPS only to the frontend; backend port 5000 only from frontend; MySQL 3306 only from backend.

## Important

- The database name observed in the supplied MySQL output is `transactions`.
- The configured database account observed was `expense` with host pattern `172.31.%`.
- Never place the database password, private SSH keys, or production `.env` files in Git.
- The supplied global `/etc/nginx/nginx.conf` is represented as a reference file; site-specific proxy routing must be configured separately.
- The schema file is a reconstruction from the API fields (`id`, `title`, `amount`, `category`, `description`, `expense_date`), not a verified dump of the live database.
