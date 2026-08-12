"use strict";

let ayudasCargadas = []; // Mantiene en memoria las ayudas cargadas desde el servidor


document.addEventListener(
    "DOMContentLoaded",
    function () {

     
        const tablaBody = document.getElementById("tablaAyudasBody");
        const buscarInput = document.getElementById("buscarCodigoAyuda");
        const btnLimpiar = document.getElementById("btnLimpiarBusquedaAyuda")

 
        if (!tablaBody) {
            return;
        }

      
        listarAyudas(); //Carga inicialmente todas las ayudas almacenadas en SQLite

        buscarInput?.addEventListener("input", buscarAyudaPorCodigo); // Filtra la tabla mientras el usuario escribe código

        btnLimpiar?.addEventListener("click", limpiarBusquedaAyuda);

    }
);


function listarAyudas() {
 // Consulta las ayudas almacenados y actualiza la tabla  de configuración.
    
    const tablaBody = document.getElementById("tablaAyudasBody");
    const mensaje = document.getElementById("mensajeAyudas");

    
    if (!tablaBody) {
        return;
    }

    tablaBody.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="text-center text-muted"
            >
                Cargando ayudas...
            </td>
        </tr>
    `;

    if (mensaje) {
        mensaje.innerHTML = "";
        mensaje.style.display = "none";
    }

  
    return fetch(
        `/configurapp/listar_ayudas/?company=${encodeURIComponent(companyKey)}`
    )

        
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    `Error HTTP ${response.status}`
                );
            }

            return response.json();
        })

        .then(data => {

          
            const ayudas = Array.isArray(
                
                data.ayudas
            )
                ? data.ayudas
                : [];
                
            ayudasCargadas = ayudas; // Conserva una copia de los registros para reutilizarlos desde las acciones de la tabla.


            
            tablaBody.innerHTML = "";

        
            if (ayudas.length === 0) {
                tablaBody.innerHTML = `
                    <tr>
                        <td
                            colspan="6"
                            class="text-center text-muted"
                        >
                            No existen ayudas registradas.
                        </td>
                    </tr>
                `;

                return;
            }

            ayudas.forEach(ayuda => {

                const estado = ayuda.activo
                    ? `
                        <span class="badge text-bg-success">
                            Activa
                        </span>
                    `
                    : `
                        <span class="badge text-bg-secondary">
                            Inactiva
                        </span>
                    `;

                tablaBody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr
                        data-ayuda-id="${ayuda.id}"
                        data-codigo-menu="${ayuda.codigo_menu}"
                    >
                        <td>
                            <strong>
                                ${escaparHtml(
                                    ayuda.codigo_menu
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escaparHtml(
                                ayuda.modulo
                            )}
                        </td>

                        <td>
                            ${escaparHtml(
                                ayuda.titulo
                            )}
                        </td>

                        <td>
                            ${estado}
                        </td>

                        <td>
                            ${escaparHtml(
                                ayuda.fecha_actualizacion
                            )}
                        </td>
                       
                           <td>
                              <button
                               type="button"
                               class="btn btn-outline-primary btn-sm"
                                onclick="editarAyuda(${ayuda.id})"
                                 >
                                <i class="fas fa-pen"></i>
                                 Editar
                              </button>

                          <button
                            type="button"
                              class="btn btn-outline-danger btn-sm"
                               onclick="eliminarAyuda(event, ${ayuda.id})"
                               >
                               <i class="fas fa-trash"></i>
                                  Eliminar
                         </button>
                           </td>
                    </tr>
                    `
                );
            });

        
            console.log(
                "Ayudas cargadas:",
                ayudas.length
            );
        })

    
        .catch(error => {
            console.error(
                "Error listando ayudas:",
                error
            );

            tablaBody.innerHTML = `
                <tr>
                    <td
                        colspan="6 "
                        class="text-center text-danger"
                    >
                        No se pudieron cargar las ayudas.
                    </td>
                </tr>
            `;

            if (mensaje) {
                mensaje.innerHTML = `
                    <i class="fas fa-triangle-exclamation me-1"></i>
                    No se pudo consultar la información de ayudas.
                `;

                mensaje.style.display = "block";
            }
        });
}

/*
 * Filtra las ayudas ya cargadas utilizando el código del menú.
 * La búsqueda se realiza en memoria para evitar consultas
 * adicionales a SQLite mientras el usuario escribe.
 */
