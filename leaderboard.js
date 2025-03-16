// Leaderboard management functions

// DOM elements
const leaderboardBody = document.getElementById('leaderboard-body');

// Load leaderboard data
function loadLeaderboard() {
    // Clear current leaderboard
    leaderboardBody.innerHTML = '';
    
    // Show loading state
    const loadingRow = document.createElement('tr');
    loadingRow.innerHTML = `
        <td colspan="4" style="text-align: center;">Loading leaderboard data...</td>
    `;
    leaderboardBody.appendChild(loadingRow);
    
    // Fetch all users with stats
    database.ref('users').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const users = snapshot.val();
                const leaderboardData = [];
                
                // Process users data
                Object.entries(users).forEach(([userId, userData]) => {
                    if (userData.stats && userData.stats.points) {
                        const nameParts = userId.split('-');
                        const name = nameParts.slice(1).join('-');
                        
                        leaderboardData.push({
                            id: userId,
                            name: name,
                            solved: userData.stats.solved || 0,
                            points: userData.stats.points || 0
                        });
                    }
                });
                
                // Sort by points (descending)
                leaderboardData.sort((a, b) => b.points - a.points);
                
                // Clear loading state
                leaderboardBody.innerHTML = '';
                
                // Populate leaderboard
                leaderboardData.forEach((user, index) => {
                    const rank = index + 1;
                    const row = document.createElement('tr');
                    
                    // Add rank icon based on position
                    let rankIcon = '';
                    if (rank === 1) {
                        rankIcon = '<i class="fas fa-trophy gold rank-icon"></i>';
                    } else if (rank === 2) {
                        rankIcon = '<i class="fas fa-medal silver rank-icon"></i>';
                    } else if (rank === 3) {
                        rankIcon = '<i class="fas fa-medal bronze rank-icon"></i>';
                    }
                    
                    row.innerHTML = `
                        <td>${rankIcon}${rank}</td>
                        <td>${user.name}</td>
                        <td>${user.solved}</td>
                        <td>${user.points}</td>
                    `;
                    
                    // Highlight current user
                    const memberId = sessionStorage.getItem("memberId");
                    if (user.id === memberId) {
                        row.style.fontWeight = 'bold';
                        row.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                    }
                    
                    leaderboardBody.appendChild(row);
                });
                
                // Handle empty leaderboard
                if (leaderboardData.length === 0) {
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = `
                        <td colspan="4" style="text-align: center;">No leaderboard data available yet.</td>
                    `;
                    leaderboardBody.appendChild(emptyRow);
                }
            } else {
                // No users found
                leaderboardBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center;">No leaderboard data available yet.</td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error("Error loading leaderboard:", error);
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: red;">Error loading leaderboard data.</td>
                </tr>
            `;
        });
}

// Calculate user rank
function getUserRank(userId) {
    return new Promise((resolve, reject) => {
        database.ref('users').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const users = snapshot.val();
                    const leaderboardData = [];
                    
                    // Process users data
                    Object.entries(users).forEach(([id, userData]) => {
                        if (userData.stats && userData.stats.points) {
                            leaderboardData.push({
                                id: id,
                                points: userData.stats.points || 0
                            });
                        }
                    });
                    
                    // Sort by points (descending)
                    leaderboardData.sort((a, b) => b.points - a.points);
                    
                    // Find user's rank
                    const userIndex = leaderboardData.findIndex(user => user.id === userId);
                    if (userIndex !== -1) {
                        resolve(userIndex + 1);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            })
            .catch(error => {
                console.error("Error getting user rank:", error);
                reject(error);
            });
    });
}

// Initialize leaderboard
document.addEventListener('DOMContentLoaded', () => {
    // Initial load will happen when tab is clicked
});