(function() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const currentPage = window.location.pathname.split('/').pop();

    if (!loggedInUser) {
        if (currentPage !== 'login.html') {
            alert("You must be logged in to view this page.");
            window.location.href = 'login.html';
        }
        return;
    }

    const userRole = loggedInUser.Role;
    const adminOnlyPages = ['admindashboard.html', 'addstudents.html'];
    const staffOnlyPages = ['staffdashboard.html'];

    if (userRole === 'Admin' && staffOnlyPages.includes(currentPage)) {
        alert("Access Denied. Redirecting to your dashboard.");
        window.location.href = 'admindashboard.html';
    } else if (userRole === 'Staff' && adminOnlyPages.includes(currentPage)) {
        alert("Access Denied. Redirecting to your dashboard.");
        window.location.href = 'staffdashboard.html';
    }
})();

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            logout();
        });
    });
});