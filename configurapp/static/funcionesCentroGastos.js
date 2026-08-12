

document.addEventListener("DOMContentLoaded", function () {
    cargarTiposCrearDesdeNiveles();
    listarNiveles();
    listarJerarquia();

    const txtNombre = document.getElementById("nombreNivel");
    const btnGuardar = document.getElementById("btnGuardarNivel");

    

    if (txtNombre && btnGuardar) {
        btnGuardar.disabled = true;

        txtNombre.addEventListener("input", function () {
            btnGuardar.disabled = this.value.trim() === "";
        });
    }

    

    document.getElementById("nombreNuevo").addEventListener("input", validarGuardarJerarquia);
    document.getElementById("selectConcepto").addEventListener("change", actualizarCodigoGenerado);
    document.getElementById("selectAgencia").addEventListener("change", actualizarCodigoGenerado);
    document.getElementById("selectMarca").addEventListener("change", actualizarCodigoGenerado);

 // Enter para guardar niveles
    registrarEnterFormulario("nombreNivel","btnGuardarNivel",validarGuardarNivel);

    registrarEnterFormulario( ["nombreNuevo","cuentaSufijo"],"btnGuardarJerarquia", validarGuardarJerarquia
    );
});

/*
 * Consulta los niveles configurados y los presenta en la tabla.
 * También calcula el número que tendrá el siguiente nivel.
 */
function listarNiveles() {
    const tbody = document.getElementById("tablaNivelesBody");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="3">Cargando niveles...</td>
        </tr>
    `;

    fetch(`/configurapp/listar_niveles_centro_gastos/?company=${companyKey}`)

        .then(response => response.json())

        .then(data => {

            tbody.innerHTML = "";

            const niveles = data.niveles || [];

            let siguienteNivel = 1;

            niveles.forEach(item => {

                tbody.insertAdjacentHTML("beforeend", `
                    <tr>
                        <td>${item.cn_codcia}</td>
                        <td>${item.cn_codnivel}</td>
                        <td>${item.cn_nomnivel}</td>
                    </tr>
                `);

            });
            
            // El siguiente nivel se obtiene a partir del último registro recibido.
            if (niveles.length > 0) {
                siguienteNivel =
                    Number(niveles[niveles.length - 1].cn_codnivel) + 1;
            }

            document.getElementById("nivelCodigo").value = siguienteNivel;

        })

        .catch(error => {

            console.error(error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="3">Error al cargar los niveles.</td>
                </tr>
            `;
        });

}

/*
 * Guarda un nuevo nivel de centro de gastos.
 * El frontend envía únicamente el nombre porque el backend
 * genera automáticamente el código consecutivo.
 */
function guardarNivel() {
    const nombreInput = document.getElementById("nombreNivel");
    const nombre = nombreInput
        .value
        .trim()
        .toUpperCase();

    limpiarErrorNivel();
    
    // Después de guardar, actualiza la tabla y el selector de niveles.
    if (!nombre) {
        mostrarErrorNivel(
            "Ingrese el nombre del nivel"
        );
        return;
    }

    
    fetch(
        `/configurapp/guardar_nivel_centro_gastos/?company=${companyKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: nombre
            })
        }
    )

    .then(response => response.json())
    .then(data => {

        if (data.ok !== true) {
            mostrarErrorNivel(
                data.error || "No se pudo guardar el nivel."
            );
            return;
        }

        // Después de guardar, actualiza la tabla y el selector de niveles.
        limpiarErrorNivel();
        nombreInput.value = "";
        
        listarNiveles();
        
        cargarTiposCrearDesdeNiveles();
    })

    
    .catch(error => {
        console.error(
            "Error guardando nivel:",
            error
        );

        mostrarErrorNivel(
            "Error al guardar. Revise la conexión o el servidor."
        );
    });
}

function listarSecciones() {
    const nivel = document.getElementById("selectNivelDetalle").value;
    const tbody = document.getElementById("tablaSeccionesBody");

    if (!nivel) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:#777;">
                    Seleccione un nivel para ver sus secciones.
                </td>
            </tr>
        `;
        return;
    }

    fetch(`/configurapp/listar_secciones_centro_gastos/?nivel=${nivel}&company=${companyKey}`)
        .then(response => response.json())
        .then(data => {
            tbody.innerHTML = "";

            if (!data.secciones || data.secciones.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; color:#777;">
                            No existen secciones para este nivel.
                        </td>
                    </tr>
                `;
                return;
            }

            data.secciones.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.cg_cia}</td>
                        <td>${item.cg_nivel}</td>
                        <td>${item.cg_codseccion}</td>
                        <td>${item.cg_nomseccion}</td>
                        <td>${item.cg_bodega}</td>
                        <td>${item.cg_cuenta}</td>
                    </tr>
                `;
            });
        });
}

