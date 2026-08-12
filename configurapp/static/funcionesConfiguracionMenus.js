document.addEventListener("DOMContentLoaded", function (){
    cargarNivelesMenu();
    listarMenus();
    validarGuardarMenu();

    registrarEnterFormulario(
        [
            "codigoMenu",
            "nombreMenu"
        ],
        "btnGuardarMenu",
        validarGuardarMenu
    );

    actualizarProcesoMenu();
});

function cargarNivelesMenu(){ // Consulta los niveles de menú disponibles y llena el selector.
    const select = document.getElementById("nivelMenu")

    select.innerHTML = `<option value="">Cargando niveles...</option> `;
    
    fetch(
        `/configurapp/niveles_disponibles_menu/?company=${encodeURIComponent(companyKey)}`
    )

        .then(response => response.json())
        .then(data => {
            select.innerHTML =  `<option value="">Seleccione</option>`;

            const niveles = data.niveles || [];

            niveles.forEach(item => {
                select.insertAdjacentHTML("beforeend",  `<option value= "${item.nivel}"> ${item.nivel} - ${item.nombre}</option>`);
            });
        })
        .catch(error => {
            console.error(error);

            mostrarErrorMenu(
                "No se pudieron cargar los niveles del menú."
            );
        });
}


function cambiarNivelMenu() {
    const nivel = Number( document.getElementById("nivelMenu").value);

    const boxPadre = document.getElementById("boxPadreMenu");
    const selectPadre = document.getElementById("padreMenu");

    selectPadre.innerHTML = `
        <option value="" selected disabled>
            Seleccione menú padre
        </option>
    `;

    selectPadre.value = "";
    selectPadre.selectedIndex = 0;

    if (!nivel) { // Ajusta el formulario según el nivel seleccionado.
        boxPadre.style.display = "none";
        selectPadre.disabled = true;

        validarGuardarMenu();
        actualizarProcesoMenu();
        return;
    }

    if (nivel === 1) { // Los menus principales no requieren padre.
       
        boxPadre.style.display = "none";
        selectPadre.disabled = true;

        validarGuardarMenu();
        actualizarProcesoMenu();
        return;
    }

    boxPadre.style.display = "block";
    selectPadre.disabled = true;

    cargarPadresMenu(nivel); // Los niveles superiores cargan los posibles padres desde el backend.

    validarGuardarMenu();
    actualizarProcesoMenu();
}

