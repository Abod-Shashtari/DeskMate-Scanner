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

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    }).then(function (stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
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

                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
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