function guardarSeccion() { // Guarda una sección con su nivel, código, nombre y cuenta
    const nivel = document.getElementById("selectNivelDetalle").value;
    const codigo = document.getElementById("codigoSeccion").value.trim().toUpperCase();
    const nombre = document.getElementById("nombreSeccion").value.trim().toUpperCase();
    const cuenta = document.getElementById("cuentaSeccion").value.trim();
    const bodega = document.getElementById("bodegaSeccion").value.trim().toUpperCase(); // Bodega opcional no esta en la definida en la tabla

    console.log({ nivel, codigo, nombre, cuenta, bodega });

    if (!nivel || !codigo || !nombre || !cuenta) {
        alert("Complete nivel, código, nombre y cuenta");
        return;
    }

    fetch(`/configurapp/guardar_seccion_centro_gastos/?company=${companyKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nivel: nivel,
            codigo: codigo,
            nombre: nombre,
            cuenta: cuenta,
            bodega: bodega
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            document.getElementById("codigoSeccion").value = "";
            document.getElementById("nombreSeccion").value = "";
            document.getElementById("cuentaSeccion").value = "";
            document.getElementById("bodegaSeccion").value = "";
            document.getElementById("btnGuardarSeccion").disabled = true;

            listarSecciones();
        } else {
            alert(data.error || "Error al guardar sección");
        }
    })
    .catch(error => {
        console.error(error);
        alert("Error al guardar sección");
    });
}

function validarFormularioSeccion() {
    const nivel = document.getElementById("selectNivelDetalle").value.trim();
    const codigo = document.getElementById("codigoSeccion").value.trim();
    const nombre = document.getElementById("nombreSeccion").value.trim();
    const cuenta = document.getElementById("cuentaSeccion").value.trim();
    const bodega = document.getElementById("bodegaSeccion").value.trim();
    const btn = document.getElementById("btnGuardarSeccion");

    btn.disabled = !(nivel && codigo && nombre && cuenta && bodega);
}

function cambiarTipoCrear() { //Adapta el formulario al nivel que el usuario desea crear
    const tipo = Number(document.getElementById("tipoCrear").value);
     
    // Oculta y limpia los selectores de la selección anterior.
    ["boxConcepto", "boxAgencia", "boxMarca", "boxLinea"].forEach(id => {
        const box = document.getElementById(id);
        if (box) box.style.display = "none";
    });

    ["selectConcepto", "selectAgencia", "selectMarca", "selectLinea"].forEach(id => {
        const select = document.getElementById(id);
        if (select) select.innerHTML = "";
    });

    document.getElementById("contenedorNivelesExtra").innerHTML = "";
    document.getElementById("codigoGenerado").value = "";
    document.getElementById("cuentaBaseFija").value = "";
    document.getElementById("cuentaSufijo").value = "";
    document.getElementById("cuentaGenerada").value = "";

    // Muestra únicamente los sectores necesarios
    if (!tipo) {
        validarGuardarJerarquia();
        actualizarPasosCentroGastos();
        return;
    }

    if (tipo >= 2) {
        document.getElementById("boxConcepto").style.display = "block";
        cargarConceptos();
    }

    if (tipo >= 3) {
        document.getElementById("boxAgencia").style.display = "block";
    }

    if (tipo >= 4) {
        document.getElementById("boxMarca").style.display = "block";
    }

    if (tipo >= 5) {
        document.getElementById("boxLinea").style.display = "block";
    }

    pintarSelectsExtra();
    actualizarCodigoGenerado();
    validarGuardarJerarquia();
    actualizarPasosCentroGastos();
}


function limpiarGenerados() { // Limpia los valores calculados de código y cuenta
    document.getElementById("codigoGenerado").value = "";
    document.getElementById("cuentaGenerada").value = "";
}


function cargarConceptos() { // Consulta los elementos del primer nivel y llena el selector de conceptos sin repetir opciones.
    fetch(`/configurapp/listar_jerarquia/?nivel=1&company=${companyKey}`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById("selectConcepto");
            select.innerHTML = `<option value="">Seleccione concepto</option>`;
            
            const vistos = new Set(); // Evita agregar conceptos duplicados al selector.

            data.registros.forEach(item => {
                const clave = `${item.cg_codseccion}-${item.cg_nomseccion}`;
                if (vistos.has(clave)) return;
                vistos.add(clave);

                select.innerHTML += `
                    <option value="${item.cg_codseccion}"
                            data-cuenta= "${item.cg_cuenta}">
                        ${item.cg_codseccion} - ${item.cg_nomseccion}
                    </option>
                `;
            });
        });
}

function cargarDependientes(origen = "") { // Carga los selectores hijos según el elemento padre modificado.
    const tipo = Number(document.getElementById("tipoCrear").value);

    const concepto = document.getElementById("selectConcepto")?.value || "";
    const agencia = document.getElementById("selectAgencia")?.value || "";
    const marca = document.getElementById("selectMarca")?.value || "";
    const linea = document.getElementById("selectLinea")?.value || "";

    const selectAgencia = document.getElementById("selectAgencia");
    const selectMarca = document.getElementById("selectMarca");
    const selectLinea = document.getElementById("selectLinea");

    if (origen === "concepto") { // Cambio de concepto: reinicia agencia, marca, línea y niveles extra.
        selectAgencia.innerHTML = `<option value="">Seleccione agencia</option>`;
        selectMarca.innerHTML = `<option value="">Seleccione marca</option>`;
        selectLinea.innerHTML = `<option value="">Seleccione línea negocio</option>`;
        document.getElementById("contenedorNivelesExtra").innerHTML = "";
        pintarSelectsExtra();

        if (tipo >= 3 && concepto) {
            fetch(`/configurapp/listar_jerarquia/?nivel=2&padre=${concepto}&company=${companyKey}`)
                .then(r => r.json())
                .then(data => {
                    data.registros.forEach(item => {
                        selectAgencia.innerHTML += `
                            <option value="${item.cg_codseccion}" data-cuenta="${item.cg_cuenta}">
                                ${item.cg_codseccion} - ${item.cg_nomseccion}
                            </option>
                        `;
                    });
                });
        }
    }

    if (origen === "agencia") { // Cambio de agencia: consulta las marcas pertenecientes a esa ruta.
        selectMarca.innerHTML = `<option value="">Seleccione marca</option>`;
        selectLinea.innerHTML = `<option value="">Seleccione línea negocio</option>`;
        document.getElementById("contenedorNivelesExtra").innerHTML = "";
        pintarSelectsExtra();

        if (tipo >= 4 && concepto && agencia) {
            const padreMarca = concepto + agencia;

            fetch(`/configurapp/listar_jerarquia/?nivel=3&padre=${padreMarca}&company=${companyKey}`)
                .then(r => r.json())
                .then(data => {
                    data.registros.forEach(item => {
                        selectMarca.innerHTML += `
                            <option value="${item.cg_codseccion}" data-cuenta="${item.cg_cuenta}">
                                ${item.cg_codseccion} - ${item.cg_nomseccion}
                            </option>
                        `;
                    });
                });
        }
    }

    if (origen === "marca") { // Cambio de marca: consulta las líneas pertenecientes a esa ruta.
        selectLinea.innerHTML = `<option value="">Seleccione línea negocio</option>`;
        document.getElementById("contenedorNivelesExtra").innerHTML = "";
        pintarSelectsExtra();

        if (tipo >= 5 && concepto && agencia && marca) {
            const padreLinea = concepto + agencia + marca;

            fetch(`/configurapp/listar_jerarquia/?nivel=4&padre=${padreLinea}&company=${companyKey}`)
                .then(r => r.json())
                .then(data => {
                    data.registros.forEach(item => {
                        selectLinea.innerHTML += `
                            <option value="${item.cg_codseccion}" data-cuenta="${item.cg_cuenta}">
                                ${item.cg_codseccion} - ${item.cg_nomseccion}
                            </option>
                        `;
                    });
                });
        }
    }

    if (origen === "linea") { // Desde línea se inicia la carga de niveles dinámicos adicionales.
        if (tipo > 5 && linea) {
            cargarOpcionesNivelExtra(5);
        }
    }

    actualizarCodigoGenerado();
    validarGuardarJerarquia();
}

function obtenerPadreJerarquia() { //Construye el identificador del padre concatenando los códigos seleccionados desde el primer nivel hasta el nivel anterior.
    const tipo = Number(document.getElementById("tipoCrear").value);

    const concepto = document.getElementById("selectConcepto")?.value || "";
    const agencia = document.getElementById("selectAgencia")?.value || "";
    const marca = document.getElementById("selectMarca")?.value || ""; 
    const linea = document.getElementById("selectLinea")?.value || "";

    if (tipo === 1) return "";// Agrega los niveles dinámicos cuando la jerarquía supera el nivel 5.
    if (tipo === 2) return concepto;
    if (tipo === 3) return concepto + agencia;
    if (tipo === 4) return concepto + agencia + marca;
    if (tipo === 5) return concepto + agencia + marca + linea;

    let padre = concepto + agencia + marca + linea;

    for (let nivel = 5; nivel < tipo; nivel++) {
        padre += document.getElementById(`selectNivelExtra_${nivel}`)?.value || "";
    }

    return padre;
}

function actualizarCodigoGenerado() { // Solicita al backend el siguiente código disponible para el nivel y la ruta padre seleccionados.
    const tipo = document.getElementById("tipoCrear").value
    const padre = obtenerPadreJerarquia();
    const base = obtenerCuentaPadreSeleccionada();

    document.getElementById("cuentaBaseFija").value = base;
    document.getElementById("cuentaSufijo").value = "";
    document.getElementById("cuentaGenerada").value = "";
    document.getElementById("codigoGenerado").value = "";

    // Al cambiar la ruta se invalidan los valores calculados anteriormente.
    if(!tipo){
        validarGuardarJerarquia();
        return;
    }

    if(tipo !== "1" && !padre) {
        validarGuardarJerarquia();
        return;
    }
    
    // El backend calcula el consecutivo dentro del mismo nivel y padre.
    fetch(`/configurapp/siguiente_codigo/?nivel=${tipo}&padre=${padre}&company=${companyKey}`)
         .then(response => response.json())
         .then(data => {
            document.getElementById("codigoGenerado").value = data.codigo;
            validarGuardarJerarquia();
         })
         .catch(error => {
            console.error(error);
            validarGuardarJerarquia();
         });

   
}

function actualizarCuentaDesdeSufijo() { // Genera la cuenta completa combinando la cuenta del padre con el sufijo ingresado por el usuario.
    const tipo = document.getElementById("tipoCrear").value;
    const base = obtenerCuentaPadreSeleccionada();
    const sufijo = document.getElementById("cuentaSufijo").value.trim();

    document.getElementById("cuentaBaseFija").value = base;

    if (!sufijo) {
        document.getElementById("cuentaGenerada").value = "";
        validarGuardarJerarquia();
        return;
    }

    if (tipo === "1") { // El primer nivel no tiene cuenta padre.
        document.getElementById("cuentaGenerada").value = sufijo;
    } else {
        document.getElementById("cuentaGenerada").value = base + sufijo;
    }

    validarGuardarJerarquia();
}


function validarGuardarJerarquia() { // Comprueba que todos los datos requeridos para el nivel seleccionado estén completos antes de habilitar Guardar.
    const tipo = Number(document.getElementById("tipoCrear").value);
    const nombre = document.getElementById("nombreNuevo").value.trim();
    const codigo = document.getElementById("codigoGenerado").value.trim();
    const cuenta = document.getElementById("cuentaGenerada").value.trim();

    const concepto = document.getElementById("selectConcepto")?.value || "";
    const agencia = document.getElementById("selectAgencia")?.value || "";
    const marca = document.getElementById("selectMarca")?.value || "";
    const linea = document.getElementById("selectLinea")?.value || "";

    let valido = !!(tipo && nombre && codigo && cuenta);

    // Cada nivel requiere que su ruta padre esté completamente seleccionada.
    if (tipo >= 2 && !concepto) valido = false;
    if (tipo >= 3 && !agencia) valido = false;
    if (tipo >= 4 && !marca) valido = false;
    if (tipo >= 5 && !linea) valido = false;

    // Valida también los selectores dinámicos de niveles superiores.
    if (tipo > 5) {
        for (let nivel = 5; nivel < tipo; nivel++) {
            const select = document.getElementById(`selectNivelExtra_${nivel}`);
            if (!select || !select.value) {
                valido = false;
                break;
            }
        }
    }

    document.getElementById("btnGuardarJerarquia").disabled = !valido;
}

function guardarJerarquia() {  // Guarda un nuevo elemento en la jerarquía de centros de gastos.
    actualizarPasosCentroGastos();
    
    // Construye los valores definitivos antes de enviarlos al backend.
    const tipo = document.getElementById("tipoCrear").value;
    const nombreInput = document.getElementById("nombreNuevo");
    const codigoInput = document.getElementById("codigoGenerado");
    const cuentaInput = document.getElementById("cuentaGenerada");
    const btnGuardar = document.getElementById("btnGuardarJerarquia");

    // Evita envíos repetidos mientras se procesa la solicitud.
    const nombre = nombreInput.value.trim().toUpperCase();
    const padre = obtenerPadreJerarquia();
    const codigo = codigoInput.value.trim().padStart(2, "0");
    const cuenta = cuentaInput.value.trim();

    btnGuardar.disabled = true; // Recarga el árbol y marca visualmente la cuenta recién guardada.

    fetch(`/configurapp/guardar_jerarquia/?company=${companyKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nivel: tipo,
            nombre: nombre,
            padre: padre,
            codigo: codigo,
            cuenta: cuenta
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            nombreInput.value = "";
            cuentaInput.value = "";

            const sufijo = document.getElementById("cuentaSufijo");
            if (sufijo) sufijo.value = "";

            limpiarErrorNombre();
            listarJerarquia(data.cuenta); // Recalcula el siguiente código disponible para la misma ruta.

            setTimeout(() => {
                actualizarCodigoGenerado();
                validarGuardarJerarquia();
            }, 300);

            return;
        }

        mostrarErrorNombreTemporal(data.error || "No se pudo guardar el registro.");
        validarGuardarJerarquia();
    })
    .catch(error => {
        console.error(error);
        mostrarErrorNombreTemporal("Error al guardar. Revise la conexión o el servidor.");
        validarGuardarJerarquia();
    });
}






