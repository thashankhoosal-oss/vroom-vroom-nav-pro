// --- GLOBAL VARIABLES ---
    let map, routeControl;
    let startCoords = null;
    let endCoords = null;
    let battery = 100;

    // --- 1. INITIALIZE APP ---
    function init() {
        console.log("Vroom Vroom Initializing...");
        
        // Setup Map (Centered on Johannesburg)
        map = L.map('map', { zoomControl: false }).setView([-26.20, 28.04], 11);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Start the Clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Start Solar Trickle Charge (0.1% every 5 seconds)
        setInterval(() => {
            if (battery < 100) {
                battery += 0.1;
                updateUI();
            }
        }, 5000);
    }

    // --- 2. SEARCH LOGIC (The "Brain") ---
    async function searchAddr(query, resultId) {
        const dropdown = document.getElementById(resultId);
        
        // Reset if query is too short
        if (query.length < 3) {
            dropdown.style.display = 'none';
            return;
        }

        try {
            // Fetching from South African addresses only
            const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&limit=5&q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            dropdown.innerHTML = '';
            
            if (data && data.length > 0) {
                dropdown.style.display = 'block';
                data.forEach(place => {
                    const item = document.createElement('div');
                    item.className = 'result-item';
                    
                    // Clean up address string
                    const shortName = place.display_name.split(',').slice(0, 3).join(',');
                    item.innerText = shortName;
                    
                    item.onclick = () => {
                        console.log(`Selected ${resultId}:`, shortName);
                        
                        if (resultId === 'start-results') {
                            startCoords = [parseFloat(place.lat), parseFloat(place.lon)];
                            document.getElementById('start-input').value = shortName;
                        } else {
                            endCoords = [parseFloat(place.lat), parseFloat(place.lon)];
                            document.getElementById('end-input').value = shortName;
                        }
                        
                        dropdown.style.display = 'none';
                        // Move map to selected location
                        map.flyTo([place.lat, place.lon], 14);
                    };
                    dropdown.appendChild(item);
                });
            }
        } catch (error) {
            console.error("Search Error:", error);
        }
    }

    // --- 3. NAVIGATION LOGIC ---
    function calculateRoute() {
        // Validation check
        if (!startCoords || !endCoords) {
            alert("Error: Please select both a Start and Destination from the dropdown lists!");
            return;
        }

        console.log("Calculating Route...");

        // Clear existing route
        if (routeControl) {
            map.removeControl(routeControl);
        }

        // Generate the new route with Arrows
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(startCoords[0], startCoords[1]),
                L.latLng(endCoords[0], endCoords[1])
            ],
            lineOptions: { 
                styles: [{ color: '#1a73e8', weight: 8, opacity: 0.8 }] 
            },
            router: L.Routing.osrmv1({
                serviceUrl: `https://router.project-osrm.org/route/v1`
            }),
            show: true,
            addWaypoints: false,
            draggableWaypoints: false
        }).addTo(map);

        // Battery Drain Simulation (Navigation uses power)
        battery = Math.max(0, battery - 5);
        updateUI();
    }

    // --- 4. UI HELPERS ---
    function updateUI() {
        const pctText = document.getElementById('pct');
        const fill = document.getElementById('battery-fill');
        const timeText = document.getElementById('time-rem');

        // Update Percentage
        pctText.innerText = Math.floor(battery) + "%";
        fill.style.width = battery + "%";

        // Change color based on battery level
        if (battery > 50) fill.style.background = "#22c55e"; // Green
        else if (battery > 20) fill.style.background = "#f59e0b"; // Orange
        else fill.style.background = "#ef4444"; // Red

        // Update Time Remaining (8 hours total @ 100%)
        let totalMins = Math.floor(battery * 4.8);
        let h = Math.floor(totalMins / 60);
        let m = totalMins % 60;
        timeText.innerText = `${h}h ${m.toString().padStart(2, '0')}m left`;
    }

    function updateClock() {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    function triggerSOS() {
        const btn = document.getElementById('sos-btn');
        btn.innerText = "SENT";
        btn.style.background = "#22c55e";
        console.warn("EMERGENCY SIGNAL BROADCASTED");
    }

    // Start everything once the window loads
    window.onload = init;