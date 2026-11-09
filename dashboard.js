document.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem("loggedInUser");

    if (!storedUser) {
        window.location.href = "index.html";
        return;
    }

    const user = JSON.parse(storedUser);

    document.getElementById("userName").textContent = user.name;
    document.getElementById("userRole").textContent = user.role;
});

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}
function reportDisaster() {
    const form = document.getElementById("reportForm");

    form.style.display = "block";

    form.scrollIntoView({
        behavior: "smooth"
    });
}



document.getElementById("disasterForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const storedUser = localStorage.getItem("loggedInUser");

    if (!storedUser) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }

    const location = document.getElementById("disasterLocation").value.trim();

    try {
        // Convert location name into coordinates
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en&format=json`
        );


        const geoData = await geoResponse.json();


        if (!geoData.results || geoData.results.length === 0) {
            alert("Location not found. Please enter a more specific location.");
            return;
        }
        const coordinates = geoData.results[0];

        const reportData = {
            disasterType: document.getElementById("disasterType").value,
            location: location,
            description: document.getElementById("disasterDescription").value,
            peopleAffected: document.getElementById("peopleAffected").value,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
        };

        const response = await fetch("/api/disaster-reports", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Disaster report submitted successfully!");

            document.getElementById("disasterForm").reset();
            document.getElementById("reportForm").style.display = "none";
        } else {
            alert(data.message);
        }

    } catch (error) {
        alert("Unable to connect to the server or find the location.");
        console.error(error);
    }
});

// Load reports submitted by the logged-in user
async function loadMyReports() {

    const storedUser = localStorage.getItem("loggedInUser");

    if (!storedUser) {
        return;
    }

    const user = JSON.parse(storedUser);

    try {

        const response = await fetch(`/api/my-reports/${user.id}`, {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        const reports = await response.json();

        if (!response.ok) {
            console.error("Failed to load my reports:", reports.message);
            return;
        }

        const tableBody = document.getElementById("myReportsBody");

        if (!tableBody) {
            console.error("My Reports table not found");
            return;
        }

        tableBody.innerHTML = "";

        reports.forEach((report) => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>#DM${String(report.id).padStart(3, "0")}</td>
                <td>${report.disaster_type}</td>
                <td>${report.location}</td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td>${report.status}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error("Error loading my reports:", error);

    }
}

loadMyReports();

// Load logged-in user's profile
function loadMyProfile() {

    const storedUser = localStorage.getItem("loggedInUser");

    if (!storedUser) {
        return;
    }

    const user = JSON.parse(storedUser);

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profilePhone").textContent = user.phone || "Not provided";
    document.getElementById("profileRole").textContent = user.role;
    document.getElementById("profileLocation").textContent = user.location || "Not provided";
}

loadMyProfile();



async function activateSOS() {
    const confirmSOS = confirm(
        "🚨 EMERGENCY! Do you want to send an SOS alert?"
    );

    if (!confirmSOS) {
        return;
    }

    // Save SOS alert to the database
    try {
        const response = await fetch("/api/sos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({
                location: JSON.parse(
                    localStorage.getItem("loggedInUser")
                ).location || "Not provided"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to save SOS alert.");
            return;
        }

        console.log("SOS saved:", data.message);

    } catch (error) {
        console.error("SOS request failed:", error);
        alert("Could not connect to the server. SOS was not saved.");
        return;
    }


    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        alert("Your browser does not support emergency audio.");
        return;
    }

    const audioContext = new AudioContextClass();

    audioContext.resume().then(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();


        // General disaster warning alarm: repeating high-low tones
        oscillator.type = "square";

        oscillator.frequency.setValueAtTime(
            880, audioContext.currentTime
        );
        oscillator.frequency.setValueAtTime(
            660, audioContext.currentTime + 0.5
        );
        oscillator.frequency.setValueAtTime(
            880, audioContext.currentTime + 1
        );
        oscillator.frequency.setValueAtTime(
            660, audioContext.currentTime + 1.5
        );
        oscillator.frequency.setValueAtTime(
            880, audioContext.currentTime + 2
        );
        oscillator.frequency.setValueAtTime(
            660, audioContext.currentTime + 2.5
        );
        oscillator.frequency.setValueAtTime(
            880, audioContext.currentTime + 3
        );
        oscillator.frequency.setValueAtTime(
            660, audioContext.currentTime + 3.5
        );



        gainNode.gain.value = 0.15;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 5);

        oscillator.onended = () => {
            audioContext.close();
            alert("🚨 SOS activated! Disaster warning alarm played.");
        };
    }).catch((error) => {
        console.error("Unable to play alarm:", error);
        alert("Unable to play the emergency sound.");
    });
}


// Initialize Disaster Map
const disasterMap = L.map("disasterMap").setView(
    [12.9716, 77.5946], 12
);

// Load OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(disasterMap);


// Load disaster reports and group reports at the same location
async function loadDisasterMarkers() {
    try {
        const response = await fetch("/api/map/disaster-reports", {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (!response.ok) {
            throw new Error("Unable to load disaster reports");
        }

        const reports = await response.json();

        // Group reports by coordinates
        const groupedReports = {};

        reports.forEach(report => {
            if (report.latitude == null || report.longitude == null) {
                return;
            }

            const key = `${report.latitude},${report.longitude}`;

            if (!groupedReports[key]) {
                groupedReports[key] = [];
            }

            groupedReports[key].push(report);
        });

        // Add one marker for each location
        Object.values(groupedReports).forEach(locationReports => {
            const firstReport = locationReports[0];

            const popupContent = locationReports.map(report => `
                <hr>
                <b>🚨 ${report.disaster_type}</b><br>
                Location: ${report.location}<br>
                Status: ${report.status}<br>
                Description: ${report.description}
            `).join("");

            L.circleMarker(
                [Number(firstReport.latitude), Number(firstReport.longitude)],
                {
                    color: "red",
                    fillColor: "red",
                    fillOpacity: 0.8,
                    radius: 10
                }
            )
            .addTo(disasterMap)
            .bindPopup(popupContent);
        });

      console.log("Disaster map reports loaded:", reports.length);

// Automatically zoom to show all disaster reports
const allMarkers = [];

disasterMap.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer.options.color === "red") {
        allMarkers.push(layer.getLatLng());
    }
});

if (allMarkers.length > 0) {
    disasterMap.fitBounds(allMarkers, {
        padding: [50, 50],
        maxZoom: 15
    });
}

    } catch (error) {
        console.error("Map reports error:", error);
    }
}

loadDisasterMarkers();
// Sample safe shelter locations
const shelters = [
    {
        name: "Community Hall - Example",
        lat: 12.9750,
        lng: 77.5850
    },
    {
        name: "Government School - Example",
        lat: 12.9650,
        lng: 77.6100
    }
];

// Add green shelter markers
shelters.forEach(shelter => {
    L.circleMarker([shelter.lat, shelter.lng], {
        color: "green",
        fillColor: "green",
        fillOpacity: 0.8,
        radius: 9
    })
        .addTo(disasterMap)
        .bindPopup("🏥 " + shelter.name);
});


function viewMap() {
    setTimeout(() => {
        disasterMap.invalidateSize();

        const redMarkers = [];

        disasterMap.eachLayer(layer => {
            if (layer instanceof L.CircleMarker &&
                layer.options.color === "red") {
                redMarkers.push(layer.getLatLng());
            }
        });

        if (redMarkers.length > 0) {
            disasterMap.fitBounds(redMarkers, {
                padding: [50, 50],
                maxZoom: 15
            });
        }
    }, 300);
}