function listarJerarquia(cuentaNueva = null) { // Consulta todos los registros jerárquicos y delega su representación visual al árbol de centros de gastos.
    fetch(`/configurapp/listar_jerarquia/?company=${companyKey}`)
        .then(response => response.json())
        .then(data => {
            if (!data.registros || data.registros.length === 0) {
                pintarArbolCentroGastos([]);
                return;
            }

            pintarArbolCentroGastos(data.registros, cuentaNueva);
        })
        .catch(error => {
            console.error(error);
            pintarArbolCentroGastos([]);
        });
}

function pintarArbolCentroGastos(registros, cuentaNueva = null) { //Convierte los registros planos recibidos del backend en un árbol jerárquico navegable.
    const contenedor = document.getElementById("arbolCentroGastos");

    if (!contenedor) return;

    if (!registros || registros.length === 0) {
        contenedor.innerHTML = `<span style="color:#777;">Sin registros.</span>`;
        return;
    }

        const mapa = {}; // El mapa permite localizar rápidamente cualquier nodo por su ruta.
        const raices = [];

       registros.forEach(item => {  // Transforma cada registro en un nodo y calcula su identificador de ruta.
        const codseccion = String(item.cg_codseccion).trim();
        const padre = String(item.cg_padre || "00").trim();
        const rutaId = padre === "00" ? codseccion : padre + codseccion;

        mapa[rutaId] = {
        cg_nivel: Number(item.cg_nivel),
        cg_codseccion: codseccion,
        cg_nomseccion: String(item.cg_nomseccion).trim(),
        cg_cuenta: String(item.cg_cuenta || "").trim(),
        cg_padre: padre,
        ruta_id: rutaId,
        hijos: []
          };
      });

        Object.values(mapa).forEach(nodo => { // Transforma cada registro en un nodo y calcula su identificador de ruta.
          if (nodo.cg_padre && nodo.cg_padre !== "00" && mapa[nodo.cg_padre]) {
        mapa[nodo.cg_padre].hijos.push(nodo);
         } else {
        raices.push(nodo);
        }
        });

         raices.sort((a, b) => a.ruta_id.localeCompare(b.ruta_id));

     Object.values(mapa).forEach(nodo => { // Relaciona cada nodo con su padre; los nodos sin padre válido son raíces.
         nodo.hijos.sort((a, b) => a.ruta_id.localeCompare(b.ruta_id));
      });

    raices.sort((a, b) => a.cg_cuenta.localeCompare(b.cg_cuenta));

    Object.values(mapa).forEach(nodo => {// Mantiene una presentación estable ordenando raíces e hijos por cuenta.
        nodo.hijos.sort((a, b) => a.cg_cuenta.localeCompare(b.cg_cuenta));
    });

    let contador = 0;

    function iconoNivel(nivel) { // Define la representación visual correspondiente a cada nivel.
        switch (Number(nivel)) {
            case 1: return "fa-folder ";
            case 2: return "fa-building ";
            case 3: return "fa-car ";
            case 4: return "fa-box-open ";
            case 5: return "fa-circle-nodes";
            default: return "fa-circle ";
        }
    }
    
    function nombreNivel(nivel) {
        switch (Number(nivel)) {
            case 1: return "CONCEPTO";
            case 2: return "AGENCIA";
            case 3: return "MARCA";
            case 4: return "LÍNEA";
            default: return "NIVEL";
        }
    }

    function obtenerClaseNivel(nivel) {
        const numeroNivel = Number(nivel);

        if(numeroNivel >= 1 && numeroNivel <= 5){
            return `tree-level-${numeroNivel}`; 
        }

        return "tree-level-extra";
    }

    

    function renderNodo(nodo) { // Renderiza recursivamente cada nodo y sus descendientes.
        contador++;

        const id = `cgNodo${contador}`;
        const tieneHijos = nodo.hijos.length > 0;
        const claseNivel = obtenerClaseNivel(nodo.cg_nivel);

        let html = `<li class="app-tree-item">`;

        if (tieneHijos) {
            html += `
                <div class="app-tree-node app-tree-toggle ${claseNivel}"
                     data-cuenta="${nodo.cg_cuenta}"
                     data-bs-toggle="collapse"
                     data-bs-target="#${id}"
                     aria-expanded="false"
                     aria-controls="${id}">

                    <i class="fas fa-chevron-right app-tree-chevron"></i>
                    <i class="fas ${iconoNivel(nodo.cg_nivel)} app-tree-icon"></i>

                    <span class="app-tree-level">${nombreNivel(nodo.cg_nivel)}</span>
                    <span class="app-tree-code">${nodo.cg_codseccion}</span>
                    <span class="app-tree-name">${nodo.cg_nomseccion}</span>
                    <span class="app-tree-meta"><i class="fas fa-hashtag"></i><strong>CUENTA:</strong> ${nodo.cg_cuenta}</span>
                </div>

                <ul class="collapse app-tree-list" id="${id}">
            `;

            nodo.hijos.forEach(hijo => {
                html += renderNodo(hijo);
            });

            html += `</ul>`;
        } else {
            html += `
                <div class="app-tree-node ${claseNivel}"
                     data-cuenta="${nodo.cg_cuenta}">

                    <span class="app-tree-chevron-placeholder"></span>
                    <i class="fas ${iconoNivel(nodo.cg_nivel)} app-tree-icon"></i>

                    <span class="app-tree-level">${nombreNivel(nodo.cg_nivel)}</span>
                    <span class="app-tree-code">${nodo.cg_codseccion}</span>
                    <span class="app-tree-name">${nodo.cg_nomseccion}</span>
                    <span class="app-tree-meta"><i class="fas fa-hashtag"></i><strong>CUENTA:</strong> ${nodo.cg_cuenta}</span>
                </div>
            `;
        }

        html += `</li>`;
        return html;
    }

    let html = `<ul class="app-tree-list root">`;

    raices.forEach(raiz => {
        html += renderNodo(raiz);
    });

    html += `</ul>`;

    contenedor.innerHTML = html;

    if (cuentaNueva) {
        setTimeout(() => { // Después de pintar el árbol, localiza y resalta el registro recién creado.
            resaltarCentroGastoCreado(String(cuentaNueva).trim());
        }, 500);
    }
}

