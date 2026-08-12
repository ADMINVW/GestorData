/**
 * Permite ejecutar el botón principal de un fromulario al presionar Enter.
 * Si el botón está deshabilitado, la acción no se ejecuta.
 
 
  @param {string|string[]} controles  
  @param {string} botonId             
 */
function registrarEnterFormulario(controles, botonId) {

    if (!Array.isArray(controles)) {
        controles = [controles];
    }

    controles.forEach(id => {

        const control = document.getElementById(id);

        if (!control) return;

        control.addEventListener("keydown", function (e) {

            if (e.key !== "Enter") return;

            e.preventDefault();

            const boton = document.getElementById(botonId);

            if (!boton || boton.disabled) return; // Respeta la validación del formulario no ejecuta botones deshabilitados

            boton.click();
        });

    });

}


/*
  Temporizadores independientes por contenedor de error.
  Evita que la alerta de un formulario interfiera con otra.
 */
const temporizadoresErroresFormulario = new Map();

/**
 * Muestra un error debajo del formulario y marca los campos relacionados.
 *
 * @param {Object} opciones
 * @param {string} opciones.mensaje Mensaje que viene del backend o frontend.
 * @param {string} opciones.errorId ID del contenedor donde se muestra el error.
 * @param {string|string[]} [opciones.campos=[]] Campo o campos que se marcarán.
 * @param {string[]} [opciones.camposFormulario=[]] Todos los campos del formulario.
 * @param {number} [opciones.duracion=7000] Tiempo visible en milisegundos.
 */

function mostrarErrorFormulario({
    mensaje, errorId, campos = [], camposFormulario = [], duracion = 7000
}) {
    const errorBox = document.getElementById(errorId);

    if(!errorBox) {
        console.warn(`mostrarErrorFormulario: no existe el contenedor #${errorId}`);
        return;
    }

    const camposConError = Array.isArray(campos)
        ? campos
        : [campos];

    const temporizadorAnterior = temporizadoresErroresFormulario.get(errorId); // Reinicia el tiempo  del error si el mismo formulario ya tenía uno activo.

    if (temporizadorAnterior) {
        clearTimeout(temporizadorAnterior);
    }

    camposFormulario.forEach(campoId => { // Limpia marcas anteriores antes de señalar los campos del nuevo error 
        document.getElementById(campoId)?.classList.remove("is-invalid");

    });

    camposConError.forEach(campoId => {
        if (!campoId) return;

        document.getElementById(campoId)?.classList.add("is-invalid");
    });

    errorBox.innerHTML = `<i class="fas fa-triangle-exclamation me-1"></i>${mensaje}`;

    errorBox.style.display = "block";

    const nuevoTemporizador = setTimeout(() => { // El mensaje y las marcas se eliminan automáticamente al terminar la duración.
        limpiarErrorFormulario({
            errorId, camposFormulario
        });

    }, duracion);

    temporizadoresErroresFormulario.set(
        errorId, nuevoTemporizador
    );

}


/**
 * Oculta el mensaje y elimina las marcas de validación.
 
  @param {Object} opciones
  @param {string} opciones.errorId ID del contenedor del error.
  @param {string[]} [opciones.camposFormulario=[]] Campos que deben limpiarse.
 */
function limpiarErrorFormulario({
    errorId,
    camposFormulario = []

}) {
    const errorBox = document.getElementById(errorId);

    const temporizador = temporizadoresErroresFormulario.get(errorId);

    if (temporizador) { // Cancela el cierre automático para evitar temporizadores pendientes.
        clearTimeout(temporizador);
        temporizadoresErroresFormulario.delete(errorId);
    }

    if(errorBox) {
        errorBox.innerHTML = "";
        errorBox.style.display = "none";
    }

    camposFormulario.forEach(campoId => {
        document.getElementById(campoId)?.classList.remove("is-invalid");
    });

}


/* Localiza y resalta temporalmente un elemento recién creado. */

