//funciones ejecutadas al cargar el DOM
$(function () {
    $("#nomCentroG").autocomplete({
        source: "/comprasapp/cargarCentroGastos/",
        minLength: 3,
        select: function (event, ui) {
            $("#codCentroG").val(ui.item.codigo).trigger("change");
            //Ejecuta change siempre que su definicion este con jquery ($("#codProveedor").on("change") y no dom (document.getElementById("codProveedor").addEventListener)
        }
    });

    sumarPorcentajes();
});


document.addEventListener("DOMContentLoaded", function (event) {
    localStorage.removeItem("form_enviado");
});


//carga listado de Subgrupo, llamado cuando cambia codigo de grupo
const cargarSubgrupos = async () => {
    try {
        //Parametros
        const codigo = document.getElementById("codCentroG").value;
        const codprov = document.getElementById("codProveedor").value;
        let response;

        response = await fetch(`/comprasapp/consultarSubcentrosGastos/${codigo}/${codprov}`);
        const data = await response.json();
        let content = ``;
        data.subgruposGastos.forEach((subgrupo) => {
            content += `
                <tr>
                    <td>${subgrupo.mc_codpro == null ? "<a id='asignar-btn' class='btn btn-sm btn-success btnAsignar' >Asignar</a>" : ""}</td>
                    <td>${subgrupo.ct_secgrp}</td>
                    <td>${subgrupo.ct_cuenta}</td>
                    <td>${subgrupo.ct_descripcion}</td>
                    <td style="text-align: center; white-space: nowrap; overflow-x: auto">
                                    <input type="number" step="any" min="0" class="porcentaje"  
                                    ${subgrupo.mc_codpro == null ? "disabled" : "value = 0"}
                                    style="border: 0;text-align: center"  />
                                  
                    </td>
                </tr>
            `;
        });
        listCentroG_body.innerHTML = content;
        document.getElementById('tableCentroG').removeAttribute('hidden');
        document.getElementById('divAlerta').setAttribute('hidden', '');
        document.getElementById("sumporcentaje").value = 0 //inicializo total %
    } catch (error) {
        alert(error);
    }
}


//Se ejecuta eventos sobre el elemento padre del input porcentaje y boton asignar por creación dinamica posterior aL DOM, que no captura evento directamente sobre el contrl
//Mientras digita va sumando automaticamente
document.getElementById("listCentroG_body").addEventListener("input", function (e) {
    if (e.target.classList.contains("porcentaje")) {
        sumarPorcentajes();
    }
});

//Activa input de ingreso de porcentaje
document.getElementById("listCentroG_body").addEventListener("click", function (e) { //el evento capturado en el objeto e identifica (del conjunto) el control especifico sobre el que se ejecutó el evento
    e.preventDefault(); //usual en clic de button pa prevenir algun evento incontrolable
    //Seleecciono fila del boton y activo su input
    const row = e.target.closest("tr");
    const inputPorcen = row.querySelector(".porcentaje");
    if (e.target.classList.contains("btnAsignar")) {
        inputPorcen.removeAttribute('disabled');
        inputPorcen.focus();
        //Cambio diseño de boton 
        e.target.classList.remove("btn-success", "btnAsignar")
        e.target.classList.add("btn-danger", "btnCancelarAsig")
        e.target.textContent = "Quitar Asignacion"
    }
    else if ((e.target.classList.contains("btnCancelarAsig"))) {
        inputPorcen.value = '';
        inputPorcen.setAttribute('disabled', '');
        //Cambio diseño de boton 
        e.target.classList.remove("btn-danger", "btnCancelarAsig")
        e.target.classList.add("btn-success", "btnAsignar")
        e.target.textContent = "Asignar"
    }
    sumarPorcentajes();
});


async function validarCentroProveedor(codigo, proveedor) {
    //Parametros vacios retorna
    if ((!codigo) || (!proveedor))
        return false;
    try {
        console.log("validarCentroProveedor")
        let response = await fetch(`../../consultarExistencia/?validador=codgrupo&codigo=${codigo}&condicion=${proveedor}`);
        let data = await response.json();
        const inputCentro = document.getElementById("nomCentroG");
        //valido el ok del retorno
        if (!response.ok) {
            inputCentro.focus();
            alert("Error en respuesta - " + data.error + "; Comunique a sistemas")
            return false;
        }
        else {
            if (data.existe == 0) {
                alert("Centro de gastos no asignada a proveedor!")
                return false;
            }
        }

        return true;
    } catch (error) {
        inputCentro.focus();
        alert("ValidarExistencia - " + error + "; Comunique a sistemas")
        return false;
    }
}