function resaltarCentroGastoCreado(cuentaNueva) { // Reutiliza el componente general de resaltado para ubicar visualmente una cuenta dentro del árbol.
    resaltarElementoCreado({
        contenedor: "#arbolCentroGastos",
        atributo: "data-cuenta",
        valorBuscado: String(cuentaNueva || "").trim(),
        claseResaltado: "app-tree-highlight"
    });
}


function actualizarPasosCentroGastos() { // Actualiza visualmente el progreo del formulario según los niveles que ya fueron seleccionados por el usuario.
    const tipo = document.getElementById("tipoCrear").value;
    const concepto = document.getElementById("selectConcepto")?.value || "";
    const agencia = document.getElementById("selectAgencia")?.value || "";
    const marca = document.getElementById("selectMarca")?.value || "";

    const stepTipo = document.getElementById("stepTipo");
    const stepConcepto = document.getElementById("stepConcepto");
    const stepAgencia = document.getElementById("stepAgencia");
    const stepMarca = document.getElementById("stepMarca");

    const lineTipoConcepto = document.getElementById("lineTipoConcepto");
    const lineConceptoAgencia = document.getElementById("lineConceptoAgencia");
    const lineAgenciaMarca = document.getElementById("lineAgenciaMarca");

    // Restablece todos los pasos antes de pintar el estado actual.
    [stepTipo, stepConcepto, stepAgencia, stepMarca,
     lineTipoConcepto, lineConceptoAgencia, lineAgenciaMarca].forEach(el => {
        if (el) el.classList.remove("active");
    });

    if (tipo) {
        stepTipo.classList.add("active");
        lineTipoConcepto.classList.add("active");
    }

    if (concepto) {
        stepConcepto.classList.add("active");
        lineConceptoAgencia.classList.add("active");
    }

    if (agencia) {
        stepAgencia.classList.add("active");
        lineAgenciaMarca.classList.add("active");
    }

    if (marca) {
        stepMarca.classList.add("active");
    }
}



