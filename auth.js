// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCd9XbhKz-AYvVJtLCi2hVDBvyYsSGB89w",
    authDomain: "chess-3596b.firebaseapp.com",
    databaseURL: "https://chess-3596b-default-rtdb.firebaseio.com",
    projectId: "chess-3596b",
    storageBucket: "chess-3596b.firebasestorage.app",
    messagingSenderId: "628293480183",
    appId: "1:628293480183:web:ecd5f317c728cd1233edf2",
    measurementId: "G-11H7GE4LT7"
};

// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
    console.log("Firebase initialized successfully");
    initAuth(auth, database);
} catch (error) {
    console.error("Firebase initialization error:", error);
    document.getElementById("error-message").textContent = "Error initializing authentication. Please try again later.";
    document.getElementById("error-message").style.display = "block";
}

// Initialize authentication after Firebase setup
function initAuth(auth, database) {
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is already logged in, redirect to puzzles
            window.location.href = "puzzles.html";
        }
    });
    
    // DOM elements
    const scanStep = document.getElementById("scan-step");
    const loginStep = document.getElementById("login-step");
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    const manualToggle = document.getElementById("manual-toggle");
    const manualIdInput = document.getElementById("manual-id-input");
    const manualSubmit = document.getElementById("manual-submit");
    const startScanButton = document.getElementById("start-scan-button");
    
    // Make sure these elements exist
    if (!manualIdInput || !manualSubmit) {
        console.error("Manual input elements not found");
        if (errorMessage) {
            errorMessage.textContent = "There was a problem with the form. Please refresh the page.";
            errorMessage.style.display = "block";
        }
        return;
    }
    
    // HTML5 QR code scanner setup
    let html5QrCode;
    let isScanning = false;
    
    // Function to start QR code scanning
    function startScanner() {
        if (!document.getElementById("qr-reader")) {
            console.error("QR reader element not found");
            return;
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start(
            { facingMode: "environment" },
            qrConfig,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            isScanning = true;
            if (startScanButton) {
                startScanButton.textContent = "Cancel Scan";
                startScanButton.classList.add("scanning");
            }
        }).catch(error => {
            console.error("QR Scanner start error:", error);
            showError("Could not access camera. Please check permissions or use manual input.");
        });
    }
    
    // Function to stop QR code scanning
    function stopScanner() {
        if (html5QrCode && isScanning) {
            html5QrCode.stop().then(() => {
                isScanning = false;
                if (startScanButton) {
                    startScanButton.textContent = "Start QR Scanner";
                    startScanButton.classList.remove("scanning");
                }
            }).catch(error => {
                console.error("QR Scanner stop error:", error);
            });
        }
    }
    
    // Toggle scanner state when the start button is clicked
    if (startScanButton) {
        startScanButton.addEventListener("click", () => {
            if (!isScanning) {
                startScanner();
            } else {
                stopScanner();
            }
        });
    }
    
    // Function to handle successful QR code scan
    function onScanSuccess(decodedText) {
        console.log("QR code scanned:", decodedText);
        // Check if the QR code contains a valid membership URL
        if (decodedText.includes("member.html?id=")) {
            // Extract member ID from the URL
            const memberIdMatch = decodedText.match(/id=([^&]+)/);
            if (memberIdMatch && memberIdMatch[1]) {
                const memberId = memberIdMatch[1];
                // Stop scanning
                stopScanner();
                // Process the member ID
                processMemberId(memberId);
            } else {
                showError("Invalid QR code format");
            }
        } else if (decodedText.match(/^\d{1,4}-[a-zA-Z]+-[a-zA-Z]+$/)) {
            // Direct member ID format
            stopScanner();
            processMemberId(decodedText);
        } else {
            showError("Invalid QR code. Please scan your membership card.");
        }
    }
    
    // Function to handle scan failure
    function onScanFailure(error) {
        // Handle scan failure silently
        console.warn(`QR code scan error: ${error}`);
    }
    
    // Function to process member ID (from QR code or manual input)
    function processMemberId(memberId) {
        console.log("Processing member ID:", memberId);
        // More flexible validation for membership ID format
        // Accept formats like 0001-firstname-lastname or variations
        const idRegex = /^(\d{1,4})-([a-zA-Z]+)(-[a-zA-Z]+)?$/;
        const idMatch = memberId.match(idRegex);
        
        if (!idMatch) {
            showError("Invalid membership ID format. Expected format: 0001-firstname-lastname");
            return;
        }
        
        // Extract name from ID - handle both with and without lastname
        let name;
        if (idMatch[3]) {
            // Has lastname
            name = idMatch[2] + idMatch[3];
        } else {
            // Only firstname
            name = idMatch[2];
        }
        
        // Set email and password
        const email = `${name.toLowerCase()}@ibnsinachess.com`;
        const password = memberId;
        
        console.log("Email generated:", email);
        console.log("Password generated:", password);
        
        // Pre-fill login form
        emailInput.value = email;
        passwordInput.value = password;
        
        // Show login step
        scanStep.style.display = "none";
        loginStep.style.display = "block";
        loginForm.style.display = "flex";
        
        // Store member ID in session storage
        sessionStorage.setItem("memberId", memberId);
    }
    
    // Login form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        try {
            // Show loading state
            const submitButton = loginForm.querySelector("button");
            submitButton.disabled = true;
            submitButton.textContent = "Logging in...";
            
            // Sign in with email and password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get member ID from session storage
            const memberId = sessionStorage.getItem("memberId");
            
            if (memberId) {
                // Update user data in Realtime Database
                await database.ref(`users/${memberId}`).set({
                    email: email,
                    lastLogin: new Date().toISOString(),
                    uid: user.uid
                });
                
                // Show success message
                showSuccess("Login successful! Redirecting to puzzles...");
                
                // Redirect to puzzles page
                setTimeout(() => {
                    window.location.href = "puzzles.html";
                }, 1500);
            } else {
                showError("Membership ID not found. Please scan your QR code again.");
                submitButton.disabled = false;
                submitButton.textContent = "Login";
            }
        } catch (error) {
            console.error("Authentication error:", error);
            
            // Handle different error cases
            if (error.code === "auth/user-not-found") {
                // Create a new user if they don't exist
                try {
                    await auth.createUserWithEmailAndPassword(email, password);
                    showSuccess("Account created! Logging in...");
                    
                    // Get member ID from session storage
                    const memberId = sessionStorage.getItem("memberId");
                    
                    if (memberId) {
                        // Update user data in Realtime Database
                        await database.ref(`users/${memberId}`).set({
                            email: email,
                            lastLogin: new Date().toISOString(),
                            uid: auth.currentUser.uid
                        });
                        
                        // Redirect to puzzles page
                        setTimeout(() => {
                            window.location.href = "puzzles.html";
                        }, 1500);
                    }
                } catch (createError) {
                    showError(`Error creating account: ${createError.message}`);
                }
            } else {
                showError(`Authentication error: ${error.message}`);
            }
            
            // Reset button state
            const submitButton = loginForm.querySelector("button");
            submitButton.disabled = false;
            submitButton.textContent = "Login";
        }
    });
    
    // Manual ID input toggle
    manualToggle.addEventListener("click", function() {
        console.log("Manual toggle clicked");
        
        if (manualIdInput.style.display === "none" || manualIdInput.style.display === "") {
            manualIdInput.style.display = "block";
            manualSubmit.style.display = "inline-block";
            manualToggle.textContent = "Cancel manual entry";
            
            // Stop scanner if it's running
            stopScanner();
        } else {
            manualIdInput.style.display = "none";
            manualSubmit.style.display = "none";
            manualToggle.textContent = "Enter ID manually";
        }
    });
    
    // Manual ID submission - Fixed
    manualSubmit.addEventListener("click", function() {
        console.log("Manual submit clicked");
        const memberId = manualIdInput.value.trim();
        console.log("Member ID entered:", memberId);
        
        if (memberId) {
            processMemberId(memberId);
        } else {
            showError("Please enter your membership ID");
        }
    });
    
    // Adding debugging for manual enter keypress
    manualIdInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            console.log("Enter key pressed in manual ID input");
            manualSubmit.click();
        }
    });
    
    // Show error message
    function showError(message) {
        console.log("Error:", message);
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
    }
    
    // Show success message
    function showSuccess(message) {
        console.log("Success:", message);
        successMessage.textContent = message;
        successMessage.style.display = "block";
        errorMessage.style.display = "none";
    }
}