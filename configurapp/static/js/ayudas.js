let elementoEnfocadoAntesDeAyuda = null; // Se utiliza  para devolver el foco al cerrar el modal


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const modal = document.getElementById("modalAyudaSistema");
        const btnCerrar = document.getElementById("btnCerrarModalAyuda");
        const btnAceptar = document.getElementById("btnAceptarModalAyuda");
        const backdrop = modal?.querySelector("[data-ayuda-cerrar]");

        
        if (!modal) {
            return;
        }

       
        btnCerrar?.addEventListener( // Permite cerrar el modal desde botones, fondo o teclado.
            "click",
            cerrarModalAyuda
        );

        btnAceptar?.addEventListener(
            "click",
            cerrarModalAyuda
        );

        backdrop?.addEventListener(
            "click",
            cerrarModalAyuda
        );

        document.addEventListener(
            "keydown",
            manejarTecladoModalAyuda
        );
    }
);


function mostrarModalAyuda(configuracion = {}) { 
    // Recibe la información de ayuda y la muestra en el modal
    
    const modal = document.getElementById("modalAyudaSistema");
    const dialogo = modal?.querySelector(".cg-help-modal__dialog");
    const tituloElemento = document.getElementById("tituloModalAyuda");
    const descripcionElemento = document.getElementById("descripcionModalAyuda");
    const objetivoElemento = document.getElementById("objetivoModalAyuda");
    const procesoElemento = document.getElementById("procesoModalAyuda");
    const consejosElemento = document.getElementById("consejosModalAyuda");
    const seccionDescripcion = document.getElementById("seccionDescripcionAyuda");
    const seccionObjetivo = document.getElementById("seccionObjetivoAyuda");
    const seccionProceso = document.getElementById("seccionProcesoAyuda");
    const seccionConsejos = document.getElementById("seccionConsejosAyuda");

    // Normaliza la información antes de pintar el modal
    if (
        !modal ||
        !dialogo ||
        !tituloElemento ||
        !descripcionElemento ||
        !objetivoElemento ||
        !procesoElemento ||
        !consejosElemento
    ) {
        return;
    }

    const titulo = String( configuracion.titulo || "Información del módulo").trim();

    const descripcion = String( configuracion.descripcion || "").trim();

    const objetivo = String( configuracion.objetivo || "").trim();

    const proceso = Array.isArray(
        configuracion.proceso
    )
        ? configuracion.proceso
        : [];

    const consejos = Array.isArray(
        configuracion.consejos
    )
        ? configuracion.consejos
        : [];

    // Limpia el contenido anterior antes de mostrar una nueva ayuda
    tituloElemento.textContent = "";
    descripcionElemento.textContent = "";
    objetivoElemento.textContent = "";
    procesoElemento.innerHTML = "";
    consejosElemento.innerHTML = "";

     
    tituloElemento.textContent = titulo;

    pintarTextoAyuda({
        seccion: seccionDescripcion,
        elemento: descripcionElemento,
        texto: descripcion
    });

    pintarTextoAyuda({
        seccion: seccionObjetivo,
        elemento: objetivoElemento,
        texto: objetivo
    });

    pintarListaAyuda({
        seccion: seccionProceso,
        elemento: procesoElemento,
        elementos: proceso
    });

    pintarListaAyuda({
        seccion: seccionConsejos,
        elemento: consejosElemento,
        elementos: consejos
    });


    elementoEnfocadoAntesDeAyuda =
        document.activeElement;

    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add(
        "cg-help-modal-open"
    );

    dialogo.focus();
}


function cerrarModalAyuda() {
    // Cierra el modal y devuelve el foco al elemento desde donde se abrió la ayuda
    const modal = document.getElementById(
        "modalAyudaSistema"
    );

    if (
        !modal ||
        !modal.classList.contains("is-visible")
    ) {
        return;
    }

  
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove(
        "cg-help-modal-open"
    );


    if (
        elementoEnfocadoAntesDeAyuda instanceof HTMLElement
    ) {
        elementoEnfocadoAntesDeAyuda.focus();
    }

    elementoEnfocadoAntesDeAyuda = null;
}


