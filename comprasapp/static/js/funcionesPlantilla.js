//js para template de CRUD de plantilla periodica (plantillaPeriodica.html)
//GLOBALES


let grancontrib = "N"
let rimpe = "N"
let contribEsp = "N"
let retIva = "N"
let retFte = "N"
let nombreProveedor = ""
let proceso = ""
let user = sessionStorage.getItem('username');
let nombreCentroG = ""

document.addEventListener("DOMContentLoaded", function (event) {
    ck = sessionStorage.getItem('company_key');
    proceso = document.getElementById("proceso").value;
    //Proceso UPDATE inicializo controles
    if (proceso == 'U') {
        //datos proveedor
        let proveedor = document.getElementById("codProveedor").value;
        consultarProveedor(proveedor)
    }
    localStorage.removeItem("form_enviado");
});

//funciones ejecutadas al cargar el DOM
$(function () {
    $("#nomProveedor").autocomplete({
        source: `/comprasapp/cargarProveedores?company=${ck}`,
        minLength: 3,
        select: function (event, ui) {
            $("#codProveedor").val(ui.item.codigo).trigger("change");
            //Ejecuta change siempre que su definicion este con jquery ($("#ct_grupo y no dom (document.getElementById("codProveedor").addEventListener)
        }
    });

    $("#nomCentroG").autocomplete({
        source: `/comprasapp/cargarCentroGastos?company=${ck}`,
        minLength: 3,
        select: function (event, ui) {
            $("#codCentroG").val(ui.item.codigo).trigger("change");
            nombreCentroG = ui.item.value;
            console.log("nombreCentroG", nombreCentroG)
            //Ejecuta change siempre que su definicion este con jquery ($("#codProveedor").on("change") y no dom (document.getElementById("codProveedor").addEventListener)
        }
    });

    sumarPorcentajes();

});

//Si usuario deja en blanco nombre proveedor se inicializa codigo y todo lo relacionado (checks iva fte, items retenciones)
$("input[id='nomProveedor']").blur(function (e) {
    if (this.value.trim() == '') {
        $("#codProveedor").val('').trigger("change");
        //alert("No ha seleccionado proveedor!")
    }
    else {
        // si modifica y se identifica diferencia con nombre original con existencia de codigo se setea nombre original 
        if (this.value.trim() != nombreProveedor && $("input[id='codProveedor']").val() != '') {
            this.value = nombreProveedor
        }
    }
});

async function validarExistencia(codigo) {
    if (!codigo) return false;

    codigo = codigo.toUpperCase()
    try {
        let response = await fetch(`../consultarExistencia/?validador=codplantilla&codigo=${codigo}&company=${ck}`);
        let data = await response.json();

        //valido el ok del retorno
        if (!response.ok) {
            throw new Error(data.error)
        }

        if (data.existe > 0) {
            alert("Codigo de plantilla ya existe!")
            return false;
        }
        return true;

    } catch (error) {
        alert(error + " en ValidarExistencia; Comunique a sistemas")
        return false;
    }
};

//Check Bienes (solo uno puede activarse)
$("input[id='checkTipoB']").change(function (e) {
    if ($(this).is(":checked")) {
        $("input[id='checkTipoS']").prop("checked", false);
        $("input[id='tipo']").val("B")
    }
});

//Check Servicios (solo uno puede activarse)
$("input[id='checkTipoS']").change(function (e) {
    if ($(this).is(":checked")) {
        $("input[id='checkTipoB']").prop("checked", false);
        $("input[id='tipo']").val("S")
    }
});

//Check Fte, activa o desactiva demas controles  
$("input[id='checkFte']").change(function (e) {
    if ($(this).is(":checked")) {
        //validacion tipo items
        if (!$("input[id='checkTipoS']").is(":checked") && !$("input[id='checkTipoB']").is(":checked")) {
            $(this).prop("checked", false);
            alert("No ha seleccionado tipo de items ");
            return;
        }

        //validacion Proveedor
        if ($("input[id='codProveedor']").val() == '') {
            $(this).prop("checked", false);
            alert("No ha seleccionado proveedor");
            return;
        }
        else {
            if (retFte == "N") {
                $(this).prop("checked", false);
                alert("Proveedor no retiene Fuente");
                return;
            }
        }

        document.getElementById('selectFte').disabled = false;
    }
    else {
        document.getElementById("selectFte").selectedIndex = 0
        document.getElementById("selectFte").disabled = true;
        document.getElementById("porcenFte").value = ""
    }
});

