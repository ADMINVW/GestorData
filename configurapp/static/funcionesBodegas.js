document.addEventListener("DOMContentLoaded", function () { // Primero carga las bodegas existentes y luego los niveles disponibles.
     listarBodegas();

    cargarNivelesBodega()
        .then(() => {
            validarGuardarBodega();
        })
        .catch(error => {
            console.error(
                "No se pudo inicializar el formulario de bodegas:",
                error
            );

            validarGuardarBodega();
        });
    // Permite guardar con Enter cuando los campos obligatorios son válidos.
    registrarEnterFormulario(["codigoBodega", "nombreBodega"], "btnGuardarBodega", validarGuardarBodega);
});

function limpiarErrorBodega() {
    const error = document.getElementById("errorBodega");

    if (error) {
        error.innerHTML = "";
        error.style.display = "none";
    }

    document.getElementById("codigoBodega").classList.remove("is-invalid");
    document.getElementById("nombreBodega").classList.remove("is-invalid");
}


function cargarPadresBodega() { 
    const nivel = document.getElementById("nivelBodega").value;
    const select = document.getElementById("padreBodega");
    const cuentaInput = document.getElementById("cuentaBodega");

    select.innerHTML = `
        <option value="">Seleccione</option>
    `;

    cuentaInput.value = "";

    if (!nivel) {// Cada opción conserva también su código  y cuenta para construir posteriormente la cuenta completa de la bodega.
        validarGuardarBodega();
        return;
    }

    fetch(
        `/configurapp/listar_padres_bodega/?nivel=${encodeURIComponent(nivel)}&company=${encodeURIComponent(companyKey)}`
    )
        .then(async response => {
            const contentType =// Verifica que Django realmente haya devuelto JSON antes de procesar la respuesta.
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `El servidor devolvió una respuesta no JSON. HTTP ${response.status}`
                );
            }

            const data = await response.json();

            if (!response.ok || data.ok === false) {
                throw new Error(
                    data.error ||
                    `No se pudieron cargar los registros. HTTP ${response.status}`
                );
            }

            return data;
        })
        .then(data => {
            const padres = Array.isArray(data.padres)
                ? data.padres
                : [];

            padres.forEach(item => {
                const contexto = []; // Agrega información de niveles superiores para distinguir rutas similares.

                if (item.nombre_padre) {
                    contexto.push(item.nombre_padre);
                }

                if (item.nombre_abuelo) {
                    contexto.push(item.nombre_abuelo);
                }

                const textoContexto = contexto.length
                    ? ` / ${contexto.join(" / ")}`
                    : "";

                const valorOption =// Usa el identificador más completo disponible como valor del padre.
                    item.identificador ||
                    item.cuenta ||
                    item.codseccion ||
                    "";

                const textoCuenta =
                    item.cuenta ||
                    item.identificador ||
                    item.codseccion ||
                    "";

                select.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${valorOption}"
                            data-codseccion="${item.codseccion || ""}"
                            data-cuenta="${textoCuenta}">
                        ${textoCuenta} - ${item.nomseccion || ""}${textoContexto}
                    </option>
                    `);
            });

            limpiarErrorBodega();
            validarGuardarBodega();
        })
        .catch(error => {
            console.error(
                "Error cargando registros de bodega:",
                error
            );

            select.innerHTML = `
                <option value="">
                    No se pudieron cargar los registros
                </option>
            `;

            mostrarErrorBodega(
                error.message ||
                "No se pudieron cargar los registros disponibles."
            );

            validarGuardarBodega();
        });
}



function cargarNivelesBodega() { //  Obtiene los niveles definidos en Centros de Gastos y construye el selector utilizado para ubicar la bodega
    const selectNivel = document.getElementById("nivelBodega");

    if (!selectNivel) {// Solo se permiten niveles desde el 2 porque una bodega debe depedner de una estructura superior
        console.error("No existe el select #nivelBodega.");
        return Promise.reject(
            new Error("No existe el select de niveles de bodega.")
        );
    }

    selectNivel.innerHTML = `
        <option value="">Cargando niveles...</option>
    `;

    selectNivel.disabled = true;

    return fetch(
        `/configurapp/niveles_disponibles_cg/?company=${encodeURIComponent(companyKey)}`
    )
        .then(async response => {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "No se pudieron cargar los niveles."
                );
            }

            return data;
        })
        .then(data => {
            const niveles = Array.isArray(data.niveles)
                ? data.niveles
                : [];

            const nivelesPermitidos = niveles.filter( // Excluye el nivel raíz; las bodegas se crean dentro de una ubicación existente
                item => Number(item.nivel) >= 2
            );

            selectNivel.innerHTML = `
                <option value="">Seleccione nivel</option>
            `;

            nivelesPermitidos.forEach(item => {
                const numeroNivel = Number(item.nivel);
                const nombreNivel = String(item.nombre || "")
                    .trim()
                    .toUpperCase();

                selectNivel.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${numeroNivel}">
                        ${numeroNivel} - ${nombreNivel}
                    </option>
                    `
                );
            });

            selectNivel.disabled = false;


            const existeAgencia = nivelesPermitidos.some(
                item => Number(item.nivel) === 2
            );

            if (existeAgencia) {// Selecciona Agencia por defecto cuando el nivel 2 está configurado
                selectNivel.value = "2";
            }

            return cargarPadresBodega(); // Después de seleccionar el nivel inicial, carga sus posibles padres
        })
        .catch(error => {
            console.error("Error cargando niveles de bodega:", error);

            selectNivel.innerHTML = `
                <option value="">
                    No se pudieron cargar los niveles
                </option>
            `;

            selectNivel.disabled = true;

            mostrarErrorBodega(
                "No se pudieron cargar los niveles disponibles."
            );

            throw error;
        });
}

