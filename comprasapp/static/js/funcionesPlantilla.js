//GLOBALES
let grancontrib = "N"
let rimpe = "N"
let contribEsp = "N"
let retIva = "N"
let retFte = "N"
let nombreProveedor = ""
let proceso = ""
let user = localStorage.getItem('username');

document.addEventListener("DOMContentLoaded", function (event) {
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
        source: "/comprasapp/cargarProveedores/",
        minLength: 3,
        select: function (event, ui) {
            $("#codProveedor").val(ui.item.codigo).trigger("change");
            //Ejecuta change siempre que su definicion este con jquery ($("#ct_grupo y no dom (document.getElementById("codProveedor").addEventListener)
        }
    });
});

//Si usuario deja en blanco nombre proveedor se inicializa codigo y todo lo relacionado (checks iva fte, items retenciones)
$("input[id='nomProveedor']").blur(function (e) {
    if (this.value.trim() == '') {
        $("#codProveedor").val('').trigger("change");
        alert("No ha seleccionado proveedor!")
    }
    else {
        // si modifica y se identifica diferencia con nombre original con existencia de codigo se setea nombre original 
        if (this.value.trim() != nombreProveedor && $("input[id='codProveedor']").val() != '') {
            this.value = nombreProveedor
        }
    }
});

async function validarExistencia(codigo) {

    if (!codigo) return;

    codigo = codigo.toUpperCase()

    try {
        let response = await fetch(`../consultarExistencia/?validador=codplantilla&codigo=${codigo}`);
        let data = await response.json();
        const inputCodigo = document.getElementById("codPlantilla");
        //valido el ok del retorno
        if (!response.ok) {
            inputCodigo.value = "";
            inputCodigo.focus();
            alert("Error en respuesta - " + data.error + "; Comunique a sistemas")
            return false;
        }
        else {
            if (data.existe == 1) {
                inputCodigo.value = "";
                inputCodigo.focus();
                alert("Codigo de plantilla ya existe!")
                return false;
            }
        }
    } catch (error) {
        inputCodigo.value = "";
        inputCodigo.focus();
        alert("ValidarExistencia - " + error + "; Comunique a sistemas")
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
            alert("No ha seleccionado tipo ");
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
        let response = await fetch(`/comprasapp/consultarRegistro/?entidad=proveedor&codigo=${codigo}`);
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

//GUARDO REGISTRO
document.getElementById("form-plantilla").addEventListener("submit", function (event) {

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
    //checks tipo 
    if (!$("input[id='checkTipoB']").is(":checked") && !$("input[id='checkTipoS']").is(":checked")) {
        alert("No ha seleccionado tipo")
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
        if (validarExistencia($("input[id='codPlantilla']").val()) == false) { return }
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

    //en creación pasa automaticamente al capturar campos de form, pero en update esta disabled y no pasa automaticamente, se opta por enviar manualmente
    const codigo = $("input[id='codPlantilla']").val();

    const otrosDatos = {
        "codProveedor": codProveedor,
        "porcenIva": porcenIva,
        "porcenFte": porcenFte,
        "user": user,
        "codigo": codigo.toUpperCase(),
        "iva": iva,
        "fuente": fuente
    }


    const jsonData = {};
    //CAPTURO DEMAS DATOS DE FOURMULARIO
    const formulario = document.querySelector("#form-plantilla")
    const datosformulario = new FormData(formulario)
    datosformulario.forEach((value, key) => {
        jsonData[key] = value;
    });

    //ENVIO DATOS
    fetch("/comprasapp/guardarPlantilla/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
        },
        body: JSON.stringify({ otrosDatos: otrosDatos, forma: jsonData }),
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

//ELIMINO REGISTRO
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
        const response = await fetch(`/comprasapp/eliminarPlantilla/?codigo=${codigo}&proceso=P`, {
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