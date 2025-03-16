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

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let board = null;
let game = new Chess();
let currentPuzzle = null;
let currentUser = null;
let userStats = {
    solved: 0,
    points: 0
};
let puzzles = [];
let currentPuzzleIndex = 0;
let attemptsMade = 0;
let authChecked = false; // Flag to prevent multiple redirects

// DOM elements
const boardElement = document.getElementById('board');
const puzzleIdElement = document.getElementById('puzzle-id');
const puzzleDifficultyElement = document.getElementById('puzzle-difficulty');
const puzzleThemesElement = document.getElementById('puzzle-themes');
const puzzleInstructionElement = document.getElementById('puzzle-instruction');
const puzzleMessageElement = document.getElementById('puzzle-message');
const userAvatarElement = document.getElementById('user-avatar');
const userNameElement = document.getElementById('user-name');
const solvedCountElement = document.getElementById('solved-count');
const userPointsElement = document.getElementById('user-points');
const hintButton = document.getElementById('hint-btn');
const solutionButton = document.getElementById('solution-btn');
const nextButton = document.getElementById('next-btn');
const logoutButton = document.getElementById('logout-btn');

// Check authentication state
auth.onAuthStateChanged(user => {
    if (authChecked) return; // Prevent multiple execution
    authChecked = true;
    
    if (user) {
        currentUser = user;
        console.log("User authenticated:", user.email);
        
        // Get user ID from session storage
        const memberId = sessionStorage.getItem("memberId");
        
        if (memberId) {
            console.log("Member ID found in session:", memberId);
            fetchUserData(memberId)
                .then(() => {
                    loadPuzzles();
                })
                .catch(error => {
                    console.error("Error in fetchUserData:", error);
                    // Display error message instead of redirecting
                    showMessage("Error loading user data. Please refresh the page.", "error");
                });
        } else {
            console.log("No member ID in session, trying to find by email");
            // Try to get user data from email
            const emailParts = user.email.split('@');
            if (emailParts.length > 1 && emailParts[1].includes("ibnsinachess")) {
                const name = emailParts[0];
                console.log("Searching for user with email:", user.email);
                
                // Query database to find the user with this email
                database.ref('users').orderByChild('email').equalTo(user.email).once('value')
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            const userData = snapshot.val();
                            const userId = Object.keys(userData)[0];
                            console.log("Found user ID:", userId);
                            
                            sessionStorage.setItem("memberId", userId);
                            return fetchUserData(userId);
                        } else {
                            console.log("No user found with email:", user.email);
                            // Create temporary user data instead of redirecting
                            const tempId = "temp-" + name;
                            sessionStorage.setItem("memberId", tempId);
                            
                            // Set basic user info
                            userNameElement.textContent = name;
                            const initials = name.charAt(0).toUpperCase();
                            userAvatarElement.textContent = initials;
                            
                            // Initialize stats
                            userStats = {
                                solved: 0,
                                points: 0,
                                lastPuzzle: null
                            };
                            
                            updateUserStats();
                            return Promise.resolve();
                        }
                    })
                    .then(() => {
                        loadPuzzles();
                    })
                    .catch(error => {
                        console.error("Error finding user:", error);
                        // Display error message instead of redirecting
                        showMessage("Error loading user data. Please refresh the page.", "error");
                    });
            } else {
                console.log("Invalid email format:", user.email);
                // Create a generic user instead of redirecting
                createGenericUser(user);
                loadPuzzles();
            }
        }
    } else {
        console.log("No authenticated user, redirecting to auth page");
        redirectToAuth();
    }
});

// Create generic user when no member ID is found
function createGenericUser(user) {
    const name = user.email ? user.email.split('@')[0] : "Guest";
    userNameElement.textContent = name;
    const initials = name.charAt(0).toUpperCase();
    userAvatarElement.textContent = initials;
    
    userStats = {
        solved: 0,
        points: 0,
        lastPuzzle: null
    };
    
    updateUserStats();
}