//Check Iva, activa o desactiva demas controles
$("input[id='checkIva']").change(function (e) {
    if ($(this).is(":checked")) {
        //validacion tipo items
        if (!$("input[id='checkTipoS']").is(":checked") && !$("input[id='checkTipoB']").is(":checked")) {
            $(this).prop("checked", false);
            alert("No ha seleccionado tipo ");
            return;
        }
        //validacion proveedor
        if ($("input[id='codProveedor']").val() == '') {
            $(this).prop("checked", false);
            alert("No ha seleccionado proveedor");
            return;
        }
        else {
            if (retIva == "N") {
                $(this).prop("checked", false);
                alert("Proveedor no retiene Iva");
                return;
            }
        }

        document.getElementById('selectIva').disabled = false;
    }
    else {
        document.getElementById("selectIva").selectedIndex = 0
        document.getElementById("selectIva").disabled = true;
        document.getElementById("porcenIva").value = ""
    }
});
//Cargo dato de % Fte
$("select[id='selectFte']").change(function (e) {
    //inicializo 
    document.getElementById("porcenFte").value = ""
    if (this.selectedIndex > 0) {
        let codigo = this.options[this.selectedIndex].value;
        let tipoItem = this.options[this.selectedIndex].dataset.titem;
        //validaciones proveedor
        if (validacionesProv(codigo, "F") == false) {
            this.selectedIndex = 0
            return;
        }
        //validacion tipo item
        if ($("input[id='checkTipoS']").is(":checked") && tipoItem == 'B') {
            alert("Retención no aplica para tipo SERVICIOS")
            this.selectedIndex = 0
            return;
        }
        if ($("input[id='checkTipoB']").is(":checked") && tipoItem == 'S') {
            alert("Retención no aplica para tipo BIENES")
            this.selectedIndex = 0
            return;
        }
        let porcentaje = this.options[this.selectedIndex].dataset.porcentaje;
        document.getElementById("porcenFte").value = porcentaje;
    }
});
//Cargo dato de % Iva
$("select[id='selectIva']").change(function (e) {
    //inicializo
    document.getElementById("porcenIva").value = ""
    if (this.selectedIndex > 0) {
        let porcentaje = this.options[this.selectedIndex].dataset.porcentaje;
        let tipoItem = this.options[this.selectedIndex].dataset.titem;
        console.log(tipoItem)
        //validaciones proveedor
        if (validacionesProv(porcentaje, "I") == false) {
            this.selectedIndex = 0
            return;
        }
        //validacion tipo item
        if ($("input[id='checkTipoS']").is(":checked") && tipoItem == 'B') {
            alert("Retención no aplica para tipo SERVICIOS")
            this.selectedIndex = 0
            return;
        }
        if ($("input[id='checkTipoB']").is(":checked") && tipoItem == 'S') {
            alert("Retención no aplica para tipo BIENES")
            this.selectedIndex = 0
            return;
        }
        document.getElementById("porcenIva").value = porcentaje;
    }
});

//Cargo identidad credito
$("select[id='selectCredito']").change(function (e) {
    document.getElementById("codCredito").value = ""
    if (this.selectedIndex > 0) {
        document.getElementById("codCredito").value = this.options[this.selectedIndex].value;
    }
});

//Cargo tipo comprobante 
$("select[id='selectComprob']").change(function (e) {
    document.getElementById("codComprob").value = ""
    if (this.selectedIndex > 0) {
        document.getElementById("codComprob").value = this.options[this.selectedIndex].value;
    }
});

//si cambia proveedor, inicializo checks y traigo datos de proveedor
$("#codProveedor").on("change", function () {
    inicializarChecks()
    consultarProveedor(this.value);
});

function inicializarChecks() {
    //Separó de consultarProveedor por proceso update que cargo valores en plantilla, pero llamo fx previa al cargar pagina y se limpiaban datos cargados
    $("input[id='granContrib']").prop("checked", false);
    $("input[id='rimpe']").prop("checked", false);
    $("input[id='contribEsp']").prop("checked", false);
    $("input[id='retIva']").prop("checked", false);
    $("input[id='retFte']").prop("checked", false);
    $("input[id='checkFte']").prop("checked", false).trigger("change");
    $("input[id='checkIva']").prop("checked", false).trigger("change");
}

