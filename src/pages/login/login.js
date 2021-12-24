const { ipcRenderer } = require('electron');

document.getElementById('login-form').addEventListener('submit', function (e) {
    document.getElementById('spinner').style.display = 'inline-block';
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const useSSL = document.getElementById('useSSL').checked;
    const scheme = useSSL ? 'https' : 'http';
    const domain = (document.getElementById('domain').value || '').trim();

    ipcRenderer.send('login', { email, password, domain, scheme });
});

ipcRenderer.on('login-error', (_, e) => {
    document.getElementById('spinner').style.display = 'none';
    Swal.fire({
        title: 'Error!',
        text: e.message,
        icon: 'error',
        confirmButtonText: 'OK'
    })
});