function generarCuentaBodega() { //  Genera automáticamente la cuenta de la bodega concatenando la cuenta/identificador del padre con el código ingresado
    const padreSelect = document.getElementById("padreBodega");
    const codigoInput = document.getElementById("codigoBodega");
    const cuentaInput = document.getElementById("cuentaBodega"); // La cuenta final mantiene la ruta jerárquica del padre

    if (!padreSelect || !codigoInput || !cuentaInput) {
        console.error("Faltan controles del formulario de bodegas.");
        return;
    }

    const padre = padreSelect.value.trim();
    const codigo = codigoInput.value.trim().toUpperCase();

    if (!padre || !codigo) {
        cuentaInput.value = "";
        return;
    }

    cuentaInput.value = padre + codigo;
}


function validarGuardarBodega() {// Recalcula la cuenta y habilita Guardar únicamente cuando nivel, padre, código y nombre están completos
    const nivel = document.getElementById("nivelBodega").value;
    const padre = document.getElementById("padreBodega").value;
    const codigo = document.getElementById("codigoBodega").value.trim();
    const nombre = document.getElementById("nombreBodega").value.trim();

    generarCuentaBodega();

    document.getElementById("btnGuardarBodega").disabled = !(nivel && padre && codigo && nombre);
}


function guardarBodega() { // Registra una nueva bodega utilizando el nivel y padre seleccionados
    limpiarErrorBodega();

    const nivelSelect = document.getElementById("nivelBodega");
    const padreSelect = document.getElementById("padreBodega");
    const codigoInput = document.getElementById("codigoBodega");
    const nombreInput = document.getElementById("nombreBodega");
    const cuentaInput = document.getElementById("cuentaBodega");
    const btnGuardar = document.getElementById("btnGuardarBodega");

    const nivel = nivelSelect.value;
    const padre = padreSelect.value;
    const codbodega = codigoInput.value.trim().toUpperCase();
    const nombodega = nombreInput.value.trim().toUpperCase();

    if (!nivel || !padre || !codbodega || !nombodega) { // Evita enviar al servidor una bodega incompleta.
        mostrarErrorBodega(
            "Complete todos los campos obligatorios."
        );
        validarGuardarBodega();
        return;
    }

    btnGuardar.disabled = true; // Bloquea temporalmente el botón para evitar registros duplicados.

    fetch(
        `/configurapp/guardar_bodega/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nivel: nivel,
                codbodega: codbodega,
                nombodega: nombodega,
                padre: padre
            })
        }
    )
        .then(async response => {
            const contentType = response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `El servidor devolvió una respuesta no JSON. HTTP ${response.status}`
                );
            }

            const data = await response.json();

            return {
                response,
                data
            };
        })
        .then(({ response, data }) => {
            if (!response.ok || data.ok !== true) {
                mostrarErrorBodega(
                    data.error || "No se pudo guardar la bodega."
                );

                validarGuardarBodega();
                return;
            }

            // Si el registro fue correcto, limpia el formulario y actualiza el listado
            codigoInput.value = "";
            nombreInput.value = "";
            cuentaInput.value = "";

            limpiarErrorBodega();
            validarGuardarBodega();

            listarBodegas();
        })
        .catch(error => { // Evita intentar procesar como JSON una página de error devuelta por Django
            console.error("Error real en guardarBodega:", error);

            mostrarErrorBodega(
                "No se pudo completar la comunicación con el servidor."
            );

            validarGuardarBodega();
        });
}

const CAMPOS_BODEGAS = [ // Campos principales utilizados por el sistema común de validación visual de formulario.
    "codigoBodega",
    "nombreBodega"
];

function mostrarErrorBodega(mensaje) { // Determina qué campo debe marcarse como inválido según el mensaje devuelto por el backend
    const text = String(mensaje || "").toLowerCase();
    
    const campo = // Los errores relacionados con código se muestran en código
        text.includes("codigo") || text.includes("código")
            ? "codigoBodega"
            : "nombreBodega";

    mostrarErrorFormulario({
        mensaje: mensaje,
        errorId: "errorBodega",
        campos: [campo],
        camposFormulario: CAMPOS_BODEGAS,
        duracion: 7000

    });        
    
}

function limpiarErrorBodega() {
    limpiarErrorFormulario ({
        errorId: "errorBodega",
        camposFormulario: CAMPOS_BODEGAS

    });
}


function listarBodegas() { //  Consulta las bodegas registradas y actualiza la tabla
    const tbody = document.getElementById("tablaBodegasBody");

    if (!tbody) {
        console.warn("No existe #tablaBodegasBody.");
        return Promise.resolve();
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted">
                Cargando bodegas...
            </td>
        </tr>
    `;

    return fetch( // La ubicación mostrada se obtiene de la agencia o sección  asociada al registro
        `/configurapp/listar_bodegas/?company=${encodeURIComponent(companyKey)}`
    )
        .then(async response => {
            const contentType = response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `Respuesta no JSON. HTTP ${response.status}`
                );
            }

            const data = await response.json();

            if (!response.ok || data.ok === false) {
                throw new Error(
                    data.error || "No se pudieron listar las bodegas."
                );
            }

            return data;
        })
        .then(data => {
            const bodegas = Array.isArray(data.bodegas)
                ? data.bodegas
                : [];

            if (bodegas.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted">
                            Sin bodegas registradas.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = bodegas.map(item => {
                const ubicacion =  // Prioriza el nombre de agencia y usa la sección como alternativa
                    item.nombre_agencia ||
                    item.nombre_seccion ||
                    "SIN DEFINIR";

                return `
                    <tr>
                        <td>${item.bd_nivel || ""}</td>
                        <td>${ubicacion}</td>  
                        <td>${item.bd_codseccion || ""}</td>
                        <td>${item.bd_codbodega || ""}</td>
                        <td>${item.bd_nombodega || ""}</td>
                        <td>${item.bd_padre || ""}</td>
                        <td>${item.bd_cuenta || ""}</td>
                    </tr>
                `;
            }).join("");
        })
        .catch(error => {
            console.error("Error exclusivo de listarBodegas:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        No se pudieron cargar las bodegas.
                    </td>
                </tr>
            `;

        });
}





