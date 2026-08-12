document.addEventListener("DOMContentLoaded", function () {
    desactivarBotones();
});

function desactivarBotones() {
    const btnGuardar = document.getElementById("guardar-btn");
    const btnCancelar = document.getElementById("cancelar-btn");

    btnGuardar.disabled = true;

    btnCancelar.classList.add("disabled");
    btnCancelar.style.pointerEvents = "none";
    btnCancelar.style.opacity = "0.5";
}

function activarBotones() {
    const btnGuardar = document.getElementById("guardar-btn");
    const btnCancelar = document.getElementById("cancelar-btn");
    const mensaje = document.getElementById("mensaje-guardado");
    
    if (mensaje) {mensaje.style.display = "none";}
    btnGuardar.disabled = false;

    btnCancelar.classList.remove("disabled");
    btnCancelar.style.pointerEvents = "auto";
    btnCancelar.style.opacity = "1";
}

function cargarAccesosUsuario() {
    const usuarioSelect = document.getElementById("usuarioSeleccionado");
    const tbody = document.getElementById("listAccesosUsuario_body");

    const valorUsuario = usuarioSelect.value.trim();

    desactivarBotones();

    if (!valorUsuario) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align:center; color:#777;">
                    Seleccione un usuario para ver sus accesos.
                </td>
            </tr>
        `;
        return;
    }

    const login = valorUsuario.split(" - ")[0].trim();

    fetch(`/configurapp/accesos_usuario/?login=${encodeURIComponent(login)}&company=${companyKey}`)
        .then(response => response.json())
        .then(data => {
            tbody.innerHTML = "";


           const login = usuarioSelect.value.split(" - ")[0].trim();

data.accesos.forEach(acceso => {

    const loginLimpio = login.trim().toLowerCase();
    const sistemaLimpio = acceso.sistema.trim().toUpperCase();

    const bloquearAC = loginLimpio === "intaco" && sistemaLimpio === "AC";

    tbody.innerHTML += `
              <tr>
             <td>${acceso.sistema}</td>

               <td style="text-align:center;">

            <button type="button"
            class="btn btn-sm btn-acceso ${acceso.activo ? 'btn-success' : 'btn-danger'}"
            data-sistema="${acceso.sistema}"
            data-activo="${acceso.activo ? '1' : '0'}"
            onclick="${bloquearAC ? '' : 'toggleAcceso(this)'}"
            ${bloquearAC ? 'disabled title="No se puede quitar este acceso"' : ''}>

            <i class="fas ${acceso.activo ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>

            ${acceso.activo ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}

            </button>

            </td>
         </tr>
        
                `;
            });

            
        })
        .catch(error => {
            console.error(error);
            alert("Error al cargar accesos");
        });
}

document.getElementById("guardar-btn").addEventListener("click", function () {
    const valorUsuario = document.getElementById("usuarioSeleccionado").value.trim();

    if (!valorUsuario) {
        alert("Seleccione un usuario");
        return;
    }

    const login = valorUsuario.split(" - ")[0].trim();
    const botones = document.querySelectorAll(".btn-acceso");

    const accesos = [];

    botones.forEach(btn => {
        accesos.push({
            sistema: btn.dataset.sistema,
            activo: btn.dataset.activo === "1"
        });
    });

    fetch(`/configurapp/guardar_accesos/?company=${companyKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            login: login,
            accesos: accesos
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            document.getElementById("mensaje-guardado").style.display = "block";

            desactivarBotones();

            setTimeout(() => {
                document.getElementById("mensaje-guardado").style.display = "none";
            }, 3000);
        } else {
            alert(data.error || "Error al guardar accesos");
        }
    })
    .catch(error => {
        console.error(error);
        alert("Error al guardar accesos");
    });
});



function irProcesoNivel() {
    const nivel = document.getElementById("nivelCodigo").value;

    if (!nivel) {
        alert("Seleccione un proceso");
        return;
    }

    window.location.href = `/configurapp/templates/centro_gastos/?nivel=${nivel}&company={{ company_key }}`;
}

function mostrarNiveles() {
    const niveles = [
        { cia: "e", nivel: "1", nombre: "CONCEPTO TRANSACCIONAL" },
        { cia: "e", nivel: "2", nombre: "AGENCIA" },
        { cia: "e", nivel: "3", nombre: "MARCA" },
        { cia: "e", nivel: "4", nombre: "LINEA NEGOCIO" }
    ];

    const tbody = document.getElementById("tablaNivelesBody");
    tbody.innerHTML = "";

    niveles.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.cia}</td>
                <td>${item.nivel}</td>
                <td>${item.nombre}</td>
            </tr>
        `;
    });
}

function toggleAcceso(btn) {
    const activo = btn.dataset.activo === "1";

    if (activo) {
        btn.dataset.activo = "0";
        btn.classList.remove("btn-success");
        btn.classList.add("btn-danger");

        btn.innerHTML = `
            <i class="fas fa-times-circle me-1"></i>
            ACCESO DENEGADO
        `;
    } else {
        btn.dataset.activo = "1";
        btn.classList.remove("btn-danger");
        btn.classList.add("btn-success");

        btn.innerHTML = `
            <i class="fas fa-check-circle me-1"></i>
            ACCESO PERMITIDO
        `;
    }

    activarBotones();
}