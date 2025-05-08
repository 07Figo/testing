document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Registration successful!');
            window.location.href = 'login.html';
        } else {
            alert('Registration failed.');
        }
    });
});
