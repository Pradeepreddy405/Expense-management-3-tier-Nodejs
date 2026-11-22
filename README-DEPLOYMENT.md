# Step-by-Step Deployment Guide

This guide rebuilds the Expense Tracker on three Ubuntu EC2 instances. Run commands on the server named in each heading. Use `sudo` where shown.

## Step 1 — Create AWS networking

Create or select one VPC and launch three Ubuntu EC2 instances:

1. Frontend EC2
2. Backend EC2
3. Database EC2

Record each instance's private IP. This lab previously used:

- Frontend: `172.31.32.210`
- Backend: `172.31.47.69`
- Database: `172.31.35.119`

These addresses can change when instances are recreated.

### Security groups

Use security-group references for server-to-server traffic:

| Security group | Inbound rule | Source |
|---|---|---|
| Frontend SG | TCP 8080 | Your public IP `/32` |
| Frontend SG | TCP 22 | Your public IP `/32` |
| Backend SG | TCP 5000 | Frontend SG |
| Backend SG | TCP 22 | Your public IP `/32` |
| Database SG | TCP 3306 | Backend SG |
| Database SG | TCP 22 | Your public IP `/32` |

Do not add public inbound rules for backend port 5000 or database port 3306. Outbound rules must permit the required connections. If you choose port 80 instead of 8080, consistently update Nginx and the security group.

## Step 2 — Prepare the Database EC2

Connect to Database EC2.

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

Allow MySQL to listen on the private network. Open the MySQL server configuration (Ubuntu commonly uses `/etc/mysql/mysql.conf.d/mysqld.cnf`):

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Set `bind-address` to the database instance's private IP, or `0.0.0.0` if you understand the network controls:

```ini
bind-address = 0.0.0.0
```

Restart and verify:

```bash
sudo systemctl restart mysql
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

Create the database and a least-privilege application account. Replace `BACKEND_PRIVATE_IP` with the backend's private IP and choose your own strong password:

```bash
sudo mysql
```

At the MySQL prompt:

```sql
CREATE DATABASE expense_tracker;

CREATE USER 'expense_user'@'BACKEND_PRIVATE_IP'
IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE
ON expense_tracker.*
TO 'expense_user'@'BACKEND_PRIVATE_IP';

FLUSH PRIVILEGES;

USE expense_tracker;
```

If you prefer a placeholder in the SQL, replace `BACKEND_PRIVATE_IP` with the actual IP before running the statement. Do not use the literal placeholder.

Create the table by running the contents of `database/schema.sql`, or paste:

```sql
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Exit MySQL:

```sql
EXIT;
```

## Step 3 — Prepare the Backend EC2

Connect to Backend EC2.

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-client
node --version
npm --version
```

Install the project files into `/opt/expense-tracker`. Copy the `backend/` directory from this repository to the server, then:

```bash
sudo mkdir -p /opt/expense-tracker
```

Copy the backend project files into `/opt/expense-tracker` (for example, using `scp`, Git, or a secure file transfer). The directory must contain `server.js`, `package.json`, `config/`, `controllers/`, and `routes/`.

Create the environment file:

```bash
sudo nano /opt/expense-tracker/.env
```

Use the following, replacing the DB host and password:

```env
PORT=5000
DB_HOST=DATABASE_PRIVATE_IP
DB_USER=expense_user
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD
DB_NAME=expense_tracker
DB_PORT=3306
```

Protect the secret file:

```bash
sudo chmod 640 /opt/expense-tracker/.env
```

Install dependencies:

```bash
cd /opt/expense-tracker
sudo npm install --omit=dev
```

Test connectivity to MySQL. If the MySQL client package name differs on your Ubuntu release, install the available MySQL client package:

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

At the MySQL prompt, run `SHOW TABLES;` and `EXIT;`.

### Create the backend service user

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-tracker \
  --no-create-home \
  --shell /usr/sbin/nologin expenseapp
```

Set ownership and secret permissions:

```bash
sudo chown -R expenseapp:expenseapp /opt/expense-tracker
sudo chmod 640 /opt/expense-tracker/.env
```

### Create backend log files

```bash
sudo mkdir -p /var/log/expense-tracker
sudo touch /var/log/expense-tracker/expense-tracker.log
sudo touch /var/log/expense-tracker/expense-tracker-error.log
sudo chown -R expenseapp:expenseapp /var/log/expense-tracker
sudo chmod 750 /var/log/expense-tracker
sudo chmod 640 /var/log/expense-tracker/*.log
```

### Install the systemd service

Copy `deploy/systemd/expense-tracker.service` to:

`/etc/systemd/system/expense-tracker.service`

Or create it:

```bash
sudo nano /etc/systemd/system/expense-tracker.service
```

Check that `ExecStart` points to the correct Node binary:

