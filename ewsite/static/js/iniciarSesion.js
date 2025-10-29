document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.closeBtn');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('loginForm').addEventListener('submit', (event) => {
        event.preventDefault();
        // Aquí puedes agregar la lógica para manejar el inicio de sesión
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        console.log(`Usuario: ${username}, Contraseña: ${password}`);
        modal.style.display = 'none';
    });
});