function cargarPadresMenu(nivel) {
    const selectPadre = document.getElementById("padreMenu");

    selectPadre.disabled = true;

    selectPadre.innerHTML = `
        <option value="" selected>
            Cargando menús padres...
        </option>
    `;

    fetch(
        `/configurapp/listar_padres_menu/?nivel=${encodeURIComponent(nivel)}&company=${encodeURIComponent(companyKey)}`
    )
    .then(response => response.json())  // Consulta los menús del nivel anterior que pueden utilizarse como padre del nuevo menú
    .then(data => {
        const padres = Array.isArray(data.padres)
            ? data.padres
            : [];

        selectPadre.innerHTML = `
            <option value="" selected disabled>
                Seleccione menú padre
            </option>
        `;

        padres.forEach(item => {
            selectPadre.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${item.nommenu}">
                    ${item.codmenu} - ${item.nommenu}
                </option>
                `
            );
        });

        
        selectPadre.value = "";
        selectPadre.selectedIndex = 0;
        selectPadre.disabled = false;

        validarGuardarMenu();
        actualizarProcesoMenu();
    })
    .catch(error => {
        console.error("Error cargando padres:", error);

        selectPadre.innerHTML = `
            <option value="" selected>
                No se pudieron cargar los menús padres
            </option>
        `;

        selectPadre.disabled = true;

        mostrarErrorMenu(
            "No se pudieron cargar los menús padres."
        );

        validarGuardarMenu();
        actualizarProcesoMenu();
    });
}

function validarGuardarMenu() {
    const nivel = Number( document.getElementById("nivelMenu").value);

    const padre = document.getElementById("padreMenu").value.trim();
    const codigo = document.getElementById("codigoMenu").value.trim();
    const nombre = document.getElementById("nombreMenu").value.trim();

    let valido = Boolean( // Cuando todos los campos obligatorios esten completos se habilita el btn
        nivel &&
        codigo &&
        nombre

    );

    if (nivel > 1 && !padre) {
        valido = false;
    }

    document.getElementById("btnGuardarMenu").disabled = !valido;

    actualizarProcesoMenu();
}

function guardarMenus() { // Guarda Menús principales
    console.log("ENTRÓ A GUARDAR MENÚ");

    limpiarErrorMenu();

    const nivel = Number(document.getElementById("nivelMenu").value);

    const padre = document.getElementById("padreMenu").value.trim().toUpperCase();
    const codigo = document.getElementById("codigoMenu").value.trim().toUpperCase();
    const nombre = document.getElementById("nombreMenu").value.trim().toUpperCase();

    console.log({ // El código y nombre se normalizan antes de enviarlos al backend.
        nivel,
        padre,
        codigo,
        nombre
    });

    const btnGuardar = document.getElementById("btnGuardarMenu"); // Evita envíos repetidos mientras se procesa el guardado
    btnGuardar.disabled = true;

    fetch(
        `/configurapp/guardar_configuracion_menu/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nivelmenu: nivel,
                codmenu: codigo,
                nommenu: nombre
            })
        }
    )
    .then(async response => {
        const data = await response.json();

        return {
            response,
            data
        };
    })
    .then(({ response, data }) => {
        console.log("Respuesta guardar menú:", data);

        if (!response.ok || data.ok !== true) {
            mostrarErrorMenu(
                data.error || "No se pudo guardar el menú."
            );

            validarGuardarMenu();
            return;
        }

        limpiarFormularioMenu();

        listarMenus().then(() => { // Después de guardar , recarga el árbol y resalta el nuevo menú.
            resaltarMenuCreado(data.menu.pf_codmenu);
        });


        setTimeout(() => {
            resaltarMenuCreado(data.menu.pf_codmenu);
        }, 300);

        cargarNivelesMenu();
    })
    .catch(error => {
        console.error("Error guardando menú:", error);

        mostrarErrorMenu(
            "No se pudo completar la comunicación con el servidor."
        );

        validarGuardarMenu();
    });
}

function limpiarFormularioMenu(){ // Restablece los campos del formulario principal después de guardar mun menú correctamente.
    document.getElementById("codigoMenu").value = "";
    document.getElementById("nombreMenu").value = "";

    limpiarErrorMenu();
    validarGuardarMenu();
}

const CAMPOS_MENUS = [ // Campos utilizados por el componente común de validación
    "codigoMenu",
    "nombreMenu"
];

function mostrarErrorMenu(mensaje) {
    const text = String(mensaje || "").toLowerCase();
    
    const campo = 
        text.includes("codigo") || text.includes("código")
            ? "codigoMenu"
            : "nombreMenu";

    mostrarErrorFormulario({
        mensaje: mensaje,
        errorId: "errorMenu",
        campos: [campo],
        camposFormulario: CAMPOS_MENUS,
        duracion: 7000

    });        
       
}

function limpiarErrorMenu() {
    limpiarErrorFormulario({
        errorId: "errorMenu",
        camposFormulario: CAMPOS_MENUS
    });
}


let menuSeleccionado = null; // Mantiene en memoria el menú actualmente seleccionado y su nodo correspondiente dentro del árbol.
let nodoMenuSeleccionado = null;

function listarMenus(codigoNuevo = null){ //Consulta todos los menús registrados y delega su representación visual al árbol
    return fetch(
        `/configurapp/listar_configuracion_menus/?company=${encodeURIComponent(companyKey)}`
    )
        .then(response => response.json())
        .then(data => {
            pintarArbolMenus(data.menus || []);
        })
        .catch(error => {
            console.error(error);
            pintarArbolMenus([]);
        });
}