function expandirTodoArbol(){ // Abre todos los nodos desplegables del árbol
  document.querySelectorAll("#arbolCentroGastos .collapse")

  .forEach(c=>{

   bootstrap.Collapse.getOrCreateInstance(c).show();

  });

}

 
function colapsarTodoArbol(){ // Cierra todos los nodos desplegables del árbol.
 document.querySelectorAll("#arbolCentroGastos .collapse")

 .forEach(c=>{

 bootstrap.Collapse.getOrCreateInstance(c).hide();

 });

}



let rutasEncontradasCg = [];
let indiceRutaSeleccionada = -1;
let temporizadorRuta = null;

function buscarRutaCg(){ // Busca cuentas y rutas mientras el usuario escribe.
    const input = document.getElementById("buscarRutaCg");
    const contenedor = document.getElementById("listaResultadosRuta");

    const ruta = input.value.trim();

    clearTimeout(temporizadorRuta); // Cancela la búsqueda anterior si el usuario continúa escribiendo.

    if(ruta.length < 2) {
       contenedor.style.display = "none";
       contenedor.innerHTML = "";
       rutasEncontradasCg = [];
       indiceRutaSeleccionada = -1;
       return;
    }

    temporizadorRuta = setTimeout(() => { // Espera 250 ms antes de consultar el backend.
        fetch(`/configurapp/buscar_ruta_cg/?ruta=${ruta}&company=${companyKey}`)
            .then(response => response.json())
            .then(data => {
                rutasEncontradasCg = data.resultados || [];
                indiceRutaSeleccionada = -1;

                if (rutasEncontradasCg.length === 0) {
                    contenedor.innerHTML = `
                        <div class="cg-search-empty">
                           Sin resultados
                        </div>
                    `;
                    contenedor.style.display = "block";
                    return;
                }

                contenedor.innerHTML = "";

                rutasEncontradasCg.forEach((item, index) => {
                    contenedor.innerHTML += `
                     <div class="cg-search-item"
                          data-index="${index}"
                          onclick="seleccionarResultadoRuta(${index})">
                          <span class="cg-search-code">${item.cg_cuenta}</span>
                          <span class="cg-search-name">${item.cg_nomseccion}</span>
                     </div>
                     `;
                    
                });
                contenedor.style.display = "block";
            })
            .catch(error => {
                console.error(error);
            });
    }, 250);
}