$("#codCentroG").on("change", async function () {
    //campo con valor se valida asignación a proveedor
    if ($(this).val() != '') {
        proveedor = document.getElementById("codProveedor").value;
        validado = await (validarCentroProveedor($(this).val(), proveedor));
        if (validado) {
            //se carga tabla de subgrupos
            cargarSubgrupos()
        }
        else {
            //se inicializa controles y se pone alerta constante
            document.getElementById("nomCentroG").focus();
            //vacío contenido de tabla y oculto en caso que este llena y desplegada, se inicializa campo de suma de %s
            listCentroG_body.innerHTML = ''
            document.getElementById('tableCentroG').setAttribute('hidden', '');
            document.getElementById("sumporcentaje").value = 0
            //despliego alerta constante de no asignación 
            const divalerta = document.getElementById('divAlerta');
            if (divalerta !== null) {
                divalerta.removeAttribute('hidden');
                divalerta.textContent = "Centro de gastos no asignada a proveedor!"
            }
        }
    }
    //campo vacio se inicializa controles
    else {
        //oculto div alerta en caso de estar desplegada
        const divalerta = document.getElementById('divAlerta');
        if (divalerta !== null) {
            divalerta.setAttribute('hidden', '');
        }
        //vacío contenido de tabla en caso que este llena y campo de suma de %s
        listCentroG_body.innerHTML = ''
        document.getElementById("sumporcentaje").value = 0
    }
});

//Sumar porcentajes de lista subgrupo
function sumarPorcentajes() {
    var grid = document.getElementById("listCentroG");
    var rows = grid.getElementsByTagName("tr");
    var sum = 0;

    for (var i = 1; i < rows.length - 1; i++) {
        var cells = rows[i].querySelector(".porcentaje").value;
        if (cells.length === 0) {
            cells = 0;
        }
        sum += parseFloat(cells);
        //validación total asignación, despliego alerta o quito en caso q este desplegada
        const divalerta = document.getElementById('divAlerta');
        if (sum > 100) {
            if (divalerta !== null) {
                divalerta.removeAttribute('hidden');
                divalerta.textContent = "El total de asignación no pueder ser mayor al 100%"
            }
        }
        else {
            if (divalerta !== null) {
                divalerta.setAttribute('hidden', '');
                divalerta.textContent = ""
            }
        }

    }
    document.getElementById("sumporcentaje").value = sum;
};

//pierde foco nombre centro gastos
$("input[id='nomCentroG']").blur(function (e) {
    if (this.value.trim() == '') {
        console.log("change nombre")
        $("#codCentroG").val('').trigger("change");
    }
    else {
        consultarCentroGastos($("input[id='codCentroG']").val())
    }
});

async function consultarCentroGastos(codigo) {

    if (!codigo) return;

    try {
        let response = await fetch(`/comprasapp/consultarRegistro/?entidad=centroGastos&codigo=${codigo}`);
        let data = await response.json();

        if (!response.ok) {
            alert("Error en respuesta - " + data.error + "; Comunique a sistemas")
        }
        else {
            if (data) {
                nomCentroG = data[0].ct_grupo.trim()
                //seteo control
                if (nomCentroG) {
                    $("input[id='nomCentroG']").val(nomCentroG);
                }
            }
            else {
                alert(data.error)
            }
        }

    } catch (error) {
        alert("consultarCentroGastos - " + error + "; Comunique a sistemas")
    }
};