function pintarTextoAyuda({ 
// Muestra u oculta una sección de texto según exista contenido disponible.
    seccion,
    elemento,
    texto
}) {

    //  Preparación de la interfaz
    if (!seccion || !elemento) {
        return;
    }

    const contenido = String(
        texto || ""
    ).trim();

   
    if (!contenido) {
        seccion.style.display = "none";
        elemento.textContent = "";
        return;
    }

   
    elemento.textContent = contenido;
    seccion.style.display = "";
}


function pintarListaAyuda({ 
// Construye una lista de pasos o recomendaciones y oculta la sección cuando no existen elementos.
    seccion,
    elemento,
    elementos
}) {

    
    if (!seccion || !elemento) {
        return;
    }

    const lista = Array.isArray(elementos)
        ? elementos
            .map(item => String(item || "").trim())
            .filter(Boolean)
        : [];

    
    elemento.innerHTML = "";

   
    if (lista.length === 0) {
        seccion.style.display = "none";
        return;
    }

    const fragmento = document.createDocumentFragment(); // Evita repintar el DOM por cada elemento agregado.

    lista.forEach(item => {
        const elementoLista =
            document.createElement("li");

        elementoLista.textContent = item;

        fragmento.appendChild(
            elementoLista
        );
    });

    elemento.appendChild(fragmento);
    seccion.style.display = "";
}


function manejarTecladoModalAyuda(event) { 
    // Permite cerrar el modal utilizando Esc

   
    const modal = document.getElementById(
        "modalAyudaSistema"
    );

    if (
        !modal ||
        !modal.classList.contains("is-visible")
    ) {
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        cerrarModalAyuda();
    }
}


/* Motor del sistema de ayuda  */

function abrirAyudaPorCodigo(codigoAyuda) { 
    // Consulta la ayuda asociada a un código de menú, el contenido se obtiene de sqlite mdiante django.
    const modal = document.getElementById(
        "modalAyudaSistema"
    );

    //  Preparación de los datos
    const codigoNormalizado =
        normalizarCodigoAyuda(
            codigoAyuda
        );

    //  Validaciones
    if (!codigoNormalizado) {
        mostrarModalAyuda({
            titulo: "Ayuda no disponible",
            descripcion:
                "No se recibió un código de ayuda válido.",
            objetivo: "",
            proceso: [],
            consejos: []
        });

        return Promise.resolve(false);
    }

    //  Marca temporalmente el modal mientras se consulta el servidor.
    if (modal) {
        modal.setAttribute(
            "data-cargando",
            "true"
        );
    }


    return fetch(
        `/configurapp/obtener_ayuda/?codigo_menu=${encodeURIComponent(codigoNormalizado)}`
    )

        
        .then(async response => {
            const data = await response.json();

            return {
                response,
                data
            };
        })

        .then(({ response, data }) => {

            //  Si no existe un ayuda válida, informa al usuario
            if (
                !response.ok ||
                data.ok !== true ||
                !data.ayuda
            ) {
                mostrarModalAyuda({
                    titulo: "Ayuda no disponible",
                    descripcion:
                        data.error ||
                        "Este módulo todavía no tiene una ayuda configurada.",
                    objetivo: "",
                    proceso: [],
                    consejos: []
                });

                return false;
            }

            
            const ayuda = data.ayuda;

            const proceso =
                Array.isArray(ayuda.proceso)
                    ? ayuda.proceso
                    : [];

            const consejos =
                Array.isArray(ayuda.consejos)
                    ? ayuda.consejos
                    : [];

            
            mostrarModalAyuda({ // Envía al modal únicamente la información ya validada
                titulo:
                    ayuda.titulo ||
                    "Información del módulo",

                descripcion:
                    ayuda.descripcion || "",

                objetivo:
                    ayuda.objetivo || "",

                proceso:
                    proceso,

                consejos:
                    consejos
            });

            //  Actualizar información secundaria
            console.log(
                "Ayuda cargada desde SQLite:",
                ayuda.codigo_menu
            );

            return true;
        })

    
        .catch(error => {
            console.error(
                "Error consultando la ayuda:",
                error
            );

            mostrarModalAyuda({
                titulo:
                    "Error al cargar la ayuda",

                descripcion:
                    "No fue posible consultar la información de ayuda. Revise la conexión con el servidor.",

                objetivo:
                    "",

                proceso:
                    [],

                consejos:
                    []
            });

            return false;
        })

        .finally(() => {
            if (modal) {
                modal.removeAttribute(
                    "data-cargando"
                );
            }
        });
}