// Fetch user data from database
function fetchUserData(memberId) {
    return new Promise((resolve, reject) => {
        console.log(`Fetching user data for ID: ${memberId}`);
        
        database.ref(`users/${memberId}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    console.log("User data found:", userData);
                    
                    // Update user profile
                    const nameParts = memberId.split('-');
                    const name = nameParts.slice(1).join('-');
                    userNameElement.textContent = name || memberId;
                    
                    // Set avatar with initials
                    const initials = name 
                        ? name.split('-')
                            .map(part => part.charAt(0).toUpperCase())
                            .join('')
                        : memberId.charAt(0).toUpperCase();
                    
                    userAvatarElement.textContent = initials;
                    
                    // Get user stats
                    return database.ref(`users/${memberId}/stats`).once('value');
                } else {
                    console.log("No user data found for ID:", memberId);
                    // Initialize basic info if no data exists
                    userNameElement.textContent = memberId;
                    userAvatarElement.textContent = memberId.charAt(0).toUpperCase();
                    
                    // Initialize stats
                    userStats = {
                        solved: 0,
                        points: 0,
                        lastPuzzle: null
                    };
                    
                    return database.ref(`users/${memberId}/stats`).set(userStats)
                        .then(() => {
                            return database.ref(`users/${memberId}/stats`).once('value');
                        });
                }
            })
            .then((statsSnapshot) => {
                if (statsSnapshot.exists()) {
                    userStats = statsSnapshot.val();
                    console.log("User stats:", userStats);
                }
                
                // Update UI with stats
                updateUserStats();
                resolve();
            })
            .catch(error => {
                console.error("Error in fetchUserData:", error);
                reject(error);
            });
    });
}

// Update user stats in UI
function updateUserStats() {
    solvedCountElement.textContent = userStats.solved || 0;
    userPointsElement.textContent = userStats.points || 0;
}

// Load puzzles from database
function loadPuzzles() {
    console.log("Loading puzzles");
    
    database.ref('puzzles').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const puzzlesData = snapshot.val();
                puzzles = Object.values(puzzlesData);
                console.log(`Loaded ${puzzles.length} puzzles`);
                
                // Shuffle puzzles
                shuffleArray(puzzles);
                
                // If user has a last puzzle, try to start from there
                if (userStats.lastPuzzle) {
                    const lastPuzzleIndex = puzzles.findIndex(p => p.id === userStats.lastPuzzle);
                    if (lastPuzzleIndex !== -1) {
                        currentPuzzleIndex = lastPuzzleIndex + 1;
                        if (currentPuzzleIndex >= puzzles.length) {
                            currentPuzzleIndex = 0; // Loop back to start
                        }
                    }
                }
                
                // Load the first puzzle
                loadPuzzle(currentPuzzleIndex);
            } else {
                console.error("No puzzles found");
                showMessage("No puzzles available. Please try again later.", "error");
            }
        })
        .catch(error => {
            console.error("Error loading puzzles:", error);
            showMessage("Error loading puzzles. Please try again later.", "error");
        });
}

// Load puzzle at the given index
function loadPuzzle(index) {
    if (!puzzles.length) {
        console.error("No puzzles available to load");
        showMessage("No puzzles available. Please try again later.", "error");
        return;
    }
    
    if (index >= puzzles.length) {
        index = 0; // Loop back to start
    }
    
    currentPuzzleIndex = index;
    currentPuzzle = puzzles[index];
    attemptsMade = 0;
    
    console.log("Loading puzzle:", currentPuzzle.id);
    
    // Update UI with puzzle info
    if (puzzleIdElement) puzzleIdElement.textContent = currentPuzzle.id.replace('puzzle_', '');
    if (puzzleDifficultyElement) puzzleDifficultyElement.textContent = currentPuzzle.difficulty.charAt(0).toUpperCase() + currentPuzzle.difficulty.slice(1);
    if (puzzleThemesElement) puzzleThemesElement.textContent = currentPuzzle.themes.map(theme => theme.charAt(0).toUpperCase() + theme.slice(1)).join(', ');
    
    // Set instruction based on who's turn it is
    const turn = currentPuzzle.turn === 'w' ? 'White' : 'Black';
    if (puzzleInstructionElement) puzzleInstructionElement.textContent = `Find the best move for ${turn}.`;
    
    // Load position
    game = new Chess(currentPuzzle.fen);
    
    // Clear any previous messages
    hideMessage();
    
    // Initialize board
    try {
        initializeBoard();
        
        // Save last puzzle for user
        const memberId = sessionStorage.getItem("memberId");
        if (memberId) {
            database.ref(`users/${memberId}/stats/lastPuzzle`).set(currentPuzzle.id);
        }
    } catch (error) {
        console.error("Error initializing board:", error);
        showMessage("Error loading puzzle. Please refresh the page.", "error");
    }
}

// Initialize chessboard
function initializeBoard() {
    // Destroy previous board if it exists
    if (board) {
        board.destroy();
    }
    
    // Set orientation based on turn
    const orientation = currentPuzzle.turn === 'w' ? 'white' : 'black';
    
    // Create new board
    const config = {
        draggable: true,
        position: game.fen(),
        orientation: orientation,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    
    board = Chessboard('board', config);
    
    // Resize board to fit container
    $(window).resize(() => {
        board.resize();
    });
}

// Handle drag start event
function onDragStart(source, piece, position, orientation) {
    // Only allow the player whose turn it is to move
    if (game.turn() !== currentPuzzle.turn) {
        return false;
    }
    
    // Only allow moving pieces of the correct color
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
    
    // Don't allow moving if game is over
    if (game.game_over()) {
        return false;
    }
    
    return true;
}

// Handle drop event
function onDrop(source, target) {
    // See if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });
    
    // If illegal move, snap back
    if (move === null) {
        return 'snapback';
    }
    
    // Check if the move matches the solution
    checkSolution(move);
}

// Handle snap end event
function onSnapEnd() {
    board.position(game.fen());
}

// Check if move matches solution
function checkSolution(move) {
    const moveNotation = convertMoveToNotation(move);
    
    // Check if this move is in the solution
    if (currentPuzzle.solution.includes(moveNotation)) {
        // Correct move
        showMessage("Correct! Well done!", "success");
        
        // Update user stats
        updateUserStatsAfterSolve();
        
        // Disable board
        board.draggable = false;
    } else {
        // Wrong move
        attemptsMade++;
        
        if (attemptsMade >= 3) {
            // After 3 failed attempts, show a hint
            showMessage("Incorrect. Try again. Hint: " + getHint(), "hint");
        } else {
            showMessage("Incorrect. Try again.", "error");
            
            // Reset to original position
            game = new Chess(currentPuzzle.fen);
            board.position(game.fen());
        }
    }
}

// Convert move object to notation
function convertMoveToNotation(move) {
    // Handle special cases
    if (move.flags.includes('k') || move.flags.includes('q')) {
        // Castling
        return move.flags.includes('k') ? 'O-O' : 'O-O-O';
    }
    
    let notation = '';
    
    // Add piece letter for non-pawns
    if (move.piece !== 'p') {
        notation += move.piece.toUpperCase();
    }
   // Add from square if needed (for disambiguation)
   if (move.flags.includes('c') || move.flags.includes('e')) {
    // capture or en passant
    if (move.piece === 'p') {
        notation += move.from[0];
    }
}

// Add capture symbol
if (move.flags.includes('c') || move.flags.includes('e')) {
    notation += 'x';
}

// Add destination square
notation += move.to;

// Add promotion piece
if (move.flags.includes('p')) {
    notation += '=' + move.promotion.toUpperCase();
}

// Add check/checkmate symbol
if (move.flags.includes('n') || move.flags.includes('b')) {
    notation += '#';
} else if (move.flags.includes('c') || move.flags.includes('e')) {
    notation += '+';
}

return notation;
}

// Get a hint for the current puzzle
function getHint() {
const solution = currentPuzzle.solution[0];

// Extract the destination square
let destination = solution.match(/([a-h][1-8])/);
if (destination) {
    return `Look for a move to ${destination[0]}`;
}

// Fallback if pattern matching fails
return "Look for a checkmate or tactical move";
}

// Update user stats after solving a puzzle
function updateUserStatsAfterSolve() {
const memberId = sessionStorage.getItem("memberId");
if (!memberId) return;

// Calculate points based on difficulty and attempts
let points = 0;
switch (currentPuzzle.difficulty) {
    case 'easy':
        points = 5;
        break;
    case 'medium':
        points = 10;
        break;
    case 'hard':
        points = 15;
        break;
    case 'expert':
        points = 20;
        break;
}

// Reduce points for multiple attempts
points = Math.max(1, points - (attemptsMade * 2));

// Update user stats
userStats.solved = (userStats.solved || 0) + 1;
userStats.points = (userStats.points || 0) + points;

// Save to database
database.ref(`users/${memberId}/stats`).update({
    solved: userStats.solved,
    points: userStats.points
});

// Add to solved puzzles
database.ref(`users/${memberId}/solved/${currentPuzzle.id}`).set({
    timestamp: Date.now(),
    points: points,
    attempts: attemptsMade + 1
});

// Update UI
updateUserStats();
}

// Show message
function showMessage(message, type) {
if (!puzzleMessageElement) return;

puzzleMessageElement.textContent = message;
puzzleMessageElement.className = 'puzzle-message';
puzzleMessageElement.classList.add(`puzzle-${type}`);
puzzleMessageElement.style.display = 'block';
}

// Hide message
function hideMessage() {
if (!puzzleMessageElement) return;
puzzleMessageElement.style.display = 'none';
}

// Shuffle array
function shuffleArray(array) {
for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
}
return array;
}

// Redirect to auth page
function redirectToAuth() {
console.log("Redirecting to auth page");
window.location.href = "auth.html";
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
console.log("DOM content loaded");

// Hint button
if (hintButton) {
    hintButton.addEventListener('click', () => {
        showMessage("Hint: " + getHint(), "hint");
    });
}

// Solution button
if (solutionButton) {
    solutionButton.addEventListener('click', () => {
        showMessage("Solution: " + currentPuzzle.solution.join(' or '), "hint");
    });
}

// Next button
if (nextButton) {
    nextButton.addEventListener('click', () => {
        loadPuzzle(currentPuzzleIndex + 1);
    });
}

// Logout button
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            sessionStorage.removeItem("memberId");
            redirectToAuth();
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    });
}

// Tab switching
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding content
        const tabId = tab.getAttribute('data-tab');
        const contentTab = document.getElementById(`${tabId}-tab`);
        if (contentTab) {
            contentTab.classList.add('active');
        }
        
        // If leaderboard tab, refresh leaderboard
        if (tabId === 'leaderboard') {
            if (typeof loadLeaderboard === 'function') {
                loadLeaderboard();
            }
        }
    });
});
});

// Function to refresh leaderboard from leaderboard.js
function refreshLeaderboard() {
if (typeof loadLeaderboard === 'function') {
    loadLeaderboard();
} else {
    console.warn("Leaderboard function not available");
}
}