//CANCELO PROCESO
document.getElementById('cancelar-btn').addEventListener('click', function () {
    let url = this.getAttribute("data-url"); //Obtengo nombre vista a direccionar añadida como atributo en el boton
    let urlParam = `${url}`;
    swal.fire({
        title: "¿Desea cancelar proceso?",
        text: "No se guardará registro de plantilla",
        icon: "warning",
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: "Si",
        cancelButtonText: "No",
        confirmButtonColor: "#DD6B55"
    }).then((result) => {
        if (result.isConfirmed) {
            //window.location.href = "{% url 'mimenu' %}"; //no se puede usar en js extreno funcionario en scrpt dentro de hmtl
            window.location.href = urlParam;
        }
    })
});

//GUARDO FORMULARIO
document.getElementById("form-plantillaCtb").addEventListener("submit", function (event) {
    //cancela en caso de caer en validaciones
    event.preventDefault();
    //validaciones
    //valor total de porcentaje
    const total = document.getElementById("sumporcentaje").value
    console.log(total)
    if (total != 100) {
        alert("Valor total de asignación debe sumar el 100% ")
        return;
    }

    //capturo datos a enviar
    const tfilas = [];
    tabla = document.getElementById("listCentroG");
    var rows = tabla.getElementsByTagName("tr");
    for (var i = 1; i < rows.length - 1; i++) {
        const Datos = {};
        if (rows[i].querySelector(".porcentaje").disabled == false && rows[i].querySelector(".porcentaje").value > 0) {
            valorPorcen = rows[i].querySelector(".porcentaje").value;
            if (valorPorcen != null) {
                celda = rows[i].cells[1];
                Datos["subgrupo"] = celda.innerText;
                Datos["porcentaje"] = valorPorcen;
                tfilas.push(Datos);
            }
        }
    }
    //como estan con propiedad disabled lo capturo manualmente y no mediante formulario
    const otrosDatos = {
        "codProveedor": document.getElementById("codProveedor").value,
        "codPlantilla": document.getElementById("codPlantilla").value,
        "codGrupo": document.getElementById("codCentroG").value
    }

    //envío datos
    fetch("/comprasapp/guardarPlantillaCtb/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
        },
        body: JSON.stringify({ otrosDatos: otrosDatos, filassubgrp: tfilas }),
    })

        .then(async response => {
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detallerr)
            }
            return response.json();
        })
        .then(data => {
            if (data.status == "success") {
                localStorage.setItem("form_enviado", "true");
                swal.fire({
                    title: "Proceso satisfactorio",
                    text: "Plantilla guardada correctamente",
                    icon: "success",
                    confirmButtonText: "Aceptar",
                }).then(() => {
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url; // Redirige al usuario a la URL devuelta por la vista
                    }
                    else {
                        throw new Error('No se recibió URL de redirección');
                    }
                })
            }
            else {
                throw new Error(data.detallerr);
            }
        })
        .catch(error => {
            console.error('Error en submit :', error);
            swal.fire("Oops!", "Ocurrio un error (" + error.message + "); comunique a sistemas", "error");
        });
});

//ELIMINO REGISTRO
document.getElementById('eliminar-btn').addEventListener('click', async function (event) {
    //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION

    event.preventDefault();
    const codigo = document.getElementById('codPlantilla').value;

    const result = await swal.fire({
        title: "¿Desea eliminar plantilla contable de orden periodica?",
        text: "Solo se elimina plantilla de asignaciones contables",
        icon: "warning",
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: "Si",
        cancelButtonText: "No",
        confirmButtonColor: "#DD6B55"
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        //envío datos
        const response = await fetch(`/comprasapp/eliminarPlantilla/?codigo=${codigo}&proceso=C`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
            },
            body: JSON.stringify(),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detallerr)
        }
        const data = await response.json();

        if (data.status == "success") {
            localStorage.setItem("form_enviado", "true");
            await swal.fire({
                title: "Proceso satisfactorio",
                text: "Plantilla eliminada correctamente",
                icon: "success",
                confirmButtonText: "Aceptar",
            });

            if (data.redirect_url) {
                window.location.href = data.redirect_url; // Redirige al usuario a la URL devuelta por la vista
            }
            else {
                throw new Error('No se recibió URL de redirección');
            }
        }
        else {
            throw new Error(data.detallerr);
        }
    } catch (error) {
        console.error('Error en submit :', error);
        swal.fire("Oops!", "Ocurrio un error (" + error.message + "); comunique a sistemas", "error");
    }
})