function buscarAyudaPorCodigo() {
    const input = document.getElementById("buscarCodigoAyuda");
    const tablaBody = document.getElementById("tablaAyudasBody");

    if(!input || !tablaBody) {
        return;
    }

    const codigoBuscado = input
        .value
        .trim()
        .toUpperCase();

    const filas = tablaBody.querySelectorAll(
        "tr[data-ayuda-id]"
    );

    let encontrados = 0;

    filas.forEach(fila => {
        const codigoMenu = String(
            fila.dataset.codigoMenu || ""
        )
            .trim()
            .toUpperCase();

        const coincide = 
            !codigoBuscado ||
            codigoMenu.includes(codigoBuscado); // Includes permite encontrar coincidencias parciales

        fila.style.display = coincide? "" : "none";

        if (coincide) {
            encontrados++;
        }
    });

    mostrarResultadoBusquedaAyuda(codigoBuscado, encontrados);
}


function mostrarResultadoBusquedaAyuda( // Informa cuando la búsqueda no encuentra ayudas, sin modificar los registros almacenados en la tabla
    codigoBuscado,
    encontrados
) {

    const mensaje =
        document.getElementById(
            "mensajeAyudas"
        );

    if (!mensaje) {
        return;
    }

    if (
        codigoBuscado &&
        encontrados === 0
    ) {
        mensaje.innerHTML = `
            <i class="fas fa-magnifying-glass me-1"></i>
            No se encontraron ayudas para
            <strong>
                ${escaparHtml(codigoBuscado)}
            </strong>.
        `;

        mensaje.style.display = "block";
        return;
    }

    mensaje.innerHTML = "";
    mensaje.style.display = "none";
}


function limpiarBusquedaAyuda() { //Limpia el código buscado y vuelve a mostrar todas las ayudas cargadas

    const input =
        document.getElementById(
            "buscarCodigoAyuda"
        );

    if (!input) {
        return;
    }

    input.value = "";

    buscarAyudaPorCodigo();

    input.focus();
}

function escaparHtml(valor) {
    // Escapa contenido recibido antes de insertarlo como HTML.

    const elemento = document.createElement("div");

    elemento.textContent = String(valor ?? "");

    return elemento.innerHTML;
}

document
    .getElementById("btnNuevaAyuda")
    ?.addEventListener(
        "click",
        mostrarFormularioAyuda
    );

document
    .getElementById("btnCancelarAyuda")
    ?.addEventListener(
        "click",
        ocultarFormularioAyuda
    );

document
    .getElementById("btnGuardarAyuda")
    ?.addEventListener(
        "click",
        guardarAyuda
    );


function mostrarFormularioAyuda() {
    // Abre el formulario para registrar una nueva ayuda
    
    const panel = document.getElementById("panelFormularioAyuda");
    const codigoInput = document.getElementById("codigoMenuAyuda");

    
    if (!panel) {
        return;
    }

    
    panel.style.display = "block";

    codigoInput?.focus();
}


function ocultarFormularioAyuda() {
    //Cierra el formulario y restablece sus valores para evitar conservar datos de una edición anterior.
    const panel = document.getElementById("panelFormularioAyuda");

    
    if (!panel) {
        return;
    }

    
    limpiarFormularioAyuda();

    
    panel.style.display = "none";
}


function limpiarFormularioAyuda() {
    // Elimina el ID  de edición. limpia los campos  y restaura el bóton Guardar.

   const codigoInput = document.getElementById("codigoMenuAyuda");
    const btnGuardar = document.getElementById("btnGuardarAyuda");

    if (codigoInput) {
    codigoInput.readOnly = false; // Al salir de una edición, el codigo vuelve a estar disponible para un nuevo registro
    }

    if (btnGuardar) {
    btnGuardar.innerHTML = `
        <i class="fas fa-save me-1"></i>
        Guardar
    `;
    }
    const idInput = document.getElementById("ayudaId");

    if (idInput) {
    idInput.value = "";
    }

    const campos = [
        "codigoMenuAyuda",
        "moduloAyuda",
        "tituloAyuda",
        "descripcionAyuda",
        "objetivoAyuda",
        "procesoAyuda",
        "consejosAyuda"
    ];

    campos.forEach(campoId => {
        const campo = document.getElementById(
            campoId
        );

        if (campo) {
            campo.value = "";
        }
    });

    const error = document.getElementById("errorFormularioAyuda");

    if (error) {
        error.innerHTML = "";
        error.style.display = "none";
    }
}