//Consulta datos de proveedor para validaciones de items de retenciones
async function consultarProveedor(codigo) {

    if (!codigo) return;

    try {
        let response = await fetch(`/comprasapp/consultarRegistro/?entidad=proveedor&codigo=${codigo}&company=${ck}`);
        let data = await response.json();

        if (!response.ok) {
            alert("Error en respuesta - " + data.error + "; Comunique a sistemas")
        }
        else {
            if (data) {
                nombreProveedor = data[0].pv_nombre.trim()
                grancontrib = data[0].pv_aut_sri.trim();
                rimpe = data[0].pv_region.trim();
                contribEsp = data[0].pv_contesp.trim();
                retIva = data[0].pv_autimp.trim();
                retFte = data[0].pv_serie.trim();

                //seteo
                if (grancontrib == "S") {
                    $("input[id='granContrib']").prop("checked", true);
                }
                if (rimpe == "E" || rimpe == "G") {
                    $("input[id='rimpe']").prop("checked", true);
                }
                if (contribEsp == "S") {
                    $("input[id='contribEsp']").prop("checked", true);
                }
                if (retIva == "S") {
                    $("input[id='retIva']").prop("checked", true);
                }
                if (retFte == "S") {
                    $("input[id='retFte']").prop("checked", true);
                }
            }
            else {
                //En teoria no debería entrar porque si carga codigo mediante autocomplete, siempre debería retornar registro
                alert(data.error)
            }
        }

    } catch (error) {
        alert("consultarProveedor - " + error + "; Comunique a sistemas")
    }
};


//Al perder foco nombre plantilla, si deja vacio y existe codigo (proceso update no modificable) retorna nombre vigente
$("input[id='nomPlantilla']").blur(async function (e) {
    codigo = document.getElementById("codPlantilla").value;
    if (codigo && (this.value.trim() == '') && proceso == 'U') {
        const nombre = await consultarNombre(codigo, 'plantillaPeriodica');
        $(this).val(nombre);
    }
});


//Al perder foco codigo plantilla en proceso de creación valida existencia
$("input[id='codPlantilla']").blur(async function (e) {
    console.log("ejecuta")
    if (this.value.trim() != '' && proceso == 'C') {
        console.log("entra con proceso")
        if (await validarExistencia(this.value.trim()) == false) {
            this.value = null;
            this.focus();
        }
    }
});


//CANCELO PROCESO
document.getElementById('cancelar-btn').addEventListener('click', function () {
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
            let url = this.getAttribute("data-url"); //Obtengo nombre vista a direccionar añadida como atributo en el boton
            let urlParam = `${url}?company=` + ck;
            //window.location.href = "{% url 'mimenu' %}"; //no se puede usar en js extreno funcionario en scrpt dentro de hmtl
            window.location.href = urlParam;
        }
    })
});

