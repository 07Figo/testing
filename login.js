// login.js
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store token in localStorage
            localStorage.setItem('token', data.token);  // Store the token here
            alert('Login successful!');
            window.location.href = 'main-page.html';  // Redirect to main page
        } else {
            alert('Invalid credentials.');
        }
    });
});