function seleccionarResultadoRuta(index) { // Selecciona un resultado del buscador y resalta su cuenta correspondiente dentro del árbol.
    const item = rutasEncontradasCg[index];

    if (!item) return;

    document.getElementById("buscarRutaCg").value = item.cg_cuenta;
    document.getElementById("listaResultadosRuta").style.display = "none";

    resaltarCentroGastoCreado(item.cg_cuenta);

}

function navegarResultadosRuta(event) { // Permite recorrer los resultados con las flechas, seleccionar con Enter y cerrar la Lista con Esc
    const contenedor = document.getElementById("listaResultadosRuta");
    const items = contenedor.querySelectorAll(".cg-search-item");

    if (contenedor.style.display === "none" || items.length === 0) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        indiceRutaSeleccionada++;

        if(indiceRutaSeleccionada >= items.length) {
            indiceRutaSeleccionada = 0;
        }

        marcarResultadoActivo(items);
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        indiceRutaSeleccionada--;

        if(indiceRutaSeleccionada < 0) {
            indiceRutaSeleccionada = items.length - 1;
        }

        marcarResultadoActivo(items);
    }

    if (event.key === "Enter") {
        event.preventDefault();

        if(indiceRutaSeleccionada >= 0) {
            seleccionarResultadoRuta(indiceRutaSeleccionada);
        }
    }

    if(event.key === "Escape") {
        contenedor.style.display = "none";
    }
}

