const loginForm = document.getElementById('loginForm');
const staffNumberInput = document.getElementById('staffNumber');
const passwordInput = document.getElementById('password');
const loginSubmit = document.getElementById('loginSubmit');
const loginError = document.getElementById('loginError');

async function handleLoginSubmit(event) {
    console.log('handleLoginSubmit called')
    event.preventDefault();
    loginError.textContent = '';
    loginSubmit.disabled = true;

    const staffNumber = staffNumberInput.value.trim();
    const password = passwordInput.value;

    if (staffNumber === '' || password === '') {
        loginError.textContent = 'Enter your staff number and password.';
        loginSubmit.disabled = false;
        return;
    }

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_number: staffNumber, password }),
    });

    if (response.ok) {
        const body = await response.json();
        sessionStorage.setItem('tla_fresh_login', 'true');
        window.location.href = body.is_admin ? '/admin.html' : '/index.html';
        return;
    }

    loginError.textContent = 'Incorrect staff number or password.';
    loginSubmit.disabled = false;
}

window.addEventListener('pageshow', function () {
    loginError.textContent = '';
    loginSubmit.disabled = false;
});

loginForm.addEventListener('submit', handleLoginSubmit);