function resaltarElementoCreado ({
    contenedor,
    atributo,
    valorBuscado,
    claseResaltado,
    retrasoInicial = 300,
    retrasoScroll = 400,
    duracion = 10000

}) {
    if (!valorBuscado) return;

    const contenedorElemento = document.querySelector(contenedor);

    if(!contenedorElemento) {
        console.warn(`No se encontró el contenedor: ${contenedor}`);
        return;
    }

    const valorNormalizado = String(valorBuscado).trim();

    setTimeout (() => {
        contenedorElemento
            .querySelectorAll(`.${claseResaltado}`)
            .forEach(elemento => {
                 elemento.classList.remove(claseResaltado)
            });

        const nodo = Array.from( // Busca el elemento cuyo atributo coincide exactamente con el valor solicitado.
            contenedorElemento.querySelectorAll(`[${atributo}]`)
        ).find(elemento =>
            String(elemento.getAttribute(atributo) || "").trim() ===
            valorNormalizado
        );
        
        if (!nodo) {
            console.warn(`No se encontró con ${atributo}="${valorNormalizado}"`);
            return;

        }

        const collapsesPadre = []; // Localiza todos los contenedores colapsados que forman la ruta hasta el nodo
        let elementoActual = nodo.parentElement;

        while (elementoActual) {
            if (elementoActual.classList?.contains("collapse")) {
                collapsesPadre.push(elementoActual);
            }

            elementoActual = elementoActual.parentElement;
        }
        
        collapsesPadre // Abre la jerarquía desde el nivel superior hasta llegar al elemento.
            .reverse()
            .forEach(collapse => {
                if (
                    typeof bootstrap !== "undefined" &&
                    bootstrap.Collapse 
                ) {
                    bootstrap.Collapse
                        .getOrCreateInstance(collapse,  {
                            toggle: false
                        })
                        .show();
                      
                }
            });

        setTimeout(() => { // Espera a que el listado o árbol termine de reconstruirse en el DOM
            nodo.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });

            nodo.classList.remove(claseResaltado);

            void nodo.offsetWidth; // Fuerza el repintado para poder reiniciar la animación de resaltado.

            nodo.classList.add(claseResaltado);

            setTimeout(() => {
                nodo.classList.remove(claseResaltado);
            }, duracion);
        }, retrasoScroll );
    }, retrasoInicial);
}



/**
 * Muestra una ventana de confirmación reutilizable.
 *
 * @param {Object} opciones
 * @param {string} opciones.titulo
 * @param {string} opciones.mensaje
 * @param {string} [opciones.advertencia]
 * @param {string} [opciones.textoConfirmar="Confirmar"]
 * @param {string} [opciones.textoCancelar="Cancelar"]
 * @returns {Promise<boolean>}
 */


