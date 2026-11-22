require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

async function testConnection() {
    try {
        const [rows] = await pool.query(
            "SELECT NOW() AS server_time, DATABASE() AS database_name"
        );

        console.log("MySQL connection successful!");
        console.log("Server Time:", rows[0].server_time);
        console.log("Database Name:", rows[0].database_name);

    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        process.exitCode = 1;

    } finally {
        await pool.end();
    }
}

testConnection();
