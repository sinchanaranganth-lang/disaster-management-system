const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

const PORT = 5000;
// Authentication middleware
function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {

        if (err) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        req.user = user;

        next();
    });
}
// Admin authorization middleware
function requireAdmin(req, res, next) {

    if (req.user.role !== "administrator") {
        return res.status(403).json({
            message: "Administrator access required"
        });
    }

    next();
}

// Allow JSON data from frontend
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "..")));

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
    } else {
        console.log("MySQL connected successfully!");
    }
});
// Register new user
app.post("/api/register", async (req, res) => {
    const { name, email, phone, role, location, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to database
        const sql = `
    INSERT INTO users (name, email, phone, role, location, password)
    VALUES (?, ?, ?, ?, ?, ?)

        `;

        db.query(
    sql,
    [name, email, phone, role, location, hashedPassword],
    (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Email already registered"
                    });
                }

                return res.status(500).json({
                    message: "Registration failed",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Registration successful",
                userId: result.insertId
            });
        });

    } catch (error) {
        res.status(500).json({
            message: "Something went wrong"
        });
    }
});
// Login user
app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    // Check fields
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    // Find user by email
    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        // User not found
        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        // Compare password with hashed password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Login successful
       // Create JWT token
const token = jwt.sign(
    {
        id: user.id,
        role: user.role
    },
    JWT_SECRET,
    {
        expiresIn: "2h"
    }
);

// Login successful
res.json({
    message: "Login successful",
    token: token,
    user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location
    }
});
    });
});
// Create a disaster report
app.post("/api/disaster-reports", authenticateToken, (req, res) => {

   const {
    disasterType,
    location,
    description,
    peopleAffected
} = req.body;

const userId = req.user.id;

console.log("Received latitude:", req.body.latitude);
console.log("Received longitude:", req.body.longitude);

    if (
        !userId ||
        !disasterType ||
        !location ||
        !description ||
        peopleAffected === undefined
    ) {
        return res.status(400).json({
            message: "All report fields are required"
        });
    }


    const sql = `
       INSERT INTO disaster_reports
(user_id, disaster_type, location, description, people_affected, latitude, longitude)
VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
      [
    userId,
    disasterType,
    location,
    description,
    peopleAffected,
    req.body.latitude,
    req.body.longitude
],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Failed to submit disaster report",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Disaster report submitted successfully",
                reportId: result.insertId
            });
        }
    );
});


// Get disaster reports for the map
app.get("/api/map/disaster-reports", authenticateToken, (req, res) => {
    const sql = `
        SELECT id, disaster_type, location, description,
               status, latitude, longitude, created_at
        FROM disaster_reports
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Failed to load map reports"
            });
        }

        res.json(results);
    });
});
// Get all disaster reports
app.get("/api/admin/disaster-reports", authenticateToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            disaster_reports.id,
            disaster_reports.user_id,
            users.name AS user_name,
            users.email AS user_email,
            disaster_reports.disaster_type,
            disaster_reports.location,
            disaster_reports.description,
            disaster_reports.people_affected,
            disaster_reports.status,
            disaster_reports.created_at
        FROM disaster_reports
        LEFT JOIN users
        ON disaster_reports.user_id = users.id
        ORDER BY disaster_reports.created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch admin reports",
                error: err.message
            });
        }

        res.json(results);
    });
});

// Update disaster report status
app.put("/api/admin/disaster-reports/:id/status", authenticateToken, requireAdmin, (req, res) => {

    const reportId = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({
            message: "Status is required"
        });
    }

    const allowedStatuses = ["Pending", "In Progress", "Resolved"];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid status"
        });
    }

    const sql = `
        UPDATE disaster_reports
        SET status = ?
        WHERE id = ?
    `;

    db.query(sql, [status, reportId], (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to update report status",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Report not found"
            });
        }

        res.json({
            message: "Report status updated successfully"
        });
    });
});


/* Update SOS alert status */
app.put(
    "/api/admin/sos-alerts/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const sosId = req.params.id;
        const { status } = req.body;

        const allowedStatuses = ["Active", "Responding", "Resolved"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid SOS status"
            });
        }

        const sql = `
            UPDATE sos_alerts
            SET status = ?
            WHERE id = ?
        `;

        db.query(sql, [status, sosId], (err, result) => {
            if (err) {
                console.error("SOS status update error:", err.message);

                return res.status(500).json({
                    message: "Failed to update SOS status"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "SOS alert not found"
                });
            }

            res.json({
                message: "SOS status updated successfully",
                status: status
            });
        });
    }
);



/* Get all SOS alerts for administrator */
app.get(
    "/api/admin/sos-alerts",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT
                sos_alerts.id,
                sos_alerts.user_id,
                users.name AS user_name,
                users.phone AS user_phone,
                sos_alerts.location,
                sos_alerts.message,
                sos_alerts.status,
                sos_alerts.created_at
            FROM sos_alerts
            LEFT JOIN users
                ON sos_alerts.user_id = users.id
            ORDER BY sos_alerts.created_at DESC
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error("Failed to fetch SOS alerts:", err.message);

                return res.status(500).json({
                    message: "Failed to fetch SOS alerts"
                });
            }

            res.json(results);
        });
    }
);

// Get all users for admin
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT id, name, email, phone, role, location
        FROM users
        ORDER BY id ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch users",
                error: err.message
            });
        }

        res.json(results);
    });
});
// Get reports submitted by a specific user
app.get("/api/my-reports/:userId", authenticateToken, (req, res) => {

    const userId = req.user.id;


    const sql = `
        SELECT *
        FROM disaster_reports
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch your reports",
                error: err.message
            });
        }

        res.json(results);
    });
});


/* Save SOS alert */
app.post("/api/sos", authenticateToken, (req, res) => {

    const userId = req.user.id;
    const location = req.body.location || "Not provided";
    const message = "Emergency SOS alert";

    const sql = `
        INSERT INTO sos_alerts (user_id, location, message)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [userId, location, message], (err, result) => {

        if (err) {
            console.error("SOS save error:", err.message);

            return res.status(500).json({
                message: "Failed to save SOS alert"
            });
        }

        res.status(201).json({
            message: "SOS alert saved successfully!",
            sosId: result.insertId
        });
    });
});


// Admin Dashboard Statistics
app.get("/api/admin/dashboard-stats", authenticateToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            (SELECT COUNT(*) FROM sos_alerts) AS totalSOS,
            (SELECT COUNT(*) FROM sos_alerts WHERE status = 'Active') AS activeSOS,
            (SELECT COUNT(*) FROM disaster_reports) AS totalReports,
            (SELECT COUNT(*) FROM users) AS totalUsers
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Dashboard statistics error:", err.message);

            return res.status(500).json({
                message: "Failed to load dashboard statistics"
            });
        }

        res.json(results[0]);
    });
});
// Test backend
app.get("/api/test", (req, res) => {
    res.json({
        message: "Disaster Management Backend is working!"
    });
});

// Test database
app.get("/api/database-test", (req, res) => {
    db.query("SELECT 1 AS result", (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Database is connected!",
            result: results
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