function convertirLineasEnLista(texto) {
    // Convierte el contenido escrito línea por línea  en el arreglo que se almacena como proceso o recomendación
    return String(texto || "")
        .split("\n")
        .map(linea => linea.trim())
        .filter(Boolean);
}


function mostrarErrorAyuda(mensaje) {
 // Muestra los errores del formulario utilizando texto escapando para evitar insertar contenido HTML no controlado
    const error = document.getElementById("errorFormularioAyuda");

    if (!error) {
        return;
    }

    error.innerHTML = `
        <i class="fas fa-triangle-exclamation me-1"></i>
        ${escaparHtml(mensaje)}
    `;

    error.style.display = "block";
}


function guardarAyuda() {
    // Crea o actualiza una ayuda
    const codigoInput = document.getElementById("codigoMenuAyuda");
    const idInput = document.getElementById("ayudaId");
    const moduloInput = document.getElementById("moduloAyuda");
    const tituloInput = document.getElementById("tituloAyuda");
    const descripcionInput = document.getElementById("descripcionAyuda");
    const objetivoInput = document.getElementById("objetivoAyuda");
    const procesoInput = document.getElementById("procesoAyuda");
    const consejosInput = document.getElementById("consejosAyuda");
    const btnGuardar = document.getElementById("btnGuardarAyuda");

    if (
        !codigoInput ||
        !moduloInput ||
        !tituloInput ||
        !btnGuardar
    ) {
        return;
    }

    const ayudaId = Number(idInput?.value || 0);  // El ID determina si la operación corresponde a creación o edición

    const codigoMenu = codigoInput
        .value
        .trim()
        .toUpperCase();

    const modulo = moduloInput
        .value
        .trim();

    const titulo = tituloInput
        .value
        .trim();

    const descripcion = descripcionInput?.value.trim() || "";
    const objetivo = objetivoInput?.value.trim() || "";
    
    //Proceso y consejos se envían como listas, no como texto continuo.
    const proceso = convertirLineasEnLista( procesoInput?.value);
    const consejos = convertirLineasEnLista(consejosInput?.value);

    
    if (!codigoMenu) { // Si existe un ID se modifica el registro actual
        mostrarErrorAyuda(
            "Ingrese el código del menú."
        );

        codigoInput.focus();
        return;
    }

    if (!modulo) {
        mostrarErrorAyuda(
            "Ingrese el módulo."
        );

        moduloInput.focus();
        return;
    }

    if (!titulo) {
        mostrarErrorAyuda(
            "Ingrese el título."
        );

        tituloInput.focus();
        return;
    }
    
    btnGuardar.disabled = true; // Evita enviar el formulario más de una vez mientras se procesa la solicitud

    fetch(
        `/configurapp/guardar_ayuda/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ // Recarga la tabla para mostrar inmediamente los cambios realizados.
                id: ayudaId || null,
                codigo_menu: codigoMenu,
                modulo,
                titulo,
                descripcion,
                objetivo,
                proceso,
                consejos
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

            if (
                !response.ok ||
                data.ok !== true
            ) {
                mostrarErrorAyuda(
                    data.error ||
                    "No se pudo guardar la ayuda."
                );

                return;
            }


            limpiarFormularioAyuda();

            document.getElementById(
                "panelFormularioAyuda"
            ).style.display = "none";

            
            listarAyudas();

            
            console.log( 
                "Ayuda guardada:",
                data.ayuda
            );
        })

    
        .catch(error => {
            console.error(
                "Error guardando ayuda:",
                error
            );

            mostrarErrorAyuda(
                "No se pudo completar la comunicación con el servidor."
            );
        })

        .finally(() => {
            btnGuardar.disabled = false;
        });
}

function editarAyuda(ayudaId) {
 // Carga en el mismo formulario los datos de una ayuda existente y cambia la interfaz al modo de edición
    
    const panel = document.getElementById("panelFormularioAyuda");
    const idInput = document.getElementById("ayudaId");
    const codigoInput = document.getElementById("codigoMenuAyuda");
    const moduloInput = document.getElementById("moduloAyuda");
    const tituloInput = document.getElementById("tituloAyuda");
    const descripcionInput = document.getElementById("descripcionAyuda");
    const objetivoInput = document.getElementById("objetivoAyuda");
    const procesoInput = document.getElementById("procesoAyuda");
    const consejosInput = document.getElementById("consejosAyuda");
    const btnGuardar = document.getElementById("btnGuardarAyuda");


    const ayuda = ayudasCargadas.find( // Recupera el registro desde los datos ya cargados, sin consultar nuevamente el server.
        item => Number(item.id) === Number(ayudaId)
    );

    if (!ayuda || !panel) {
        return;
    }

    
    limpiarFormularioAyuda();

    
    idInput.value = ayuda.id;

    codigoInput.value = ayuda.codigo_menu;
    moduloInput.value = ayuda.modulo;
    tituloInput.value = ayuda.titulo;
    descripcionInput.value = ayuda.descripcion || "";
    objetivoInput.value = ayuda.objetivo || "";

    procesoInput.value = Array.isArray( // Convierte las listas almacenadas nuevamente a texto línea por línea para editarlas.
        ayuda.proceso
    )
        ? ayuda.proceso.join("\n")
        : "";

    consejosInput.value = Array.isArray(
        ayuda.consejos
    )
        ? ayuda.consejos.join("\n")
        : "";


    codigoInput.readOnly = true; // Durante la edición el código del menú permanece bloquedao

    btnGuardar.innerHTML = `
        <i class="fas fa-save me-1"></i>
        Guardar cambios
    `;

    panel.style.display = "block";

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    tituloInput.focus();
}


async function eliminarAyuda(
    // Elimina una ayuda después de solicitar confirmación 
    // La operación utiliza el ID  para identificar exactamente el registro
    event,
    ayudaId
) {

    
    const botonEliminar =
        event?.currentTarget || null;


    event?.preventDefault();
    event?.stopPropagation();

    const ayuda = ayudasCargadas.find( // Recupera los datos del registro para mostrar su título en la confirmación
        item =>
            Number(item.id) ===
            Number(ayudaId)
    );

    if (!ayuda) {
        mostrarErrorAyuda(
            "No se pudo identificar la ayuda seleccionada."
        );

        return;
    }

    
    const confirmado = // Confirmar la eliminación definitiva del menú
        await mostrarConfirmacion({
            titulo:
                "Eliminar ayuda",

            mensaje:
                `¿Desea eliminar la ayuda "${ayuda.titulo}"?`,

            advertencia:
                "Esta acción no se puede deshacer.",

            textoConfirmar:
                "Eliminar",

            textoCancelar:
                "Cancelar"
        });

    if (!confirmado) {
        return;
    }

    
    if (botonEliminar) {
        botonEliminar.disabled = true;
    }

    
    fetch(
        `/configurapp/eliminar_ayuda/?company=${encodeURIComponent(companyKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
                id: ayudaId
            })
        }
    )

        
        .then(async response => {
            const data =
                await response.json();

            return {
                response,
                data
            };
        })

        .then(({ response, data }) => {

    
            if (
                !response.ok ||
                data.ok !== true
            ) {
                throw new Error(
                    data.error ||
                    "No se pudo eliminar la ayuda."
                );
            }

            
            const idFormulario = Number(document.getElementById("ayudaId")?.value || 0);

            if (
                idFormulario ===
                Number(ayudaId)
            ) {
                ocultarFormularioAyuda();
            }

            
            return listarAyudas(); // Reconstruye la tabla únicamente después de confirmar la eliminación en el servidor
        })

        .then(() => {

        
            mostrarToast({
                tipo:
                    "success",

                titulo:
                    "Ayuda eliminada",

                mensaje:
                    "La ayuda fue eliminada correctamente.",

                duracion:
                    4000
            });
        })

        .catch(error => {
            console.error(
                "Error eliminando ayuda:",
                error
            );

            mostrarToast({
                tipo:
                    "error",

                titulo:
                    "No se pudo eliminar",

                mensaje:
                    error.message ||
                    "No se pudo eliminar la ayuda.",

                duracion:
                    7000
            });

            if (botonEliminar) {
                botonEliminar.disabled =
                    false;
            }
        });
}


