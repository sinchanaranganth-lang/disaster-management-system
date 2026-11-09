
document.addEventListener("DOMContentLoaded", async () => {

    const storedUser = localStorage.getItem("loggedInUser");

    if (!storedUser) {
        window.location.href = "index.html";
        return;
    }

    const user = JSON.parse(storedUser);

    // Only administrator can access this page
    if (user.role !== "administrator") {
        alert("Access denied. Administrator only.");
        window.location.href = "dashboard.html";
        return;
    }

    // Load Dashboard Statistics
    async function loadDashboardStats() {
        try {
            const response = await fetch("/api/admin/dashboard-stats", {
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("token")
                }
            });

            if (!response.ok) {
                throw new Error("Failed to load dashboard statistics");
            }

            const stats = await response.json();

            document.getElementById("totalSOSCount").textContent = stats.totalSOS;
            document.getElementById("activeSOSCount").textContent = stats.activeSOS;
            document.getElementById("totalReportsCount").textContent = stats.totalReports;
            document.getElementById("totalUsersCount").textContent = stats.totalUsers;

        } catch (error) {
            console.error("Dashboard statistics error:", error);
        }
    }

    await loadDashboardStats();

    // Automatically refresh statistics every 10 seconds
    setInterval(loadDashboardStats, 10000);


    // Load Disaster Reports
    try {
        const response = await fetch("/api/admin/disaster-reports", {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load disaster reports");
        }

        const reports = await response.json();
        const tableBody = document.getElementById("adminReportsBody");

        tableBody.innerHTML = "";

        reports.forEach(report => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${report.id}</td>
                <td>${report.user_id}</td>
                <td>${report.disaster_type}</td>
                <td>${report.location}</td>
                <td>${report.people_affected}</td>
                <td>${report.status}</td>
                <td>
                    <select
                        class="report-status ${report.status.toLowerCase().replace(" ", "-")}"
                        onchange="updateReportStatus(${report.id}, this.value);
                        this.className = 'report-status ' + this.value.toLowerCase().replace(' ', '-');">

                        <option value="Pending" ${report.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${report.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${report.status === "Resolved" ? "selected" : ""}>Resolved</option>

                    </select>
                </td>
                <td>${new Date(report.created_at).toLocaleString()}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error(error);
        alert("Unable to load disaster reports.");
    }


    // Load All Users
    try {
        const response = await fetch("/api/admin/users", {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load users");
        }

        const users = await response.json();
        const usersTableBody = document.getElementById("adminUsersBody");

        usersTableBody.innerHTML = "";

        users.forEach(user => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || "Not provided"}</td>
                <td>${user.role}</td>
                <td>${user.location || "Not provided"}</td>
            `;

            usersTableBody.appendChild(row);
        });

    } catch (error) {
        console.error(error);
        alert("Unable to load users.");
    }


    // Load SOS Alerts
    try {
        const response = await fetch("/api/admin/sos-alerts", {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load SOS alerts");
        }

        const alerts = await response.json();

        const sosTableBody = document.getElementById("adminSOSBody");

        // Display SOS alerts
        function displaySOSAlerts(alertList) {

            sosTableBody.innerHTML = "";

            if (alertList.length === 0) {
                sosTableBody.innerHTML =
                    '<tr><td colspan="8">No SOS alerts found.</td></tr>';
                return;
            }

            alertList.forEach(alert => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${alert.id}</td>
                    <td>${alert.user_id}</td>
                    <td>${alert.user_name || "Unknown"}</td>
                    <td>${alert.user_phone || "Not provided"}</td>
                    <td>${alert.location || "Not provided"}</td>
                    <td>${alert.message}</td>
                    <td>
                        <select
                            class="sos-status ${alert.status.toLowerCase()}"
                            onchange="updateSOSStatus(${alert.id}, this.value);
                            this.className = 'sos-status ' + this.value.toLowerCase();">

                            <option value="Active" ${alert.status === "Active" ? "selected" : ""}>Active</option>
                            <option value="Responding" ${alert.status === "Responding" ? "selected" : ""}>Responding</option>
                            <option value="Resolved" ${alert.status === "Resolved" ? "selected" : ""}>Resolved</option>

                        </select>
                    </td>
                    <td>${new Date(alert.created_at).toLocaleString()}</td>
                `;

                sosTableBody.appendChild(row);
            });
        }

        displaySOSAlerts(alerts);

        // Remember existing SOS alert IDs
        const knownSOSIds = new Set(alerts.map(alert => alert.id));

        // Check for new SOS alerts every 10 seconds
        setInterval(async () => {

            try {
                const response = await fetch("/api/admin/sos-alerts", {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("token")
                    }
                });

                if (!response.ok) return;

                const latestAlerts = await response.json();

                const newAlerts = latestAlerts.filter(
                    alert => !knownSOSIds.has(alert.id)
                );

                if (newAlerts.length > 0) {

                    // Show flashing notification
                    const notification = document.getElementById("newSOSNotification");

                    notification.hidden = false;

                    notification.textContent =
                        `🚨 ${newAlerts.length} NEW SOS ALERT(S) RECEIVED! Please check the SOS Emergency Alerts section.`;


                        
// Play SOS notification sound 3 times
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

for (let i = 0; i < 3; i++) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

    const startTime = audioContext.currentTime + (i * 0.8);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.4);
}
                    // Remember new IDs
                    newAlerts.forEach(alert => knownSOSIds.add(alert.id));

                    // Refresh SOS table to display new alerts
                    displaySOSAlerts(latestAlerts);
                }

            } catch (error) {
                console.error("New SOS check error:", error);
            }

        }, 10000);

    } catch (error) {
        console.error("Unable to load SOS alerts:", error);

        document.getElementById("adminSOSBody").innerHTML =
            '<tr><td colspan="8">Unable to load SOS alerts.</td></tr>';
    }

});


// Update Disaster Report Status
async function updateReportStatus(reportId, newStatus) {

    try {
        const response = await fetch(`/api/admin/disaster-reports/${reportId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Report status updated successfully!");
        } else {
            alert(data.message || "Failed to update report status.");
        }

    } catch (error) {
        console.error(error);
        alert("Unable to update report status.");
    }
}


// Admin Logout
function logoutAdmin() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}


// Update SOS Status
async function updateSOSStatus(sosId, newStatus) {

    try {
        const response = await fetch(
            `/api/admin/sos-alerts/${sosId}/status`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                },
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            alert("SOS status updated successfully!");
        } else {
            alert(data.message || "Failed to update SOS status.");
        }

    } catch (error) {
        console.error("SOS status update error:", error);
        alert("Unable to update SOS status. Please check the server.");
    }
}