function mostrarConfirmacion({
    titulo,
    mensaje,
    advertencia = "",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar"
}) {
    return new Promise(resolve => {

        // Evitar más de una confirmación abierta.
        document
            .getElementById("cgModalConfirmacion")
            ?.remove();

        const overlay = document.createElement("div");

        overlay.id = "cgModalConfirmacion";
        overlay.className = "cg-modal-overlay";

        overlay.innerHTML = `
            <div
                class="cg-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cgModalTitulo"
                aria-describedby="cgModalMensaje"
            >
                <div class="cg-modal-header">
                    <div class="cg-modal-icon">
                        <i class="fas fa-triangle-exclamation"></i>
                    </div>

                    <h3
                        id="cgModalTitulo"
                        class="cg-modal-title"
                    >
                        ${titulo}
                    </h3>
                </div>

                <p
                    id="cgModalMensaje"
                    class="cg-modal-message"
                >
                    ${mensaje}
                </p>

                ${
                    advertencia
                        ? `
                            <p class="cg-modal-warning">
                                ${advertencia}
                            </p>
                        `
                        : ""
                }

                <div class="cg-modal-actions">
                    <button
                        type="button"
                        id="cgModalCancelar"
                        class="btn btn-sm btn-outline-secondary"
                    >
                        ${textoCancelar}
                    </button>

                    <button
                        type="button"
                        id="cgModalConfirmar"
                        class="btn btn-sm btn-danger"
                    >
                        <i class="fas fa-trash me-1"></i>
                        ${textoConfirmar}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const btnCancelar = document.getElementById("cgModalCancelar");
        const btnConfirmar = document.getElementById("cgModalConfirmar");

        function cerrar(resultado) { // Centraliza el cierre del modal y devuelve el resultado de la decisión.
            document.removeEventListener(
                "keydown",
                manejarTeclado
            );

            overlay.remove();
            resolve(resultado);
        }

        function manejarTeclado(event) { // Escape cancela la acción y Enter la confirma
            if (event.key === "Escape") {
                cerrar(false);
            }

            if (event.key === "Enter") {
                cerrar(true);
            }
        }

        btnCancelar.addEventListener(
            "click",
            () => cerrar(false)
        );

        btnConfirmar.addEventListener(
            "click",
            () => cerrar(true)
        );

        overlay.addEventListener(
            "click",
            event => {
                if (event.target === overlay) { // Un clic fuera de la tarjeta se interpreta como cancelación
                    cerrar(false);
                }
            }
        );

        document.addEventListener(
            "keydown",
            manejarTeclado
        );

        btnCancelar.focus(); // El foco inicial queda en Cancelar para evitar confirmaciones accidentales
    });
}


/**
 * Muestra una notificación flotante no bloqueante.
 *
 * @param {Object} opciones
 * @param {"success"|"error"|"warning"|"info"} [opciones.tipo="info"]
 * @param {string} opciones.mensaje
 * @param {string} [opciones.titulo]
 * @param {number} [opciones.duracion=4000]
 */
function mostrarToast({
    tipo = "info",
    mensaje,
    titulo = "",
    duracion = 5000
}) {

    const tiposPermitidos = [
        "success",
        "error",
        "warning",
        "info"
    ];

    if (!tiposPermitidos.includes(tipo)) { // Si se recibe un tipo desconocido, utiliza "info" como opción segura
        tipo = "info";
    }

    if (!mensaje) {
        console.warn(
            "mostrarToast: el mensaje es obligatiorio."
        );
        return;
    }

    let contenedor = document.getElementById( // Se crea una sola vez y se reutiliza para varios toast
        "cgToastContainer"
    );

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "cgToastContainer";
        contenedor.className = "cg-toast-container";

        contenedor.setAttribute(
            "aria-live",
            "polite"
        );

        contenedor.setAttribute(
            "aria-atomic",
            "true"
        );

        document.body.appendChild(contenedor);

    }

    const configuracion = {
        success: {
            titulo: "Operación Existosa",
            icono: "fa-circle-check"
        },
        error: {
            titulo: "Ocurrió un error",
            icono: "fa-circle-xmark"
        },
        warning: {
            titulo: "Advertencia",
            icono: "fa-triangle-exclamation"
        },
        info: {
            titulo: "Información",
            icono: "fa-circle-info"
        }
    };

    const configuracionTipo = configuracion[tipo];

    const toast = document.createElement("div");

    toast.className = `
        cg-toast
        cg-toast-${tipo}
    `.trim();

    toast.setAttribute("role", "status");

    toast.innerHTML = `
         <div class="cg-toast-icon">
            <i class="fas ${configuracionTipo.icono}"></i>
        </div>

        <div class="cg-toast-content">
           <p class="cg-toast-title">
              ${titulo || configuracionTipo.titulo}
            </p>

           <p class="cg-toast-message">
               ${mensaje}
           </p>
         </div>
         
         <button
             type="button"
             class="cg-toast-close"
             aria-label="Cerrar notificación"
        >
            <i class="fas fa-xmark"></i>
          </button>
    `;

    contenedor.appendChild(toast);

    let temporizadorCierre = null; // Controla que cada notificación pueda cerrarse una sola vez
    let cerrado = false;

    function cerrarToast() {
        if(cerrado) {
            return;
        }

        cerrado = true;

        if(temporizadorCierre) {
            clearTimeout(temporizadorCierre);
         }

        toast.classList.add("cg-toast-saliendo"); // Inicia la animación de salida antes de retirar el elemento del DOM

        toast.addEventListener(
            "animationend",
            () => {
                toast.remove();

                if (
                    contenedor &&
                    contenedor.children.length === 0
                ) {
                    contenedor.remove();
                }
            },
            {
                once: true
            }
        );
    }

    toast
        .querySelector(".cg-toast-close")
        ?.addEventListener(
            "click",
            cerrarToast
        );

    if (duracion > 0) {
        temporizadorCierre = setTimeout( // Una duración mayor que cero activa el cierre automático
            cerrarToast,
            duracion
        );
    }

    return {
        cerrar: cerrarToast,
        elemento: toast
    };



}