function pintarArbolMenus(menus) { // Convierte la lista plana de menús recibida del backend 
    const contenedor = document.getElementById("arbolMenus");

    if (!contenedor) return;

    menuSeleccionado = null;
    actualizarVistaMenuSeleccionado();

    if (!Array.isArray(menus) || menus.length === 0) {
        contenedor.innerHTML = `
            <div class="menu-tree-empty">
                Sin menús registrados.
            </div>
        `;
        return;
    }

    const nodos = menus.map(item => ({
        ...item,
        pf_nivelmenu: Number(item.pf_nivelmenu),
        pf_codmenu: String(item.pf_codmenu || "").trim(),
        pf_nommenu: String(item.pf_nommenu || "").trim(),
        pf_padremenu: String(item.pf_padremenu || "").trim(),
        hijos: []
    }));


    function normalizarValor(valor) { //Normaliza códigos y nombres para poder comparar registros sin diferencias de espacios.
    return String(valor || "")
        .trim()
        .toUpperCase();
}

function obtenerPrefijoJerarquia(codigo, nivel) { //Obtienes el prefijo común utilizado para relacionar códigos pertencientes a la misma jerarquia
    const codigoLimpio = normalizarValor(codigo);
    const nivelTexto = String(Number(nivel) || "");

    if ( // Primero busca el padre utilizando pf_padremenu como código.
        !codigoLimpio ||
        !nivelTexto ||
        !codigoLimpio.includes("_")
    ) {
        return "";
    }

    const cabecera = codigoLimpio.split("_", 1)[0];

    if (!cabecera.endsWith(nivelTexto)) { //Relaciona cada nodo con su padre
        return "";
    }

    return cabecera.slice(
        0,
        -nivelTexto.length
    );
}

nodos.forEach(nodo => {


    if (nodo.pf_nivelmenu === 1) {  // Primero intenta localizarlo utilizando el código guardado.
        return;
    }

    const nivelPadre = nodo.pf_nivelmenu - 1;

    const padreGuardado =
        normalizarValor(
            nodo.pf_padremenu
        );

 
    let padre = nodos.find(posiblePadre =>
        posiblePadre.pf_nivelmenu === nivelPadre &&
        normalizarValor(
            posiblePadre.pf_codmenu
        ) === padreGuardado
    );

    if (!padre) { // Como compatibilidad con registros antiguos , también puede resolver el padre mediante nombre y prefijo jerárquico.
        const prefijoHijo =
            obtenerPrefijoJerarquia(
                nodo.pf_codmenu,
                nodo.pf_nivelmenu
            );

        padre = nodos.find(posiblePadre => {
            if (
                posiblePadre.pf_nivelmenu !== nivelPadre
            ) {
                return false;
            }

            const mismoNombre =
                normalizarValor(
                    posiblePadre.pf_nommenu
                ) === padreGuardado;

            if (!mismoNombre) {
                return false;
            }

            const prefijoPadre =
                obtenerPrefijoJerarquia(
                    posiblePadre.pf_codmenu,
                    posiblePadre.pf_nivelmenu
                );

            return prefijoPadre === prefijoHijo;
        });
    }

    if (padre) {
        padre.hijos.push(nodo);
    } else {
        console.warn(
            "No se encontró el padre del menú:",
            {
                codigo: nodo.pf_codmenu,
                nombre: nodo.pf_nommenu,
                nivel: nodo.pf_nivelmenu,
                padreGuardado:
                    nodo.pf_padremenu
            }
        );
    }
   });

    const raices = nodos.filter( // Los menús de nivel 1 forman las raíces del árbol.
        nodo => nodo.pf_nivelmenu === 1
    );

    raices.sort((a, b) => // Mantiene un orden estable por código 
        a.pf_codmenu.localeCompare(b.pf_codmenu)
    );

    nodos.forEach(nodo => {
        nodo.hijos.sort((a, b) =>
            a.pf_codmenu.localeCompare(b.pf_codmenu)
        );
    });

    let contador = 0;

    function obtenerClaseNivel(nivel) {
        const  numero = Number(nivel);


        if (numero >= 1 && numero <= 5) {
            return `tree-level-${numero}`;
        }

        return "tree-level-extra";
    }

    function obtenerIconoNivel(nivel) {
    switch (Number(nivel)) {
        case 1:
            return "fa-layer-group";

        case 2:
            return "fa-folder";

        case 3:
            return "fa-folder-open";

        case 4:
            return "fa-file-lines";

        case 5:
            return "fa-circle-nodes";

        default:
            return "fa-circle";
    }
   }

    function renderNodo(nodo) { //Renderiza recursivamente cada nodo y sus submenús.
        contador++;

        const id = `menuNodo_${contador}`;
        const tieneHijos = nodo.hijos.length > 0;
        const claseNivel = obtenerClaseNivel(nodo.pf_nivelmenu);

        let html = `<li class="app-tree-item">`;

        if (tieneHijos) { // Los nodos con hijos se convierten en elementos desplegables.
            html += `
                <div class="app-tree-node app-tree-toggle menu-tree-node ${claseNivel}"
                     data-menu-nivel="${nodo.pf_nivelmenu}"
                     data-menu-padre="${nodo.pf_padremenu}"
                     data-menu-codigo="${nodo.pf_codmenu}"
                     data-menu-nombre="${nodo.pf_nommenu}"
                     data-codmenu="${nodo.pf_codmenu}"
                     data-bs-toggle="collapse"
                     data-bs-target="#${id}"
                     aria-expanded="false"
                     aria-controls="${id}"
                     onclick="seleccionarNodoMenu(this)">

                    <i class="fas fa-chevron-right app-tree-chevron"></i>

                    <i class="fas ${obtenerIconoNivel(nodo.pf_nivelmenu)} app-tree-icon"></i>

                    <span class="app-tree-level">
                        NIVEL ${nodo.pf_nivelmenu}
                    </span>

                    <span class="app-tree-code">
                        ${nodo.pf_codmenu}
                    </span>

                    <span class="app-tree-name">
                        ${nodo.pf_nommenu}
                    </span>

                    <span class="app-tree-meta">
                        Padre: ${nodo.pf_padremenu}
                    </span>
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
                    data-menu-nivel="${nodo.pf_nivelmenu}"
                    data-menu-padre="${nodo.pf_padremenu}"
                    data-menu-codigo="${nodo.pf_codmenu}"
                    data-menu-nombre="${nodo.pf_nommenu}"
                    data-codmenu="${nodo.pf_codmenu}"
                    onclick="seleccionarNodoMenu(this)">

                    <span class="app-tree-chevron-placeholder"></span>

                    <i class="fas ${obtenerIconoNivel(nodo.pf_nivelmenu)} app-tree-icon"></i>

                    <span class="app-tree-label">
                        NIVEL ${nodo.pf_nivelmenu}
                    </span>

                    <span class="app-tree-code">
                        ${nodo.pf_codmenu}
                    </span>

                    <span class="app-tree-name">
                        ${nodo.pf_nommenu}
                    </span>

                    <span class="app-tree-meta">
                        Padre: ${nodo.pf_padremenu}
                    </span>
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
}


function seleccionarNodoMenu(nodoElemento) {
    const arbol = document.getElementById("arbolMenus");

 
    if (!arbol || !nodoElemento) {
        return;
    }

    cerrarAccionesMenu();

    arbol // Elimina cualquier selección visual anterior.
        .querySelectorAll(".menu-tree-selected")
        .forEach(elemento => {
            elemento.classList.remove(
                "menu-tree-selected"
            );
        });

    const nivel = Number(nodoElemento.dataset.menuNivel || 0);

    const padre = String(
        nodoElemento.dataset.menuPadre || ""
    )
        .trim()
        .toUpperCase();

    const codigo = String(
        nodoElemento.dataset.menuCodigo || ""
    )
        .trim()
        .toUpperCase();

    const nombre = String(
        nodoElemento.dataset.menuNombre || ""
    )
        .trim()
        .toUpperCase();

    menuSeleccionado = { // Conserva los datos necesarios para crear o eliminar submenús.
        nivel,
        padre,
        codigo,
        nombre
    };

    nodoMenuSeleccionado = nodoElemento;

    nodoElemento.classList.add(
        "menu-tree-selected"
    );

    mostrarAccionesMenuEnNodo();

    console.table(menuSeleccionado);
}


function generarCodigoMenu(nombre) {// Genera una vista previa utilizando el prefijo del padre y el siguiente nivel.

    if (!menuSeleccionado) {
        return "";
    }

    const nivelPadre = Number(menuSeleccionado.nivel);

    const nivelNuevo = nivelPadre + 1;

    const prefijo = obtenerPrefijoMenu(
        menuSeleccionado.codigo,
        nivelPadre
    );

    const nombreNormalizado = normalizarNombreMenu(nombre);

   
    if (!prefijo || !nombreNormalizado) {
        return "";
    }

  
    return `${prefijo}${nivelNuevo}_${nombreNormalizado}`;
}

function obtenerPrefijoMenu(codigo, nivelActual) { // Extrae del código padre el prefijo utilizado para mantener la misma familia jerárquica.
    const codigoLimpio = String(codigo || "")
         .trim()
         .toUpperCase();

    const nivelTexto = String(
        Number(nivelActual) || ""
    );

    if (!codigoLimpio || !nivelTexto) {
        return "";
    }

    const cabecera = codigoLimpio.split("_")[0];

    if(!cabecera.endsWith(nivelTexto)) {
        return "";
    }

    return cabecera.slice(
        0,
        -nivelTexto.length
    );
}

function normalizarNombreMenu(nombre) { // Elimina tildes, espacios y palabras que no aportan al idnetificaddor.

    const ignorar = [
        "DE",
        "DEL",
        "LA",
        "LAS",
        "EL",
        "LOS"
    ];

    return String(nombre || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/\s+/)
        .filter(p =>
            !ignorar.includes(p)
        )
        .join("");
}

function mostrarAccionesMenuEnNodo() { //  Muestra las acciones disponibles junto al menú seleccionado: crear un submenú o eliminar el menú actual.
    const nodoElemento = nodoMenuSeleccionado;

    if (!nodoElemento || !menuSeleccionado) {
        return;
    }

    cerrarAccionesMenu();

   
    const acciones = document.createElement("div");

    acciones.id = "accionesMenuSeleccionado";
    acciones.className = "menu-inline-actions";

    acciones.innerHTML = `
        <div class="menu-inline-selected">
            
        
        </div>

        <div class="menu-inline-buttons">
            <button
                type="button"
                class="btn btn-outline-success btn-sm"
                onclick="abrirFormularioSubmenu(event)"
            >
                <i class="fas fa-plus"></i>
                Crear 
            </button>

        

            <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                onclick="eliminarMenu(event)"
            >
                <i class="fas fa-trash"></i>
                Eliminar
            </button>
        </div>
    `;


    nodoElemento.insertAdjacentElement(
        "afterend",
        acciones
    );
}

function cerrarAccionesMenu() {// Cierra las acciones o formularios inline asociados al nodo seleccionado.
    const acciones = document.getElementById("accionesMenuSeleccionado");
    const formulario = document.getElementById("formularioSubmenuInline");

    acciones?.remove();
    formulario?.remove();
}



function abrirFormularioSubmenu(event) {
    const nodoElemento = nodoMenuSeleccionado;
    event?.stopPropagation();

    if (!nodoElemento || !menuSeleccionado) {
        return;
    }

    document
        .getElementById("accionesMenuSeleccionado")
        ?.remove();

    document
        .getElementById("formularioSubmenuInline")
        ?.remove();

 
    const formulario = document.createElement("div"); // Crea el formulario para registrar un submenú directamente dabejo del nodo seleccionado.

    formulario.id = "formularioSubmenuInline";
    formulario.className = "menu-inline-form";

    formulario.innerHTML = `
        <div class="menu-inline-form-header">
            Nuevo submenú de
            <strong>${menuSeleccionado.nombre}</strong>
        </div>

        <div class="menu-inline-form-content">

            <div class="menu-inline-field">
                <label for="nombreSubmenuInline">
                    Nombre
                </label>

                <input
                    type="text"
                    id="nombreSubmenuInline"
                    class="form-control form-control-sm"
                    placeholder="Ejemplo: Orden de venta"
                    maxlength="30"
                    autocomplete="off"
                    oninput="this.value = this.value.toUpperCase(); limpiarErrorMenu(); validarGuardarMenu();"
                >
            </div>

            <div class="menu-inline-field">
                <label for="codigoSubmenuInline">
                    Código generado
                </label>

                <input
                    type="text"
                    id="codigoSubmenuInline"
                    class="form-control form-control-sm"
                    readonly
                >
            </div>

            <div class="menu-inline-buttons">
                <button
                    type="button"
                    id="btnGuardarSubmenuInline"
                    class="btn btn-sm btn-primary"
                >
                    <i class="fas fa-save"></i>
                    Guardar
                </button>

                <button
                    type="button"
                    id="btnCancelarSubmenuInline"
                    class="btn btn-sm btn-outline-secondary menu-inline-cancel"
                >
                    Cancelar
                </button>
            </div>
             <div
            id="errorSubmenuInline"
            class=" cg-error-card"
            style="display: none;"
        ></div>

        </div>

        
    `;

    nodoElemento.insertAdjacentElement(
        "afterend",
        formulario
    );

    const nombreInput = document.getElementById("nombreSubmenuInline");
    const codigoInput = document.getElementById("codigoSubmenuInline");
    const guardarBoton = document.getElementById("btnGuardarSubmenuInline");
    const cancelarBoton = document.getElementById("btnCancelarSubmenuInline");

    nombreInput?.addEventListener("input", () => { // El código se actualiza automáticamente mientras el usuario escribe el nombre del nuevo submenú.

        limpiarErrorFormulario({
            errorId: "errorSubmenuInline",
            camposFormulario: [
                "nombreSubmenuInline",
                "codigoSubmenuInline"
            ]
        });

        codigoInput.value = generarCodigoMenu(
            nombreInput.value
        );
    });

    nombreInput?.addEventListener("keydown", eventTeclado => {
        if (eventTeclado.key === "Enter") {
            eventTeclado.preventDefault();
            guardarSubmenuInline(eventTeclado);
        }
    });

    guardarBoton?.addEventListener("click", eventBoton => {
        guardarSubmenuInline(eventBoton);
    });

    cancelarBoton?.addEventListener("click", eventBoton => {
        cancelarFormularioSubmenu(eventBoton);
    });

    nombreInput?.focus();
}


function cancelarFormularioSubmenu(event) { // Cancela la creación del submenú y restaura las accciones del menú selecionado.

    event?.stopPropagation();

    document
        .getElementById("formularioSubmenuInline")
        ?.remove();

    mostrarAccionesMenuEnNodo();
}



async function eliminarMenu(event) { // Elimina el menú seleccionado 
    event?.stopPropagation();

    if (!menuSeleccionado) {
        return;
    }

    const codigoMenu = String(
        menuSeleccionado.codigo || ""
    )
        .trim()
        .toUpperCase();

    const nombreMenu = String(
        menuSeleccionado.nombre || ""
    )   
        .trim()
        .toUpperCase();
    
    const botonEliminar = event?.currentTarget || null;

    if (!codigoMenu) {
        console.error(
            "El menú seleccionado no tiene código."
        );
        return;
    }

    const confirmado = await mostrarConfirmacion({  // Al eliminar un menú , se eliminan permanentemente los submenus que tenga.
        titulo: "Eliminar menú",
        mensaje:  `¿Desea eliminar el menú "${nombreMenu}"?`,
        advertencia: "También se eliminarán todos los submenús. Esta acción no se puede deshacer.",
        textoConfirmar: "Eliminar",
        textoCancelar: "Cancelar"

    });
    

    if (!confirmado) {
        return;
    }

    if (botonEliminar) {
        botonEliminar.disabled = true;
    }

    fetch (
        `/configurapp/eliminar_configuracion_menu/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({
                codmenu: codigoMenu
            })
        }
    )

    .then(async response => {
        const data = await response.json();

        return {
            response,
            data
        };
    })

    .then (({response, data }) => {

        if (!response.ok || data.ok !== true ) {
            throw new Error(
                data.error ||
                "No se pudo eliminar el menú."
            );
        }

        console.log(
            "Menús eliminados",
            data.eliminados    
        );

        document
            .getElementById("accionesMenuSeleccionado")
            ?.remove();

        document
            .getElementById("formularioSubmenuInline")
            ?.remove();

        menuSeleccionado = null; // Después de eliminar, limpia la selección y reconstruye el árbol.
        nodoMenuSeleccionado = null;

        return listarMenus().then(() => {
           const mensajeExito =
             data.eliminados === 1
                ? "El menú fue eliminado correctamente."
                : `${data.eliminados} menús fueron eliminados correctamente.`;

            mostrarToast({
                tipo: "success",
                titulo: "Menú eliminado",
                mensaje: mensajeExito,
                duración: 5000
            });
            
            cargarNivelesMenu();
        });

    })

    .catch(error => {
        console.error(
            "Error eliminado menú:",
            error
        );

        mostrarToast({
            tipo: "error",
            titutlo: "No se pudo eliminar",
            mensaje:
                 error.message ||
                 "No se pudo eliminar el menú.",
            duracion: 7000
        });

        if(botonEliminar) {
            botonEliminar.disabled = false;
        }
    });
}