//GUARDO REGISTRO
document.getElementById("form-plantilla").addEventListener("submit", async function (event) {

    //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION
    event.preventDefault();

    //validaciones
    //Proveedor
    if ($("input[id='codProveedor']").val() == '') {
        alert("No ha seleccionado proveedor!")
        return;
    }
    //checks activados sin item seleccionado, no se valida si no estan activados ninguno pues hay plantillas que no generan retencion
    if ($("input[id='checkIva']").is(":checked") && $("input[id='porcenIva']").val() == '') {
        alert("Activó check de retención IVA y no ha seleccionado item de retención")
        return;
    }
    if ($("input[id='checkFte']").is(":checked") && $("input[id='porcenFte']").val() == '') {
        alert("Activó check de retención FUENTE y no ha seleccionado item de retención")
        return;
    }
    //checks tipo de items
    if (!$("input[id='checkTipoB']").is(":checked") && !$("input[id='checkTipoS']").is(":checked")) {
        alert("No ha seleccionado tipo de item")
        return;
    }
    //escenario cambio de tipo B o S y posterior a la seleccion de item de retencion
    const tipo = $("input[id='tipo']").val();
    let tipoItem = "";

    const selectIva = document.getElementById('selectIva');
    tipoItem = selectIva.options[selectIva.selectedIndex].dataset.titem;

    if (tipo == "B" && tipoItem == "S") {
        alert("Retención Iva no aplica para tipo BIENES")
        return;
    }
    if (tipo == "S" && tipoItem == "B") {
        alert("Retención Iva no aplica para tipo SERVICIOS")
        return;
    }

    const selectFte = document.getElementById('selectFte');
    tipoItem = selectFte.options[selectFte.selectedIndex].dataset.titem;

    if (tipo == "S" && tipoItem == "B") {
        alert("Retención Fuente no aplica para tipo SERVICIOS")
        return;
    }
    if (tipo == "B" && tipoItem == "S") {
        alert("Retención Fuente no aplica para tipo BIENES")
        return;
    }
    //En creacion valido nuevamente existencia de codigo 
    if (proceso == 'C') {
        if (await validarExistencia($("input[id='codPlantilla']").val()) == false) {
            return
        }
    }

    //valor total de porcentajes asignados en detalle contable
    const total = document.getElementById("sumporcentaje").value
    console.log(total)
    if (total != 100) {
        alert("Valor total de asignación debe sumar el 100% ")
        return;
    }


    //CONTROL TRANSACCION ENVIADA
    if (localStorage.getItem("form_enviado")) {
        swal.fire("Oops!", "Plantilla ya registrada!", "warning");
        document.getElementById("guardar-btn").disabled = true;
        return
    }

    //Capturo datos de controles disabled (automaticamente no los captura al enviar)
    const codProveedor = $("input[id='codProveedor']").val();

    let iva = true
    const porcenIva = $("input[id='porcenIva']").val();
    if (porcenIva == '') { iva = false }

    let fuente = true
    const porcenFte = $("input[id='porcenFte']").val();
    if (porcenFte == '') { fuente = false }

    //en creación pasa automaticamente al capturar campos de form, pero en update esta disabled y no pasa automaticamente, se debe enviar manualmente
    const codigo = $("input[id='codPlantilla']").val();

    const otrosDatos = {
        "codProveedor": codProveedor,
        "porcenIva": porcenIva,
        "porcenFte": porcenFte,
        "user": user,
        "codigo": codigo.toUpperCase(),
        "iva": iva,
        "fuente": fuente,
        "codGrupo": document.getElementById("codCentroG").value
    }


    const jsonData = {};
    //CAPTURO DEMAS DATOS DE FOURMULARIO
    const formulario = document.querySelector("#form-plantilla")
    const datosformulario = new FormData(formulario)
    datosformulario.forEach((value, key) => {
        jsonData[key] = value;
    });

    //capturo datos de seccion contable

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

    //ENVIO DATOS
    fetch("/comprasapp/guardarPlantilla/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
            "X-Company-Key": ck,
        },
        body: JSON.stringify({ otrosDatos: otrosDatos, forma: jsonData, filassubgrp: tfilas }),
    })

        .then(async response => {
            if (!response.ok) {
                console.log("response no ok") //Errores (tabla no existe, no ejecutó inserción o actualización
                const data = await response.json();
                throw new Error(data.detallerr)
            }
            return response.json();
        })
        .then(data => {

            if (data.status == 'success') {
                localStorage.setItem("form_enviado", "true"); //se debe setear al cargar forma nuevamente
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
            } else {
                console.log("status no ok")
                throw new Error(data.detallerr);
            }
        })
        .catch(error => {
            console.error('Error en submit :', error);
            swal.fire("Oops!", "Ocurrio un error (" + error.message + "); comunique a sistemas", "error");
        });
});