```bash
which node
```

If it is `/usr/bin/node`, the supplied service file is correct. Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-tracker
sudo systemctl status expense-tracker
```

View application logs:

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker.log
```

View service journal:

```bash
sudo journalctl -u expense-tracker -n 50 --no-pager
```

## Step 4 — Prepare the Frontend EC2

Connect to Frontend EC2.

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx
```

Create the frontend service user:

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-frontend \
  --no-create-home \
  --shell /usr/sbin/nologin frontendapp
```

Create the application directory and copy the contents of this repository's `frontend/` directory into it:

```bash
sudo mkdir -p /opt/expense-frontend
sudo chown -R frontendapp:frontendapp /opt/expense-frontend
```

Ensure Nginx can read files and traverse directories:

```bash
sudo find /opt/expense-frontend -type d -exec chmod 755 {} \;
sudo find /opt/expense-frontend -type f -exec chmod 644 {} \;
```

### Configure Nginx

Copy `deploy/nginx/expense-tracker.conf` to:

`/etc/nginx/conf.d/expense-tracker.conf`

Edit the `proxy_pass` IP so it matches the current Backend private IP:

```nginx
proxy_pass http://BACKEND_PRIVATE_IP:5000;
```

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Create the frontend service log directory used by this lab's service marker:

```bash
sudo mkdir -p /var/log/expense-frontend
sudo touch /var/log/expense-frontend/frontend.log
sudo touch /var/log/expense-frontend/frontend-error.log
sudo chown -R frontendapp:frontendapp /var/log/expense-frontend
sudo chmod 750 /var/log/expense-frontend
sudo chmod 640 /var/log/expense-frontend/*.log
```

### Install the frontend service marker

Copy `deploy/systemd/expense-frontend.service` to:

`/etc/systemd/system/expense-frontend.service`

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-frontend
sudo systemctl status expense-frontend
```

**Important architecture note:** The frontend is static files, not a long-running application process. `expense-frontend.service` is a `Type=oneshot` marker service that completes immediately (`active (exited)`). It does not serve HTTP traffic. Nginx is the actual web server and is independently enabled at boot by `nginx.service`. This mirrors the service arrangement in the lab; the frontend marker is optional and can be omitted in a simpler deployment.

## Step 5 — Test the complete application

From Frontend EC2:

```bash
curl -i http://localhost:8080/
curl -i http://BACKEND_PRIVATE_IP:5000/
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
curl -i http://localhost:8080/api/expenses
```

From your browser, open:

`http://FRONTEND_PUBLIC_IP:8080`

Add an expense through the form and confirm it appears in the history table.

## Step 6 — Test logs

### Backend application logs

On Backend EC2:

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker.log
```

Generate an API request from Frontend EC2 or your browser. The backend request-logging middleware writes method, URL, status code, and duration to this file.

### Nginx access and error logs

On Frontend EC2:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Generate a page request:

```bash
curl -i http://localhost:8080/
```

Nginx's default log paths are used. Separate custom Expense Tracker Nginx log files are intentionally deferred.

### Frontend marker logs

```bash
sudo cat /var/log/expense-frontend/frontend.log
sudo cat /var/log/expense-frontend/frontend-error.log
```

These files capture output from the marker service command, not Nginx requests. They may be empty.

## Step 7 — Verify boot startup

On Backend EC2:

```bash
sudo systemctl is-enabled expense-tracker
sudo systemctl status expense-tracker
```

On Frontend EC2:

```bash
sudo systemctl is-enabled nginx
sudo systemctl status nginx
sudo systemctl is-enabled expense-frontend
sudo systemctl status expense-frontend
```

When ready, reboot one instance at a time:

```bash
sudo reboot
```

Reconnect after the instance is reachable and repeat the service status checks. Also test the frontend URL and API after reboot.

## Step 8 — Database verification

On Database EC2:

```bash
sudo mysql
```

```sql
USE expense_tracker;
SHOW TABLES;
DESCRIBE expenses;
SELECT * FROM expenses ORDER BY id DESC;
EXIT;
```

## Completion checklist

- [ ] Frontend, backend, and database EC2 instances are in the intended VPC.
- [ ] Security groups permit only the required source-to-destination traffic.
- [ ] MySQL database, table, and application user exist.
- [ ] Backend can connect to MySQL over private networking.
- [ ] Backend runs as `expenseapp`.
- [ ] Backend systemd service is enabled and active.
- [ ] Backend logs are being written.
- [ ] Frontend files are owned by `frontendapp` and readable by Nginx.
- [ ] Nginx serves the frontend and proxies `/api/`.
- [ ] Nginx is enabled at boot.
- [ ] Frontend page can create and retrieve expenses.
- [ ] Reboot tests pass for frontend and backend.
