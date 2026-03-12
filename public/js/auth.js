// Client-side auth helpers: hide Login/Sign Up and show Logout when session exists
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/user');
        if (!res.ok) return; // not logged in

        // user is logged in - hide both Login and Sign Up links
        let loginLink = null;
        let signupLink = null;
        document.querySelectorAll('a.nav-link').forEach(a => {
            const text = a.textContent.trim().toLowerCase();
            if (!loginLink && text === 'login') loginLink = a;
            if (!signupLink && text === 'sign up') signupLink = a;
        });
        
        // Hide Login link
        if (loginLink) {
            const li = loginLink.closest('li') || loginLink.parentElement;
            if (li) li.style.display = 'none';
        }
        
        // Hide Sign Up link  
        if (signupLink) {
            const li = signupLink.closest('li') || signupLink.parentElement;
            if (li) li.style.display = 'none';
        }

        // add Logout link
        const navUl = document.querySelector('.navbar-nav.ms-auto');
        if (navUl && !document.querySelector('a[href="#logout"]')) {
            const logoutLi = document.createElement('li');
            logoutLi.className = 'nav-item mx-2';
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = '#logout';
            a.textContent = 'Logout';
            a.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const res = await fetch('/api/logout', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        // Successfully logged out, clear session and reload
                        window.location.href = '/';
                    } else {
                        alert('Logout failed: ' + (data.error || 'Unknown error'));
                    }
                } catch (err) {
                    alert('Logout error: ' + err.message);
                }
            });
            logoutLi.appendChild(a);
            navUl.appendChild(logoutLi);
        }
    } catch (e) {
        // ignore network errors
    }
});