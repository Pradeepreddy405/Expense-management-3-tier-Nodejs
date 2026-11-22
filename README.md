# Expense Tracker — AWS Three-Tier Architecture

A beginner-friendly, reproducible deployment guide for a static HTML/CSS/JavaScript frontend, Node.js/Express backend, and MySQL database on three Ubuntu EC2 instances.

## 1. Architecture

```text
Browser
  |
  | HTTP :8080 (restrict source to your public IP/CIDR)
  v
Frontend EC2 — Nginx
  |  /opt/expense-frontend
  |  Nginx reverse proxy: /api/*
  |
  | Private TCP :5000
  v
Backend EC2 — Node.js + Express
  |  /opt/expense-tracker
  |  systemd: expense-tracker.service
  |
  | Private TCP :3306
  v
Database EC2 — MySQL
     Database: expense_tracker
```

Nginx serves static files and proxies `/api/` to the backend. The browser uses the relative URL `/api/expenses`, so it does not need the backend private IP.

## 2. Important: replace environment-specific values

The following are the private addresses from the working lab. They are examples for reproducing this exact environment, not permanent addresses:

| Component | Private IP used in this lab |
|---|---|
| Frontend | `172.31.32.210` |
| Backend | `172.31.47.69` |
| Database | `172.31.35.119` |

When rebuilding, use the private IPs assigned to your new EC2 instances. Update the Nginx `proxy_pass` and backend `.env` accordingly.

## 3. Repository layout

```text
expense-tracker-aws-three-tier/
├── README.md
├── README-DEPLOYMENT.md
├── README-TROUBLESHOOTING.md
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js
│   ├── controllers/expenseController.js
│   └── routes/expenseRoutes.js
├── database/
│   └── schema.sql
├── deploy/
│   ├── nginx/expense-tracker.conf
│   ├── systemd/expense-tracker.service
│   ├── systemd/expense-frontend.service
│   └── scripts/create-backend-user-and-directories.sh
└── .gitignore
```

## 4. What is included

- Frontend form and expense history table.
- Backend GET and POST API endpoints.
- MySQL schema and SQL user/database setup.
- Nginx static hosting and reverse proxy configuration.
- Dedicated Linux service users: `frontendapp` and `expenseapp`.
- Backend systemd service, restart policy, and boot enablement.
- Frontend service marker used in this lab, plus Nginx's real systemd service.
- Backend application logs and Nginx's standard access/error logs.
- Step-by-step deployment, verification, and troubleshooting instructions.

## 5. Security reminders

- Never commit `.env` or real database passwords.
- Keep MySQL private; allow TCP 3306 only from the backend security group.
- Allow TCP 5000 only from the frontend security group.
- Allow the frontend web port only from the intended client CIDR.
- Restrict SSH TCP 22 to your own public IP `/32`; do not use `0.0.0.0/0`.
- Do not expose MySQL or the Node.js port directly to the internet.
- Use HTTPS and a domain name before using this as a public production service.

## 6. Deployment

Follow [README-DEPLOYMENT.md](README-DEPLOYMENT.md) from top to bottom. For common failures, see [README-TROUBLESHOOTING.md](README-TROUBLESHOOTING.md).

## 7. Current project scope

The application currently implements **Create** and **Read** operations (POST and GET). Update and Delete endpoints are not included in this deployed version. The dedicated custom Nginx log files discussed as a possible future enhancement are intentionally not configured here; Nginx's standard logs remain available at `/var/log/nginx/access.log` and `/var/log/nginx/error.log`.
