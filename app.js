// Global variables
let robotIp = '';
let currentScreen = 'scanner-screen';

function checkUrlForIp() {
    const currentPath = decodeURIComponent(window.location.pathname.substring(1));
    
    if (currentPath && currentPath !== 'index.html' && !currentPath.includes('.html')) {
        robotIp = currentPath.trim();
        document.getElementById("ip").value = robotIp;
    }
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.classList.add('active');
        currentScreen = screenId;
    } else {
        console.warn(`Screen with ID "${screenId}" not found.`);
    }
}

// Manual IP entry
function manualConnect() {
    showScreen('manual-screen');
}

function processIpAndContinue() {
    const ip = document.getElementById("ip").value.trim();
    if (!ip) {
        alert("Please enter a valid IP address");
        return;
    }
    
    robotIp = ip;
    window.location.href = `${robotIp}`;

}

function updateStatus(state, message) {
    const statusElement = document.getElementById('status-indicator');
    if (statusElement) {
        statusElement.className = 'status-indicator';
        if (state === 'connected') {
            statusElement.classList.add('connected');
        } else if (state === 'error') {
            statusElement.classList.add('error');
        }
        statusElement.innerHTML = `<i class="fas fa-circle"></i> ${message}`;
    }
}

// QR Code scanner
function startScanner() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let scanning = true;
    let currentStream = null;
    let currentZoom = 1;
    const maxZoom = 3;
    const minZoom = 1;
    const zoomStep = 0.5;

    // Create zoom controls
    const createZoomControls = () => {
        // Check if zoom controls already exist
        if (document.getElementById('zoom-controls')) return;
        
        const zoomContainer = document.createElement('div');
        zoomContainer.id = 'zoom-controls';
        zoomContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        `;

        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '🔍+';
        zoomInBtn.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 18px;
            cursor: pointer;
        `;

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '🔍-';
        zoomOutBtn.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 18px;
            cursor: pointer;
        `;

        const zoomLevel = document.createElement('div');
        zoomLevel.id = 'zoom-level';
        zoomLevel.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            text-align: center;
            font-size: 12px;
        `;
        zoomLevel.textContent = `${currentZoom}x`;

        zoomContainer.appendChild(zoomInBtn);
        zoomContainer.appendChild(zoomLevel);
        zoomContainer.appendChild(zoomOutBtn);

        // Add to scanner container
        const scannerContainer = video.parentElement;
        scannerContainer.style.position = 'relative';
        scannerContainer.appendChild(zoomContainer);

        // Zoom event listeners
        zoomInBtn.addEventListener('click', () => changeZoom(zoomStep));
        zoomOutBtn.addEventListener('click', () => changeZoom(-zoomStep));
    };

    const updateZoomDisplay = () => {
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${currentZoom}x`;
        }
    };

    const changeZoom = async (delta) => {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
        if (newZoom === currentZoom) return;
        
        currentZoom = newZoom;
        updateZoomDisplay();
        
        // Apply zoom if supported
        if (currentStream && currentStream.getVideoTracks().length > 0) {
            const track = currentStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            if (capabilities.zoom) {
                try {
                    await track.applyConstraints({
                        advanced: [{ zoom: currentZoom }]
                    });
                } catch (err) {
                    console.log('Hardware zoom not supported, using CSS zoom');
                    applyDigitalZoom();
                }
            } else {
                applyDigitalZoom();
            }
        }
    };

    const applyDigitalZoom = () => {
        video.style.transform = `scale(${currentZoom})`;
        video.style.transformOrigin = 'center center';
    };

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
            zoom: true // Request zoom capability
        }
    }).then(function (stream) {
        currentStream = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        
        // Create zoom controls
        createZoomControls();
        
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            tick();
        });
    }).catch(function (err) {
        console.error("Error accessing camera:", err);
        document.getElementById("qr-reader-results").textContent = "Camera error. Please check permissions.";
    });

    function tick() {
        if (!scanning) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
            });
            if (code) {
                console.log("QR Code detected:", code.data);
                scanning = false;
                
                // Stop video stream and clean up
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                
                // Remove zoom controls
                const zoomControls = document.getElementById('zoom-controls');
                if (zoomControls) {
                    zoomControls.remove();
                }
                
                document.getElementById("qr-reader-results").textContent = `Successfully scanned: ${code.data}`;
                document.getElementById("ip").value = code.data.trim();
                robotIp = code.data.trim();
                
                // Update URL to just the scanned content and reload
                window.location.href = `${robotIp}`;
                
                return;
            }
        }
        if (scanning) {
            requestAnimationFrame(tick);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkUrlForIp();
    
    if (!robotIp) {
        startScanner();
    }
});