function marcarResultadoActivo(items) { // Actualiza el resultado visualmente seleccionado durante la navegación meidante teclado.
    items.forEach(item => item.classList.remove("active"));

    const activo = items[indiceRutaSeleccionada];

    if (activo) {
        activo.classList.add("active");
        activo.scrollIntoView({
            block: "nearest"
        });
    }
}

function obtenerCuentaPadreSeleccionada() { // Obtiene la cuenta del último elemento válido seleccionado dentro de la ruta jerárquica.
    const tipo = Number(document.getElementById("tipoCrear").value);

    if (!tipo || tipo === 1) {
        return "";
    }

    const selectsJerarquia = [
        document.getElementById("selectConcepto"),
        document.getElementById("selectAgencia"),
        document.getElementById("selectMarca"),
        document.getElementById("selectLinea")
    ];


    for (let nivel = 5; nivel < tipo; nivel++) { // Agrega también los selectores generados para niveles superiores.
        selectsJerarquia.push(
            document.getElementById(`selectNivelExtra_${nivel}`)
        );
    }

    let ultimaCuentaValida = "";

    for (const select of selectsJerarquia) { // Conserva la cuenta más profunda encontrada en la ruta seleccionada.

        if (
            !select ||
            !select.value ||
            select.selectedIndex < 0
        ) {
            break;
        }

        const opcionSeleccionada =
            select.options[select.selectedIndex];

        const cuentaSeleccionada =
            opcionSeleccionada?.dataset.cuenta?.trim() || "";

        if (cuentaSeleccionada) {
            ultimaCuentaValida = cuentaSeleccionada;
        }
    }

    return ultimaCuentaValida;
}

function actualizarCuentaDesdeCodigo() { // Genera una cuenta utilizando el código automático como sufijo.
    const tipo = document.getElementById("tipoCrear").value;
    const codigo = document.getElementById("codigoGenerado").value.trim().padStart(2, "0");
    const cuentaInput = document.getElementById("cuentaGenerada");

    if (!codigo || codigo === "00") {
        cuentaInput.value = "";
        validarGuardarJerarquia();
        return;
    }

    const cuentaPadre = obtenerCuentaPadreSeleccionada();

    if (tipo === "1") {
        cuentaInput.value = codigo;
    } else {
        cuentaInput.value = cuentaPadre ? cuentaPadre + codigo : "";
    }

    validarGuardarJerarquia();
}

 const CAMPOS_JERARQUIA_CG = [
    "tipoCrear",
    "selectConcepto",
    "selectAgencia",
    "selectMarca",
    "cuentaSufijo",
    "nombreNuevo"
    ];

const CAMPOS_NIVEL_CG = [
    "nombreNivel"
    ];


function mostrarErrorNivel(mensaje) { // Muestra los errores relacionados con la creación de niveles.
    mostrarErrorFormulario({
        mensaje: mensaje,
        errorId: "errorNombreNivel",
        campos: ["nombreNivel"],
        camposFormulario: CAMPOS_NIVEL_CG,
        duracion: 7000
    });
}

function limpiarErrorNivel() { // Limpia el mensaje y el estado inválido del formulario de niveles.
    limpiarErrorFormulario({
        errorId: "errorNombreNivel",
        camposFormulario: CAMPOS_NIVEL_CG
    });
}

function mostrarErrorNombreTemporal(mensaje) { // Si el mensaje menciona una cuenta entonces marca el sufijo y en los demás casos marca el nombre.
    const campo = String(mensaje || "")
        .toLowerCase()
        .includes("cuenta")
            ? "cuentaSufijo"
            : "nombreNuevo";

    mostrarErrorFormulario({
        mensaje: mensaje,
        errorId: "errorNombreNuevo",
        campos: [campo],
        camposFormulario: CAMPOS_JERARQUIA_CG,
        duracion: 7000
    });
}

function limpiarErrorNombre() { // Limpia los errores del formulario de creación jerárquica.
    limpiarErrorFormulario({
        errorId: "errorNombreNuevo",
        camposFormulario: CAMPOS_JERARQUIA_CG
    });
}

function validarGuardarNivel() {
    const nombre = document.getElementById("nombreNivel").value.trim(); // Habilita el bóton de guradado únicamente cuando el nombre del nivel contiene información.
    document.getElementById("btnGuardarNivel").disabled = !nombre;
}

let nivelesCentroGastos = [];

