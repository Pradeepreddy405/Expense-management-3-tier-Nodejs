# Expense Tracker — Complete AWS Three-Tier Deployment Guide

> **Purpose:** This README explains how to build, configure, deploy, test, monitor, and troubleshoot the Expense Tracker application from the beginning to the end.
>
> **Experience level:** Beginner-friendly. Follow the steps in order. Commands are labelled with the EC2 server where they must be executed.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [How the application works](#2-how-the-application-works)
3. [Project folder structure](#3-project-folder-structure)
4. [Prerequisites](#4-prerequisites)
5. [Plan the AWS environment](#5-plan-the-aws-environment)
6. [Create the security groups](#6-create-the-security-groups)
7. [Launch the three EC2 instances](#7-launch-the-three-ec2-instances)
8. [Connect to the instances](#8-connect-to-the-instances)
9. [Configure the database server](#9-configure-the-database-server)
10. [Configure the backend server](#10-configure-the-backend-server)
11. [Configure the frontend server](#11-configure-the-frontend-server)
12. [Deploy the application files](#12-deploy-the-application-files)
13. [Start and enable the services](#13-start-and-enable-the-services)
14. [Test the complete application](#14-test-the-complete-application)
15. [Verify the database records](#15-verify-the-database-records)
16. [Application and server logs](#16-application-and-server-logs)
17. [Reboot and automatic-startup verification](#17-reboot-and-automatic-startup-verification)
18. [Security recommendations](#18-security-recommendations)
19. [Troubleshooting guide](#19-troubleshooting-guide)
20. [Final completion checklist](#20-final-completion-checklist)
21. [Useful commands reference](#21-useful-commands-reference)
22. [Current project scope and limitations](#22-current-project-scope-and-limitations)

---

## 1. Project overview

This project is a simple Expense Tracker application deployed on **three Ubuntu EC2 instances** in AWS.

| Tier | AWS server | Technology | Purpose |
|---|---|---|---|
| Presentation | Frontend EC2 | HTML, CSS, JavaScript, Nginx | Displays the application in the browser |
| Application | Backend EC2 | Node.js, Express.js | Handles API requests and application logic |
| Data | Database EC2 | MySQL | Stores expense records |

The application supports:

- Adding a new expense.
- Retrieving and displaying saved expenses.
- Storing expense information in MySQL.
- Serving frontend files through Nginx.
- Forwarding frontend API requests to the backend through an Nginx reverse proxy.
- Running the backend as a Linux systemd service.
- Starting Nginx and the backend automatically after an EC2 reboot.
- Recording backend application logs and Nginx access/error logs.

### Example expense fields

| Field | Description |
|---|---|
| `id` | Automatically generated expense ID |
| `title` | Expense title |
| `amount` | Expense amount |
| `category` | Expense category |
| `expense_date` | Date of the expense |
| `description` | Optional description |
| `created_at` | Record creation timestamp |

---

## 2. How the application works

The request flow is:

```text
User's browser
     |
     | HTTP request to Frontend Public IP :8080
     v
Frontend EC2
     |
     | Nginx serves HTML, CSS and JavaScript
     |
     | Browser calls /api/expenses
     | Nginx proxies /api/* to Backend Private IP :5000
     v
Backend EC2
     |
     | Node.js + Express API
     | Validates/processes the request
     |
     | MySQL connection over private network :3306
     v
Database EC2
     |
     | expense_tracker database
     | expenses table
     v
Response returns through Backend -> Nginx -> Browser
```

**Important:** The browser does not connect directly to the database or to the backend private IP. It sends requests to the frontend's `/api/expenses` path. Nginx forwards those requests to the backend over the VPC's private network.

### Ports used

| Port | Protocol | Source | Destination | Purpose |
|---|---|---|---|---|
| 22 | TCP | Your public IP `/32` | All EC2 instances | SSH administration |
| 8080 | TCP | Your public IP `/32` | Frontend EC2 | Open the web application |
| 5000 | TCP | Frontend security group | Backend EC2 | Node.js API |
| 3306 | TCP | Backend security group | Database EC2 | MySQL connection |

Do not expose ports 5000 or 3306 to the public internet.

---

## 3. Project folder structure

After extracting the ZIP file, the project should look like this:

```text
expense-tracker-aws-three-tier/
├── README.md
├── README-DEPLOYMENT.md
├── README-TROUBLESHOOTING.md
├── PROJECT-NOTES.md
├── .gitignore
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── expenseController.js
│   └── routes/
│       └── expenseRoutes.js
│
├── database/
│   └── schema.sql
│
└── deploy/
    ├── nginx/
    │   └── expense-tracker.conf
    ├── systemd/
    │   ├── expense-tracker.service
    │   └── expense-frontend.service
    └── scripts/
        └── create-backend-user-and-directories.sh
```

### What each important file does

| File | Purpose |
|---|---|
| `frontend/index.html` | Page structure and expense form |
| `frontend/style.css` | Application design and layout |
| `frontend/script.js` | Calls the backend API and updates the page |
| `backend/server.js` | Starts Express and registers middleware/routes |
| `backend/config/db.js` | Creates the MySQL connection |
| `backend/controllers/expenseController.js` | Implements expense GET and POST operations |
| `backend/routes/expenseRoutes.js` | Maps API paths to controller functions |
| `backend/.env.example` | Template for backend environment variables |
| `database/schema.sql` | Creates the expenses table |
| `deploy/nginx/expense-tracker.conf` | Nginx web-root and reverse-proxy configuration |
| `deploy/systemd/expense-tracker.service` | Runs the backend through systemd |
| `deploy/systemd/expense-frontend.service` | Optional frontend marker service used in this lab |

---

## 4. Prerequisites

Before starting, make sure you have:

1. An AWS account with permission to create VPC resources, security groups, key pairs, and EC2 instances.
2. An SSH client. Windows 10/11 includes OpenSSH in PowerShell on most installations.
3. The project ZIP extracted on your computer.
4. A key pair (`.pem`) for connecting to the Ubuntu instances.
5. Your current public IPv4 address, to restrict SSH and frontend access.
6. Three Ubuntu EC2 instances in the same VPC and in network locations that can communicate privately.

### Important security note

Never share your `.pem` private key, database password, AWS secret keys, or the contents of your real `.env` file. Do not upload them to GitHub.

---

## 5. Plan the AWS environment

Use one VPC for all three instances. They need private network connectivity.

### Record your instance information

Fill in this table after launching the instances:

| Value | Your environment |
|---|---|
| AWS Region | `YOUR_AWS_REGION` |
| VPC ID | `YOUR_VPC_ID` |
| Frontend public IPv4 | `FRONTEND_PUBLIC_IP` |
| Frontend private IPv4 | `FRONTEND_PRIVATE_IP` |
| Backend private IPv4 | `BACKEND_PRIVATE_IP` |
| Database private IPv4 | `DATABASE_PRIVATE_IP` |
| Your public IPv4 CIDR | `YOUR_PUBLIC_IP/32` |

The working lab previously used these private addresses:

| Server | Lab private IP |
|---|---|
| Frontend | `172.31.32.210` |
| Backend | `172.31.47.69` |
| Database | `172.31.35.119` |

These are **reference values only**. Use the actual private addresses shown in your EC2 console. Private IPs can differ when instances are recreated.

### Recommended instance configuration

For a learning lab, a small Ubuntu instance is usually sufficient. Select an instance type appropriate to your account, region, budget, and workload. Check the current AWS pricing before launching.

For all three instances:

- AMI: Ubuntu Server LTS.
- Architecture: Keep the same architecture across the instances where possible.
- Key pair: Select your SSH key pair.
- VPC: Select the same VPC.
- Storage: Use an appropriate EBS volume for the OS and application.
- Public IP: A public IP is needed only if you intend to SSH directly over the internet. A private/bastion/VPN/Systems Manager access design is preferable for a hardened environment.

For this beginner lab, the frontend needs a reachable public endpoint for browser access. The backend and database do not need public inbound application ports.

---

## 6. Create the security groups

Create three security groups in the same VPC.

### 6.1 Frontend security group

Example name: `frontend_security_group`

Inbound rules:

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | `YOUR_PUBLIC_IP/32` |
| Custom TCP | TCP | 8080 | `YOUR_PUBLIC_IP/32` |

If the application must be publicly accessible to everyone, use an appropriate public web ingress design and HTTPS. For this lab, restricting port 8080 to your IP is safer.

### 6.2 Backend security group

Example name: `expense-backend-sg`

Inbound rules:

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | `YOUR_PUBLIC_IP/32` |
| Custom TCP | TCP | 5000 | Frontend security group |

For port 5000, select the **frontend security group as the source**, not `0.0.0.0/0`.

### 6.3 Database security group

Example name: `expense-database-sg`

Inbound rules:

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | `YOUR_PUBLIC_IP/32` |
| MySQL/Aurora | TCP | 3306 | Backend security group |

For port 3306, select the **backend security group as the source**.

### 6.4 Review the rules

Before continuing, verify:

- Frontend port 8080 is reachable from your intended client IP.
- Backend port 5000 accepts traffic only from the frontend security group.
- Database port 3306 accepts traffic only from the backend security group.
- SSH port 22 is restricted to your own public IP `/32`.
- No broad `All traffic` or public MySQL rules have been added unnecessarily.

Security groups are stateful, so response traffic for permitted connections is automatically allowed.

---

## 7. Launch the three EC2 instances

Launch three Ubuntu EC2 instances:

1. `Expense-Frontend`
2. `Expense-Backend`
3. `Expense-Database`

For each instance:

1. Open the EC2 console.
2. Choose **Launch instance**.
3. Enter the instance name.
4. Select an Ubuntu Server AMI.
5. Choose an instance type suitable for your lab.
6. Select your key pair.
7. Select the correct VPC and subnet.
8. Attach the matching security group.
9. Configure storage.
10. Launch the instance.

### Attach the correct security groups

| Instance | Security group |
|---|---|
| Expense-Frontend | Frontend security group |
| Expense-Backend | Backend security group |
| Expense-Database | Database security group |

After launch, open each instance's details and record its private IPv4 address. Also record the frontend public IPv4 address if one is assigned.

**Do not continue until all three instances are running and you have recorded their private IP addresses.**

---

## 8. Connect to the instances

The commands below are examples for Windows PowerShell. Replace the key path and public IP values.

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@FRONTEND_PUBLIC_IP
```

For backend and database servers, use their reachable public IPs if configured, or connect through your approved private access method, such as a bastion host, VPN, or AWS Systems Manager Session Manager.

Example SSH commands when those servers have reachable public IPs:

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@BACKEND_PUBLIC_IP
ssh -i "C:\path\to\your-key.pem" ubuntu@DATABASE_PUBLIC_IP
```

On Linux/macOS, restrict the key permissions if required:

```bash
chmod 400 /path/to/your-key.pem
```

After connecting, confirm the machine:

```bash
hostname
hostname -I
```

Use the correct server for every section below. Do not accidentally run database commands on the frontend server.

---

## 9. Configure the database server

**Run every command in this section on: Database EC2.**

### 9.1 Update Ubuntu and install MySQL

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y mysql-server
```

Enable and start MySQL:

```bash
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

The status should show `active (running)`.

### 9.2 Configure MySQL network listening

Open the MySQL server configuration:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Find the `bind-address` setting. Configure it to listen on the database instance's **private IP address**:

```ini
bind-address = DATABASE_PRIVATE_IP
```

Replace `DATABASE_PRIVATE_IP` with the actual private IP of this database EC2. If the configuration already has a suitable private bind address, do not add a duplicate setting.

Save the file and restart MySQL:

```bash
sudo systemctl restart mysql
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

The listener should be on the database private address and port 3306. Avoid binding to all interfaces unless you have a specific reason and have verified network controls.

### 9.3 Create the database and application user

Open the local MySQL shell:

```bash
sudo mysql
```

Run the following SQL. Replace `BACKEND_PRIVATE_IP` with the actual private IP of Backend EC2. Replace the sample password with a strong unique password of your own.

```sql
CREATE DATABASE expense_tracker;

CREATE USER 'expense_user'@'BACKEND_PRIVATE_IP'
IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE
ON expense_tracker.*
TO 'expense_user'@'BACKEND_PRIVATE_IP';

FLUSH PRIVILEGES;

USE expense_tracker;
```

**Important:** The string `BACKEND_PRIVATE_IP` is a placeholder. Do not run it literally. For example, if the backend private IP is `172.31.47.69`, the MySQL account host should be `'172.31.47.69'`.

The SQL account is restricted to connections from that backend IP. The database security group separately restricts network access to the backend security group.

### 9.4 Create the expenses table

You can run the SQL from `database/schema.sql`, or execute:

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

Verify:

```sql
SHOW DATABASES;
USE expense_tracker;
SHOW TABLES;
DESCRIBE expenses;
EXIT;
```

Expected table name:

```text
expenses
```

### 9.5 Confirm MySQL is enabled at boot

```bash
sudo systemctl is-enabled mysql
```

Expected result:

```text
enabled
```

---

## 10. Configure the backend server

**Run every command in this section on: Backend EC2.**

### 10.1 Update Ubuntu and install Node.js tools and MySQL client

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nodejs npm mysql-client
```

Check the installed versions:

```bash
node --version
npm --version
mysql --version
```

If `mysql-client` is not available for your Ubuntu release, install the MySQL client package offered by that release (for example, `mysql-client-core` or the distribution's equivalent).

### 10.2 Test the private connection to MySQL

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

Replace `DATABASE_PRIVATE_IP` with the actual database private IP. Enter the database password when prompted; it will not be displayed as you type.

At the MySQL prompt, run:

```sql
SHOW TABLES;
SELECT * FROM expenses;
EXIT;
```

If this connection fails, stop and troubleshoot the database bind address, MySQL user host, database security group, and private IP before configuring the Node.js service.

### 10.3 Create the application directory

The application will be installed at:

```text
/opt/expense-tracker
```

Create it:

```bash
sudo mkdir -p /opt/expense-tracker
```

Copy the **contents** of the repository's `backend/` directory into `/opt/expense-tracker`. The resulting layout must be:

```text
/opt/expense-tracker/
├── server.js
├── package.json
├── config/db.js
├── controllers/expenseController.js
└── routes/expenseRoutes.js
```

You can transfer the files using `scp`, a private Git repository, SFTP, or another secure method. Do not copy your real `.env` file into a public repository.

### 10.4 Create the backend environment file

```bash
sudo nano /opt/expense-tracker/.env
```

Add the following values and replace the database IP and password:

```env
PORT=5000
DB_HOST=DATABASE_PRIVATE_IP
DB_USER=expense_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=expense_tracker
DB_PORT=3306
```

Save the file.

Protect it:

```bash
sudo chmod 600 /opt/expense-tracker/.env
```

The file will later be owned by the restricted application user. Do not print its contents in terminal screenshots or share it.

### 10.5 Install Node.js dependencies

```bash
cd /opt/expense-tracker
sudo npm install --omit=dev
```

Confirm that the project files and `node_modules` exist:

```bash
ls -la
```

### 10.6 Optional manual backend test

For a quick manual test before configuring systemd:

```bash
cd /opt/expense-tracker
sudo node server.js
```

If the configuration is correct, the app should report that the server is listening on port 5000 and that MySQL connected successfully.

Open another terminal session to Backend EC2 and test:

```bash
curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

Stop the manually started process with `Ctrl+C` before continuing. The systemd service will manage the process later.

### 10.7 Create a restricted Linux service user

The backend should not run as root.

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-tracker \
  --no-create-home \
  --shell /usr/sbin/nologin expenseapp
```

If the user already exists, do not create it again. Check with:

```bash
id expenseapp
```

Set ownership and permissions:

```bash
sudo chown -R expenseapp:expenseapp /opt/expense-tracker
sudo chmod 750 /opt/expense-tracker
sudo chmod 600 /opt/expense-tracker/.env
```

### 10.8 Create backend log files

```bash
sudo mkdir -p /var/log/expense-tracker
sudo touch /var/log/expense-tracker/expense-tracker.log
sudo touch /var/log/expense-tracker/expense-tracker-error.log
sudo chown -R expenseapp:expenseapp /var/log/expense-tracker
sudo chmod 750 /var/log/expense-tracker
sudo chmod 640 /var/log/expense-tracker/*.log
```

### 10.9 Configure the backend systemd service

Create the service file:

```bash
sudo nano /etc/systemd/system/expense-tracker.service
```

Paste:

```ini
[Unit]
Description=Expense Tracker Node.js Backend
After=network.target

[Service]
Type=simple
User=expenseapp
Group=expenseapp
WorkingDirectory=/opt/expense-tracker
ExecStart=/usr/bin/node /opt/expense-tracker/server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/expense-tracker/.env
StandardOutput=append:/var/log/expense-tracker/expense-tracker.log
StandardError=append:/var/log/expense-tracker/expense-tracker-error.log

[Install]
WantedBy=multi-user.target
```

Check the Node.js path:

```bash
which node
```

If it returns a path other than `/usr/bin/node`, update `ExecStart` to match the returned path.

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-tracker
```

Check status:

```bash
sudo systemctl status expense-tracker
```

Expected status:

```text
Active: active (running)
```

Check the listening port:

```bash
sudo ss -lntp | grep 5000
```

The backend should listen on port 5000. It should be reachable from the frontend through private networking, not directly from the public internet.

---

## 11. Configure the frontend server

**Run every command in this section on: Frontend EC2.**

### 11.1 Update Ubuntu and install Nginx

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx
```

Enable and start Nginx:

```bash
sudo systemctl enable --now nginx
sudo systemctl status nginx
```

Expected status:

```text
Active: active (running)
```

### 11.2 Create the frontend application user

Nginx serves static files. Create a dedicated owner for the project files:

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-frontend \
  --no-create-home \
  --shell /usr/sbin/nologin frontendapp
```

If the user already exists, verify it with:

```bash
id frontendapp
```

### 11.3 Create the frontend directory

```bash
sudo mkdir -p /opt/expense-frontend
```

Copy the contents of the repository's `frontend/` directory into `/opt/expense-frontend`.

The final layout must be:

```text
/opt/expense-frontend/
├── index.html
├── style.css
└── script.js
```

Set ownership and permissions:

```bash
sudo chown -R frontendapp:frontendapp /opt/expense-frontend
sudo find /opt/expense-frontend -type d -exec chmod 755 {} \;
sudo find /opt/expense-frontend -type f -exec chmod 644 {} \;
```

Nginx must be able to read the files and traverse the directories.

### 11.4 Configure Nginx

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/conf.d/expense-tracker.conf
```

Paste the following configuration. Replace `BACKEND_PRIVATE_IP` with the actual private IP of Backend EC2.

```nginx
server {
    listen 8080;
    server_name _;

    root /opt/expense-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://BACKEND_PRIVATE_IP:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Important:** Replace the placeholder in `proxy_pass`. Do not leave `BACKEND_PRIVATE_IP` in the live Nginx configuration.

Test the configuration:

```bash
sudo nginx -t
```

Only continue if the output reports that the syntax is OK and the test is successful.

Reload Nginx:

```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

Test the local frontend:

```bash
curl -I http://localhost:8080/
```

A successful response should show an HTTP `200` status.

### 11.5 Understand the Nginx reverse proxy

The frontend JavaScript uses a relative API path:

```javascript
/api/expenses
```

Nginx receives this request and forwards it to:

```text
http://BACKEND_PRIVATE_IP:5000/api/expenses
```

This keeps the backend private IP out of the browser code and avoids exposing port 5000 to users' browsers.

---

## 12. Deploy the application files

There are multiple ways to copy files to EC2. Use one method consistently.

### Option A — Copy files using SCP from your computer

From Windows PowerShell, you can use `scp` if OpenSSH is installed. Example:

```powershell
scp -i "C:\path\to\your-key.pem" -r ".\expense-tracker-aws-three-tier\backend\*" ubuntu@BACKEND_PUBLIC_IP:/home/ubuntu/expense-backend/
```

And for the frontend:

```powershell
scp -i "C:\path\to\your-key.pem" -r ".\expense-tracker-aws-three-tier\frontend\*" ubuntu@FRONTEND_PUBLIC_IP:/home/ubuntu/expense-frontend/
```

Create the destination directories on the relevant EC2 instance before copying:

```bash
mkdir -p /home/ubuntu/expense-backend
```

or:

```bash
mkdir -p /home/ubuntu/expense-frontend
```

Then copy the files into their final `/opt` directories:

**On Backend EC2:**

```bash
sudo mkdir -p /opt/expense-tracker
sudo cp -r /home/ubuntu/expense-backend/. /opt/expense-tracker/
```

**On Frontend EC2:**

```bash
sudo mkdir -p /opt/expense-frontend
sudo cp -r /home/ubuntu/expense-frontend/. /opt/expense-frontend/
```

Apply the ownership and permissions described in the backend and frontend sections after copying.

> SCP examples assume the instances have reachable SSH endpoints. If backend/database instances are private-only, transfer files through a bastion, VPN, Systems Manager, or another approved private method. Do not open SSH to the world just to copy files.

### Option B — Use Git

If the project is in a private Git repository, install Git and clone it using an approved authentication method. Do not embed access tokens in shell history or public URLs.

---

## 13. Start and enable the services

### 13.1 Backend EC2

```bash
sudo systemctl daemon-reload
sudo systemctl enable expense-tracker
sudo systemctl restart expense-tracker
sudo systemctl status expense-tracker
```

Check logs:

```bash
sudo tail -n 50 /var/log/expense-tracker/expense-tracker.log
sudo tail -n 50 /var/log/expense-tracker/expense-tracker-error.log
```

### 13.2 Frontend EC2 — Nginx

Nginx is the actual web server:

```bash
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 13.3 Optional frontend marker service

The lab also includes `expense-frontend.service`. It is a **oneshot marker service** that runs `/usr/bin/true` and exits. It is not a web server and does not handle browser requests.

If you want to reproduce the lab exactly, copy `deploy/systemd/expense-frontend.service` to `/etc/systemd/system/expense-frontend.service`, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-frontend
sudo systemctl status expense-frontend
```

It may report:

```text
Active: active (exited)
```

That is expected for this oneshot unit. Nginx must still be active and enabled. The marker service is optional; a simpler setup can omit it.

---

## 14. Test the complete application

Perform these tests in order.

### 14.1 Test the backend locally

**On Backend EC2:**

```bash
curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

The root endpoint should return the backend health response. The API endpoint should return JSON.

### 14.2 Test backend connectivity from the frontend

**On Frontend EC2:**

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
```

Replace `BACKEND_PRIVATE_IP` with the actual private IP.

If these requests fail, check the backend service, backend security group source, backend listener, and VPC connectivity.

### 14.3 Test Nginx locally

**On Frontend EC2:**

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/expenses
```

The first request should return the frontend HTML. The second should return the expenses JSON from the backend through the Nginx reverse proxy.

### 14.4 Test in your browser

On your own computer, open:

```text
http://FRONTEND_PUBLIC_IP:8080
```

Replace `FRONTEND_PUBLIC_IP` with the public IPv4 address of Frontend EC2.

You should see the Expense Tracker page.

### 14.5 Test adding an expense

1. Open the application in your browser.
2. Enter an expense title.
3. Enter an amount.
4. Select or enter a category, depending on the UI.
5. Select the expense date.
6. Enter a description if available.
7. Submit the form.
8. Confirm that the new expense appears in the expense history.

If the page loads but the API fails, test `/api/expenses` with `curl` from Frontend EC2 and inspect the backend and Nginx logs.

---

## 15. Verify the database records

**Run on Database EC2:**

```bash
sudo mysql
```

Then:

```sql
USE expense_tracker;
SHOW TABLES;
DESCRIBE expenses;
SELECT * FROM expenses ORDER BY id DESC;
EXIT;
```

The expense submitted from the browser should appear in the `expenses` table.

This confirms the end-to-end flow:

```text
Browser -> Nginx -> Node.js API -> MySQL
```

---

## 16. Application and server logs

Logs help identify whether a problem is in Nginx, the Node.js application, or MySQL.

### 16.1 Backend application log

**On Backend EC2:**

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker.log
```

The backend request-logging middleware records completed requests with:

- Timestamp
- HTTP method
- Request path
- HTTP response status
- Request duration in milliseconds

Example format:

```text
2026-11-22T15:45:00.000Z | GET /api/expenses | 200 | 12ms
```

Press `Ctrl+C` to stop following the log.

### 16.2 Backend error log

**On Backend EC2:**

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker-error.log
```

This file receives the backend process's standard error output. Also check the systemd journal:

```bash
sudo journalctl -u expense-tracker -n 100 --no-pager
sudo journalctl -u expense-tracker -f
```

### 16.3 Nginx access log

**On Frontend EC2:**

```bash
sudo tail -f /var/log/nginx/access.log
```

This records incoming HTTP requests handled by Nginx.

### 16.4 Nginx error log

**On Frontend EC2:**

```bash
sudo tail -f /var/log/nginx/error.log
```

Use this when Nginx cannot read a file, cannot connect to the backend, or encounters a configuration/runtime issue.

### 16.5 MySQL service status

**On Database EC2:**

```bash
sudo systemctl status mysql
sudo journalctl -u mysql -n 50 --no-pager
```

### 16.6 Optional frontend marker logs

If you installed the optional `expense-frontend.service`:

```bash
sudo cat /var/log/expense-frontend/frontend.log
sudo cat /var/log/expense-frontend/frontend-error.log
```

These files capture output from the marker command, not Nginx HTTP requests. They may be empty. Use `/var/log/nginx/access.log` and `/var/log/nginx/error.log` for actual Nginx request/error logs.

### 16.7 Log rotation

For a longer-running environment, configure log rotation and retention for application logs. Do not allow log files to grow indefinitely. Nginx commonly has logrotate configuration supplied by the OS; verify that it is enabled on your Ubuntu release.

---

## 17. Reboot and automatic-startup verification

The services should start after the EC2 instances reboot.

### 17.1 Check enabled status before reboot

**Backend EC2:**

```bash
sudo systemctl is-enabled expense-tracker
sudo systemctl status expense-tracker
```

**Frontend EC2:**

```bash
sudo systemctl is-enabled nginx
sudo systemctl status nginx
```

If installed:

```bash
sudo systemctl is-enabled expense-frontend
sudo systemctl status expense-frontend
```

**Database EC2:**

```bash
sudo systemctl is-enabled mysql
sudo systemctl status mysql
```

### 17.2 Reboot one server at a time

Do not reboot all three instances simultaneously during your first verification.

On the server you are testing:

```bash
sudo reboot
```

Wait until the EC2 instance is running and SSH is available again. Reconnect and check the relevant service:

- Database EC2: `sudo systemctl status mysql`
- Backend EC2: `sudo systemctl status expense-tracker`
- Frontend EC2: `sudo systemctl status nginx`

Then repeat the browser and API tests.

---

## 18. Security recommendations

This is a learning deployment. Before exposing it as a real production application, improve its security.

1. **Restrict SSH:** Allow TCP 22 only from your trusted IP or use Systems Manager Session Manager.
2. **Keep backend private:** Do not expose TCP 5000 to the internet.
3. **Keep database private:** Do not expose TCP 3306 to the internet.
4. **Use security-group references:** Frontend SG -> Backend SG -> Database SG.
5. **Protect secrets:** Keep `.env` out of Git and restrict its file permissions.
6. **Use least privilege:** The MySQL application account should not be a MySQL administrator.
7. **Use HTTPS:** Configure a domain name and TLS certificate before public production use.
8. **Patch systems:** Apply security updates regularly.
9. **Back up MySQL:** Set up and test database backups.
10. **Monitor logs:** Configure log rotation, monitoring, and alerts.
11. **Avoid public SSH for private servers:** Prefer SSM, VPN, or a controlled bastion host.
12. **Review IAM:** Grant only the AWS permissions required for deployment and operation.

---

## 19. Troubleshooting guide

### Problem 1 — Frontend website does not open

On Frontend EC2:

```bash
sudo systemctl status nginx
sudo nginx -t
sudo ss -lntp | grep 8080
curl -I http://localhost:8080/
```

Check:

- Nginx is active.
- Nginx configuration test passes.
- Nginx listens on port 8080.
- Frontend security group allows TCP 8080 from your client IP.
- The frontend public IP is correct.
- The frontend files exist in `/opt/expense-frontend`.

### Problem 2 — Nginx returns 403 Forbidden

Check file and directory permissions:

```bash
namei -l /opt/expense-frontend/index.html
sudo find /opt/expense-frontend -maxdepth 2 -ls
```

Nginx must be able to traverse parent directories and read `index.html`, `style.css`, and `script.js`.

### Problem 3 — Frontend opens, but expenses do not load

On Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
curl -i http://localhost:8080/api/expenses
```

Check:

- Backend service is running.
- Nginx `proxy_pass` contains the correct backend private IP.
- Backend security group allows TCP 5000 from the frontend security group.
- Backend listens on port 5000.
- The backend can connect to MySQL.

### Problem 4 — Backend service fails to start

On Backend EC2:

```bash
sudo systemctl status expense-tracker
sudo journalctl -u expense-tracker -n 100 --no-pager
sudo tail -n 100 /var/log/expense-tracker/expense-tracker-error.log
```

Check:

- `server.js` exists at `/opt/expense-tracker/server.js`.
- `node_modules` exists.
- `ExecStart` uses the correct Node.js binary path.
- `.env` exists and has the required variables.
- The service user can read the application and `.env` files.
- Port 5000 is not already occupied.

### Problem 5 — Backend cannot connect to MySQL

On Backend EC2:

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

Check:

- `DB_HOST` is the database private IP.
- MySQL is running on Database EC2.
- MySQL listens on the database private interface.
- Database security group allows TCP 3306 from Backend SG.
- The MySQL account host matches the backend private IP.
- The password and database name are correct.

On Database EC2:

```bash
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

### Problem 6 — Browser reports an API/network error

Test each layer separately:

```bash
# Backend EC2
curl -i http://localhost:5000/api/expenses

# Frontend EC2
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
curl -i http://localhost:8080/api/expenses
```

The first failed test identifies the layer that needs investigation.

### Problem 7 — Service is active (exited)

For `expense-frontend.service`, `active (exited)` is expected because it is a oneshot marker service. It is not Nginx.

For Nginx, expect `active (running)`.
For the Node.js backend, expect `active (running)`.
For MySQL, expect `active (running)`.

### Problem 8 — Ping fails between instances

ICMP ping is not required for the application to work. A failed ping does not prove that TCP application connectivity is broken.

Test the actual required TCP service instead, for example from Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/
```

Use security group rules and service listeners to troubleshoot application connectivity. Add ICMP only if you specifically need ping for diagnostics.

---

## 20. Final completion checklist

### AWS infrastructure

- [ ] Three Ubuntu EC2 instances are running.
- [ ] All three instances are in the intended VPC.
- [ ] Private IP addresses have been recorded.
- [ ] Frontend, backend, and database security groups are attached correctly.
- [ ] SSH is restricted to the administrator's IP or an approved private access method.
- [ ] Backend port 5000 is not publicly exposed.
- [ ] Database port 3306 is not publicly exposed.

### Database tier

- [ ] MySQL is installed and running.
- [ ] MySQL is enabled at boot.
- [ ] MySQL listens on the database private IP.
- [ ] `expense_tracker` database exists.
- [ ] `expenses` table exists.
- [ ] `expense_user` is restricted to the backend host.
- [ ] Backend can connect to MySQL.

### Backend tier

- [ ] Node.js and npm are installed.
- [ ] Backend source files are in `/opt/expense-tracker`.
- [ ] `.env` has the correct values and is protected.
- [ ] `expenseapp` system user exists.
- [ ] Backend log files exist with restricted permissions.
- [ ] `expense-tracker.service` is enabled and active.
- [ ] Backend API responds on port 5000.

### Frontend tier

- [ ] Nginx is installed, enabled, and running.
- [ ] `frontendapp` system user exists.
- [ ] Frontend files are in `/opt/expense-frontend`.
- [ ] Nginx configuration passes `nginx -t`.
- [ ] Nginx listens on port 8080.
- [ ] Nginx proxies `/api/` to the correct backend private IP.
- [ ] Frontend page opens in a browser.

### End-to-end and operations

- [ ] Browser can retrieve expenses.
- [ ] Browser can add an expense.
- [ ] New expense appears in MySQL.
- [ ] Backend request logs are being written.
- [ ] Nginx access and error logs are available.
- [ ] Services start successfully after reboot.
- [ ] Database backup and HTTPS plans are in place before production use.

---

## 21. Useful commands reference

### Service status

```bash
sudo systemctl status nginx
sudo systemctl status expense-tracker
sudo systemctl status mysql
```

### Start, stop, and restart

```bash
sudo systemctl start SERVICE_NAME
sudo systemctl stop SERVICE_NAME
sudo systemctl restart SERVICE_NAME
```

### Enable at boot

```bash
sudo systemctl enable SERVICE_NAME
```

### Check whether enabled

```bash
sudo systemctl is-enabled SERVICE_NAME
```

### Follow logs

```bash
sudo journalctl -u SERVICE_NAME -f
sudo tail -f /var/log/expense-tracker/expense-tracker.log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check listening ports

```bash
sudo ss -lntp
```

### Test HTTP endpoints

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/expenses
curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

### Validate and reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Reload systemd after changing a unit file

```bash
sudo systemctl daemon-reload
sudo systemctl restart expense-tracker
```

---

## 22. Current project scope and limitations

- The current API implements **Create** and **Read** operations: `POST /api/expenses` and `GET /api/expenses`.
- Update and Delete operations are not implemented in this version.
- The frontend is static HTML, CSS, and JavaScript served by Nginx.
- Nginx uses the standard Ubuntu log files at `/var/log/nginx/access.log` and `/var/log/nginx/error.log`. Dedicated custom Nginx log files can be configured later.
- The optional `expense-frontend.service` is a oneshot marker, not the frontend web server. Nginx is the actual web server.
- The private IPs shown in this documentation are examples from the original lab. Replace them with the values in your AWS environment.
- The frontend source in this package is a reproducible project copy and may not be byte-for-byte identical to every styling change made directly on the original EC2 instance.
- This guide is for a learning deployment. Production use requires additional work such as HTTPS, backups, monitoring, log rotation, stronger operational controls, and a review of application security.

---

## Deployment order at a glance

Follow this exact order when building from scratch:

1. Create/select the VPC and networking.
2. Create the three security groups.
3. Launch Frontend, Backend, and Database EC2 instances.
4. Record private IP addresses.
5. Configure MySQL on Database EC2.
6. Create the database, application user, and table.
7. Install Node.js and deploy backend files on Backend EC2.
8. Configure `.env`, service user, logs, and systemd on Backend EC2.
9. Install Nginx and deploy frontend files on Frontend EC2.
10. Configure Nginx reverse proxy to the backend private IP.
11. Start and enable services.
12. Test backend, frontend, API, and database separately.
13. Add an expense in the browser and verify it in MySQL.
14. Check application and Nginx logs.
15. Reboot one instance at a time and verify automatic startup.

**If you are following this for the first time, complete one step, verify its expected result, and then move to the next step.**