const CLAVE_CONTEXTO_AYUDA =
    "gestordata.codigoAyudaActual";


function normalizarCodigoAyuda(codigoAyuda) { 
    // Limpia el código recibido antes de utilizarlo como identificador de ayuda.

 
    if (typeof codigoAyuda !== "string") {
        return "";
    }

    return codigoAyuda.trim();
}


function establecerContextoAyuda(codigoAyuda) { 
    // Guarda el código de ayuda correspondiente a la pantalla que el usuario está utilizando 
    const codigoNormalizado =
        normalizarCodigoAyuda(
            codigoAyuda
        );

    if (!codigoNormalizado) {
        console.warn(
            "No se pudo establecer el contexto de ayuda: código inválido."
        );

        return false;
    }

    // Guardar contexto
    try {
        sessionStorage.setItem(
            CLAVE_CONTEXTO_AYUDA,
            codigoNormalizado
        );
    } catch (error) {
        console.error(
            "No se pudo guardar el contexto de ayuda.",
            error
        );

        return false;
    }


    return true;
}


function obtenerContextoAyuda() { 
    // Recupera el código de ayuda de la pantalla activa.
    let codigoGuardado = "";

    try {
        codigoGuardado =
            sessionStorage.getItem(
                CLAVE_CONTEXTO_AYUDA
            ) || "";
    } catch (error) {
        console.error(
            "No se pudo consultar el contexto de ayuda.",
            error
        );

        return null;
    }

    const codigoNormalizado =
        normalizarCodigoAyuda(
            codigoGuardado
        );

    if (!codigoNormalizado) {
        return null;
    }

    return codigoNormalizado;
}

function limpiarContextoAyuda() { 
    // Elimina el contexto de ayuda  almacenado en la sesión.

    try {
        sessionStorage.removeItem(
            CLAVE_CONTEXTO_AYUDA
        );
    } catch (error) {
        console.error(
            "No se pudo eliminar el contexto de ayuda.",
            error
        );

        return false;
    }


    return true;
}


async function abrirAyudaContextual() { 
    //Abre la ayuda correspondiente a la pantalla actual.

    //  El código se obtiene desde el contexto alamacenado.
    const codigoAyuda =
        obtenerContextoAyuda();

    //  Validar contexto
    if (!codigoAyuda) {
        mostrarModalAyuda({
            titulo: "Ayuda no disponible",
            descripcion:
                "No se ha identificado la pantalla activa. Ingrese primero a una opción del módulo.",
            objetivo: "",
            proceso: [],
            consejos: []
        });

        return false;
    }

    //  Consultar y abrir ayuda
    return await abrirAyudaPorCodigo(
        codigoAyuda
    );
}



function inicializarAyudaPantalla(codigoAyuda) { 
    // Inicializa el contexto de ayuda cuando se carga un módulo del sistema.

    const resultado =
        establecerContextoAyuda(codigoAyuda);

    if (!resultado) {
        console.warn(
            "No se pudo inicializar el contexto de ayuda:",
            codigoAyuda
        );

        return false;
    }

    return true;
}