function cargarTiposCrearDesdeNiveles() { // Carga los niveles disponibles desde el backend y construye el selector utilizado para crear registros jerárquicos.
     
    fetch(`/configurapp/niveles_disponibles_cg/?company=${companyKey}`) // Conserva los niveles recibidos para construir selectores adicionales.
        .then(response => response.json())
        .then(data => {
            nivelesCentroGastos = data.niveles || [];

            const select = document.getElementById("tipoCrear");
            select.innerHTML = `<option value="">Seleccione</option>`;

            nivelesCentroGastos.forEach(nivel => {
                select.innerHTML += `
                    <option value="${nivel.nivel}">
                        ${nivel.nombre}
                    </option>
                `;
            });
        });
}

function pintarSelectsExtra() { // Crea los selectores necesarios para niveles superiores al nivel 5.
    const tipo = Number(document.getElementById("tipoCrear").value);
    const contenedor = document.getElementById("contenedorNivelesExtra");

    contenedor.innerHTML = "";

    if (!tipo || tipo <= 5) return;

    // Genera un selector por cada nivel intermedio requerido.
    for (let nivel = 5; nivel < tipo; nivel++) {
        const nombreNivel = nivelesCentroGastos.find(n => Number(n.nivel) === nivel)?.nombre || `Nivel ${nivel}`;

        contenedor.innerHTML += `
            <div class="col-12 col-md-2">
                <label class="form-label">${nombreNivel}</label>
                <select id="selectNivelExtra_${nivel}"
                        class="form-select form-select-sm"
                        onchange="cargarNivelExtraDependiente(${nivel}); actualizarCodigoGenerado(); validarGuardarJerarquia(); actualizarPasosCentroGastos();">
                    <option value="">Seleccione ${nombreNivel}</option>
                </select>
            </div>
        `;
    }
}



function obtenerPadreExtraHasta(nivelObjetivo) { // Construye la ruta padre requerida para consultar un nivel dinámico específico.
    let padre = "";

    padre += document.getElementById("selectConcepto")?.value || "";
    padre += document.getElementById("selectAgencia")?.value || "";
    padre += document.getElementById("selectMarca")?.value || "";
    padre += document.getElementById("selectLinea")?.value || "";

    for (let nivel = 5; nivel < nivelObjetivo; nivel++) {
        padre += document.getElementById(`selectNivelExtra_${nivel}`)?.value || "";
    }

    return padre;
}

function cargarOpcionesNivelExtra(nivel) { // Consulta y llena un selector dinámico de nivel adicional.
    const select = document.getElementById(`selectNivelExtra_${nivel}`);
    if (!select) return;

    const nombreNivel = nivelesCentroGastos.find(n => Number(n.nivel) === nivel)?.nombre || `Nivel ${nivel}`;
    const padre = obtenerPadreExtraHasta(nivel);

    select.innerHTML = `<option value="">Seleccione ${nombreNivel}</option>`;

    if (!padre) return;

    fetch(`/configurapp/listar_jerarquia/?nivel=${nivel}&padre=${padre}&company=${companyKey}`)
        .then(r => r.json())
        .then(data => {
            data.registros.forEach(item => {
                select.innerHTML += `
                    <option value="${item.cg_codseccion}"
                            data-cuenta="${item.cg_cuenta}">
                        ${item.cg_codseccion} - ${item.cg_nomseccion}
                    </option>
                `;
            });
        });
}

function cargarNivelExtraDependiente(nivelActual) { // Limpia los niveles extra posteriores al que fue modificado y carga únicamente el siguiente  nivel dependiente.
    const tipo = Number(document.getElementById("tipoCrear").value);

    if (nivelActual === 4) {
        if (tipo > 5) {
            cargarOpcionesNivelExtra(5);
        }
        return;
    }

    for (let nivel = nivelActual + 1; nivel < tipo; nivel++) { // Reinicia los selectores posteriores para evitar rutas inconsistentes.
        const select = document.getElementById(`selectNivelExtra_${nivel}`);
        if (select) {
            const nombreNivel = nivelesCentroGastos.find(n => Number(n.nivel) === nivel)?.nombre || `Nivel ${nivel}`;
            select.innerHTML = `<option value="">Seleccione ${nombreNivel}</option>`;
        }
    }

    const siguienteNivel = nivelActual + 1;

    if (siguienteNivel < tipo) {
        cargarOpcionesNivelExtra(siguienteNivel);
    }
}

function cargarLineasParaNivelExtra() { // Carga las líneas disponibles para la ruta formada por concepto, agencia y marca.
    const concepto = document.getElementById("selectConcepto")?.value || "";
    const agencia = document.getElementById("selectAgencia")?.value || "";
    const marca = document.getElementById("selectMarca")?.value || "";
    const selectLinea = document.getElementById("selectLinea");

    selectLinea.innerHTML = `<option value="">Seleccione línea negocio</option>`;

    if (!concepto || !agencia || !marca) return;

    const padreLinea = concepto + agencia + marca;

    fetch(`/configurapp/listar_jerarquia/?nivel=4&padre=${padreLinea}&company=${companyKey}`)
        .then(r => r.json())
        .then(data => {
            data.registros.forEach(item => {
                selectLinea.innerHTML += `
                    <option value="${item.cg_codseccion}"
                            data-cuenta="${item.cg_cuenta}">
                        ${item.cg_codseccion} - ${item.cg_nomseccion}
                    </option>
                `;
            });
        });
}