//ELIMINO REGISTRO: SE VALIDA EXISTENCIA DE BOTON PORQUE EN ESCENARIO CREACIÓN NO EXISTE
const eliminar = document.getElementById('eliminar-btn')
if (eliminar) {
    document.getElementById('eliminar-btn').addEventListener('click', async function (event) {
        //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION

        event.preventDefault();
        const codigo = document.getElementById('codPlantilla').value;

        const result = await swal.fire({
            title: "¿Desea eliminar plantilla de orden periodica?",
            text: "Se eliminará también su plantilla de asignaciones contables",
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
            const response = await fetch(`/comprasapp/eliminarPlantilla/?codigo=${codigo}&company=${ck}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Company-Key': ck,

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
            //console.error('Error en submit :', error);
            swal.fire("Oops!", "Ocurrio un error (" + error.message + "); comunique a sistemas", "error");
        }
    })
}


//Funciones sobre datos contables, agregadas (27-10) se agrupa en su solo template
//Carga listado de Subgrupo, llamado cuando cambia codigo de grupo
const cargarSubgrupos = async () => {
    try {
        //Parametros
        const codigo = document.getElementById("codCentroG").value;
        const codprov = document.getElementById("codProveedor").value;
        let response;
        //revisar no se envía company
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
                                    <input type="number" step="any" min="0" class="porcentaje" onclick="this.select()"
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
        inputPorcen.select();
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
    console.log("parametros ", codigo, " + ", proveedor)
    //Parametros vacios retorna
    if ((!codigo) || (!proveedor))
        return false;
    try {
        const inputCentro = document.getElementById("nomCentroG");
        let response = await fetch(`../consultarExistencia/?validador=codgrupo&codigo=${codigo}&condicion=${proveedor}&company=${ck}`);
        let data = await response.json();
        //valido el ok del retorno
        if (!response.ok) {
            throw new Error(data.error)
        }
        else {
            if (data.existe == 0) {
                return false;
            }
        }
        return true;
    } catch (error) {
        inputCentro.focus();
        alert(error + " en validarCentroProveedor; Comunique a sistemas")
        return false;
    }
}

$("#codCentroG").on("change", async function () {
    proveedor = document.getElementById("codProveedor").value;
    if (!proveedor) {
        console.log("Entra")
        alert("Se debe seleccionar primero proveedor2")
        document.getElementById("nomCentroG").value = null
        document.getElementById("codCentroG").value = null
        return
    }

    //campo con valor se valida asignación a proveedor
    if ($(this).val() != '') {
        validado = await (validarCentroProveedor($(this).val(), proveedor));
        if (validado) {
            //se carga tabla de subgrupos
            cargarSubgrupos()
        }
        else {
            swal.fire({
                title: "Centro de gastos no asignada a proveedor ¿Desea asignarla?",
                text: "Se registrarán automaticamente subgrupos usados en plantilla a proveedor",
                icon: "warning",
                showCancelButton: true,
                showConfirmButton: true,
                confirmButtonText: "Si",
                cancelButtonText: "No",
                confirmButtonColor: "#DD6B55"
            }).then((result) => {
                if (result.isConfirmed) {
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
            })



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
        nombreCentroG = ''
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

//Obtiene nombre del centro de gastos o plantilla
async function consultarNombre(codigo, entidad) {

    if (!codigo || !entidad) return null;

    try {
        //revisar no se envía company
        let response = await fetch(`/comprasapp/consultarRegistro/?entidad=${entidad}&codigo=${codigo}`);
        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.error)
        }

        if (data) {
            if (entidad == "centroGastos") {
                nombre = data[0].ct_grupo.trim();
                return nombre
            }
            if (entidad == "plantillaPeriodica") {
                return data[0].pc_concepto.trim();
            }
        }
        else {
            return null
        }


    } catch (error) {
        alert(error + " en consultarNombre; Comunique a sistemas")
        return null
    }
};

//pierde foco nombre centro gastos, si deja vacio y existe codigo retorna nombre del codigo
$("input[id='nomCentroG']").blur(async function (e) {
    proveedor = document.getElementById("codProveedor").value;
    codigo = document.getElementById("codCentroG").value;

    //Sin proveedor y codigo de grupo, inicializo campo (escenario creación)
    if (!proveedor && !codigo) {
        document.getElementById("nomCentroG").value = null
    }
    else {
        //Si campo con valor y codigo con valor, seteo campo con nombre de codigo
        if (this.value.trim() == '') {
            if (codigo) {
                console.log("entra con codigo")
                const nombre = await consultarNombre(codigo, 'centroGastos');
                $(this).val(nombre);
            }
            else {
                $("#codCentroG").val('').trigger("change");
            }
        }
        else {
            console.log("entra con valor ", nombreCentroG)
            if (codigo && this.value.trim() != nombreCentroG) {
                console.log("entra con valor1")
                $(this).val(nombreCentroG);
            }
        }
    }
});