function guardarSubmenuInline(event) {// Guarda un nuevo submenú utilizando como padre el nodo actualmente seleccionado.
    const nombreInput = document.getElementById("nombreSubmenuInline");
    const codigoInput = document.getElementById("codigoSubmenuInline");
    const errorElemento = document.getElementById("errorSubmenuInline");
    const btnGuardar = document.getElementById("btnGuardarSubmenuInline");

    event?.preventDefault();
    event?.stopPropagation();

    if (
        !nombreInput ||
        !codigoInput ||
        !errorElemento ||
        !btnGuardar ||
        !menuSeleccionado
    ) {
        return;
    }

    limpiarErrorFormulario({
        errorId: "errorSubmenuInline",
        camposFormulario: [
            "nombreSubmenuInline",
            "codigoSubmenuInline"
        ]
    });

    const nombre = nombreInput.value.trim().toUpperCase();

    const nivel = Number(menuSeleccionado.nivel) + 1; // El nivel del nuevo menú siempre es unno mayor que el del padre

    const codigoPadre = String( // El backend recibe el código real del padre para conservar la jerarquía.
        menuSeleccionado.codigo || ""
    )
        .trim()
        .toUpperCase();

    if (!nombre) {
        mostrarErrorFormulario({
            mensaje: "Ingrese el nombre del submenú.",
            errorId: "errorSubmenuInline",
            campos: ["nombreSubmenuInline"],
            camposFormulario: [
                "nombreSubmenuInline",
                "codigoSubmenuInline"
            ]
        });

        nombreInput.focus();
        return;
    }

    if (!codigoPadre) {
        mostrarErrorFormulario({
            mensaje:
                "No se pudo identificar el código del menú padre.",
            errorId: "errorSubmenuInline",
            camposFormulario: [
                "nombreSubmenuInline",
                "codigoSubmenuInline"
            ]
        });

        return;
    }

    if (nivel <= 1) {
        mostrarErrorFormulario({
            mensaje: "El nivel generado no es válido.",
            errorId: "errorSubmenuInline",
            camposFormulario: [
                "nombreSubmenuInline",
                "codigoSubmenuInline"
            ]
        });

        return;
    }

    btnGuardar.disabled = true; // Bloque temporalmente el formulario para evitar repetidos.

    btnGuardar.innerHTML = `
        <span
            class="spinner-border spinner-border-sm"
            aria-hidden="true">
        </span>
        Guardando...
    `;

    nombreInput.disabled = true;

    fetch(
        `/configurapp/guardar_configuracion_menu/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                codigopadre: codigoPadre,
                nommenu: nombre
            })
        }
    )
        .then(async response => {
            const data = await response.json();

            return {
                response,
                data
            };
        })
        .then(({ response, data }) => {

            if (!response.ok || data.ok !== true) {

                mostrarErrorFormulario({
                    mensaje:
                        data.error ||
                        "No se pudo guardar el submenú.",
                    errorId: "errorSubmenuInline",
                    campos: ["nombreSubmenuInline"],
                    camposFormulario: [
                        "nombreSubmenuInline",
                        "codigoSubmenuInline"
                    ]
                });

                btnGuardar.disabled = false;
                nombreInput.disabled = false;

                btnGuardar.innerHTML = `
                    <i class="fas fa-save"></i>
                    Guardar
                `;

                nombreInput.focus();
                return;
            }

            const codigoCreado = String(
                data.menu?.pf_codmenu || ""
            ).trim();


            document
                .getElementById(
                    "formularioSubmenuInline"
                )
                ?.remove();

            menuSeleccionado = null;
            nodoMenuSeleccionado = null;


            listarMenus().then(() => { // Al guardar correctamente se reconstruye el árbol y se resalta el nuevo submenú
                if (codigoCreado) {
                    resaltarMenuCreado(
                        codigoCreado
                    );
                }
            });

            console.log(
                "Submenú guardado:",
                data.menu
            );
        })
        .catch(error => {

            console.error(
                "Error guardando submenú:",
                error
            );

            mostrarErrorFormulario({
                mensaje:
                    "No se pudo completar la comunicación con el servidor.",
                errorId: "errorSubmenuInline",
                camposFormulario: [
                    "nombreSubmenuInline",
                    "codigoSubmenuInline"
                ],
                duracion: 7000
            });

            btnGuardar.disabled = false;
            nombreInput.disabled = false;

            btnGuardar.innerHTML = `
                <i class="fas fa-save"></i>
                Guardar
            `;

            nombreInput.focus();
        });
}



function actualizarVistaMenuSeleccionado() { // Actualiza el panel informativo con los datos del menú actualmente seleccionado.
    const panel = document.getElementById("panelMenuSeleccionado");
    const textoNivel = document.getElementById("menuSeleccionadoNivel");
    const textoCodigo = document.getElementById("menuSeleccionadoCodigo");
    const textoNombre = document.getElementById("menuSeleccionadoNombre");

    if (
        !panel ||
        !textoNivel ||
        !textoCodigo ||
        !textoNombre
    ) {
        return;
    }

    if (!menuSeleccionado) {
        panel.style.display = "none";

        textoNivel.textContent = "";
        textoCodigo.textContent = "";
        textoNombre.textContent = "";

        return;
    }

    textoNivel.textContent =
        `Nivel ${menuSeleccionado.nivel}`;

    textoCodigo.textContent =
        menuSeleccionado.codigo;

    textoNombre.textContent =
        menuSeleccionado.nombre;

    panel.style.display = "block";
}


function expandirTodoMenu() { // Expande todos los nodos desplegables del árbol.
    document.querySelectorAll("#arbolMenus .collapse")
            .forEach(elemento => { 
                bootstrap.Collapse
                .getOrCreateInstance(elemento)
                .show();
    });

}

function colapsarTodoMenu() { // Contrae todos los nodos desplegables del árbol.
    document
        .querySelectorAll("#arbolMenus .collapse")
        .forEach(elemento => {
            bootstrap.Collapse
                .getOrCreateInstance(elemento)
                .hide();
        });
}


function resaltarMenuCreado(codMenu) { // Localiza visualmente un menú recién creado.
    resaltarElementoCreado({
        contenedor: "#arbolMenus",
        atributo: "data-codmenu",
        valorBuscado: codMenu,
        claseResaltado: "menu-highlight"
    });
}

function actualizarProcesoMenu() { // Actualiza los indicadores visuales del formulario principal según los datos que el usuario ya ha completado.
    const nivel = Number(document.getElementById("nivelMenu")?.value || 0);
    const padre = document.getElementById("padreMenu")?.value.trim() || "";
    const codigo = document.getElementById("codigoMenu")?.value.trim() || "";
    const nombre = document.getElementById("nombreMenu")?.value.trim() || "";

    const stepNivel = document.getElementById("menuStepNivel");
    const stepCodigo = document.getElementById("menuStepCodigo");
    const stepNombre = document.getElementById("menuStepNombre");

    const lineCodigoNombre = document.getElementById("menuLineCodigoNombre");

    const elementos = [
        stepNivel,
        stepCodigo,
        stepNombre,
        lineCodigoNombre
    ];

    elementos.forEach(elemento => { // Reinicia el estado visual antes de calcular el progreso actual.
        elemento?.classList.remove("active", "completed");
    });


    if (!nivel) {
        return;
    }
    stepNivel?.classList.add("completed");


    if (nivel === 1) {// En el flujo actual el formulario principal crea únicamente menús de nivel 1, por lo que código y nombre completan el proceso.


        if (!codigo) {
            return;
        }

        stepCodigo?.classList.add("completed");

        if (!nombre) {
            return;
        }

        lineCodigoNombre?.classList.add("completed");
        stepNombre?.classList.add("completed");

        return;
    }

}

