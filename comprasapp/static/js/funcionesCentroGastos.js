//js para template de CRUD de centro de gastos (centroGastos.html)
document.addEventListener("DOMContentLoaded", function (event) {
    ck = sessionStorage.getItem('company_key');
});

//Clic boton editar y eliminar de subcentros 
document.getElementById("listSubcentroG_body").addEventListener("click", async function (e) {
    e.preventDefault();
    const row = e.target.closest("tr");
    const inputCta = row.querySelector(".cuenta");
    const inputSecgrp = row.querySelector(".secgrp");
    const btnEdicion = row.querySelector("a");
    if (e.target.closest(".btnEditar")) {
        //activo controles
        inputCta.removeAttribute("disabled");
        inputSecgrp.removeAttribute("disabled");
        //oculto boton
        btnEdicion.setAttribute("hidden", "true")
    }
    if (e.target.closest(".btnEliminar")) { //elimina fila
        console.log("Eliminar subcentro")
        codSubgrupo = inputSecgrp.value.trim();
        if (await validarExistencia(codSubgrupo, "plantillaPeriodicaCtb") == true) { //Si no esta usado en plantilla periodica ctb deja eliminar
            if (confirm(`¿Eliminar fila?`)) {
                row.remove();
            }
        }
    }
}
)

//Cambia de cuenta: Valida existencia y trae nombre, en conjunto con validacion de duplicidad
document.getElementById("listSubcentroG_body").addEventListener("change", function (e) {
    console.log("listSubcentroG_body change")
    if (e.target.classList.contains("cuenta")) {
        console.log("CAMBIO EN CAMPO CUENTA")
        //Capturo controles a usar: numero de fila y celda de nombre de cuenta
        const fila = e.target.closest("tr"); //Objeto fila contiene todo los contoles que estan en ella
        const tabla = fila.parentNode; //capturo elemento padre
        const indice = Array.from(tabla.children).indexOf(fila);
        const inputNombreCta = fila.querySelector(".nombreCta");
        const numCta = e.target.value.trim();
        //Restablezco color alertas
        inputNombreCta.style.color = "black";
        e.target.style.color = "black";

        if (!numCta) {
            inputNombreCta.textContent = "SE DEBE ESPECIFICAR UNA CUENTA CONTABLE";
            inputNombreCta.style.color = "red";
            e.target.focus();
            return;
        }

        //Valido Duplicidaa
        if (validarDuplicidad(numCta, indice + 1, "cuenta")) {
            alert("Cuenta duplicada");
            inputNombreCta.textContent = "CUENTA CONTABLE DUPLICADA";
            inputNombreCta.style.color = "red";
            e.target.style.color = "red";
            e.target.focus();
            return;
        }
    }
})

//Valida duplicidad de cuenta y codigo de subgrupo
function validarDuplicidad(dato, fila, tipoDato) {
    tabla = document.getElementById("listSubcentrosG");
    var rows = tabla.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
        if (tipoDato == "cuenta") {
            var datoCelda = rows[i].querySelector(".cuenta").value;
        }
        if (tipoDato == "codigo") {
            var datoCelda = rows[i].querySelector(".secgrp").value;
        }

        if (i != fila && dato == datoCelda) {
            console.log("Indice ", i)
            return true;
        }
    }
    return false;
}

//funcion autocomplete de cuenta contable se ejecutará al tomar foco en input con class cuenta (input en tabla y en cabecera para nuevo item)
$(function () {
    $(document).on("focus", ".cuenta", function () {
        if (!$(this).data("ui-autocomplete")) { //bandera que ya se esta ejecutando autocomplete, se controla sobrecarga, dato interno propio de la fx autocomplete
            $(this).autocomplete({
                source: `/comprasapp/cargarCuentasCtb?company=${ck}`,
                minLength: 5,
                select: function (event, ui) {
                    //Buscamos fila donde se esta ejecutando el focus en caso de ejecucuion en tabla
                    let fila = $(this).closest("tr");
                    if (fila.length == 0) {
                        //se está ejecutando en control de nuevo item, no en tabla
                        $("#nomCuenta").val(ui.item.nombre);
                    }
                    else {
                        //Se esta ejecutando en tabla
                        fila.find(".nombreCta").text(ui.item.nombre);
                    }
                    $(this).val(ui.item.numero).trigger("change");
                    return false;
                }
            });
        }
    });
});

//En Create, valida existencia de centro de gastos
$("input[id='codGastos']").focusout(async function (e) {
    console.log("pierde foco codgastos: " + this.value.trim())
    if (this.value.trim() != '' && document.getElementById("proceso").value == 'C') {
        if (await validarExistencia(this.value.trim(), "centrogastos") == false) {
            this.value = null;
            this.focus();
        }
    }
})

//VALIDA EXISTENCIA DE CODIGO DE SUBGRUPO A AGREGAR
document.getElementById('subgrupo').addEventListener('focusout', function (e) {
    document.getElementById('btnAgregar').disabled = true;
    if (this.value != '') {
        if (validarDuplicidad(this.value, 0, "codigo")) {
            alert("YA EXISTE CÓDIGO DE SUBGRUPO");
            this.value = ""
            this.focus();
        }
        else {
            if ($("#ctaContable").val() != '' && $("#nomCuenta").val() != '') {
                document.getElementById('btnAgregar').disabled = false;
            }
        }
    }
})

//Campo cuenta contable para agregar: al perder el foco si no selecciono de combo, valida existencia y trae nombre de cuenta
document.getElementById('ctaContable').addEventListener('blur', function (e) {
    document.getElementById('btnAgregar').disabled = true
    if (this.value != '') {
        if (validarDuplicidad(this.value, 0, "cuenta")) {
            alert("CUENTA YA SE ENCUENTRA ASIGNADA");
            this.value = ""
            $("#nomCuenta").val("");
            this.focus();
        }
        else {
            validarCuentaContable(this.value).then(resultado => { //CAPTURA DATO EN VEZ DE OBJETO PROMISE
                nombre = resultado;
                $("#nomCuenta").val(nombre)
                if ($("#ctaContable").val() != '' && $("#nomCuenta").val() != '' && $("#subgrupo").val() != '') {
                    console.log("campos llenos")
                    document.getElementById('btnAgregar').disabled = false;
                }
            })
        }
    }
    else {
        $("#nomCuenta").val("");
    }
})

//VALIDO EXISTENCIA DE CTA CONTABLE, USUARIO NO SELECCIONA DEL AUTOCOMPLETE 
async function validarCuentaContable(numeroCta) {
    console.log("validar")
    try {
        let response = await fetch(`/comprasapp/consultarRegistro/?entidad=cuentaContable&codigo=${numeroCta}&company=${ck}`);
        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.error)
        }

        if (data) {
            nombre = data[0].ct_descripcion.trim();
            return nombre;
        }
        else {
            return null;
        }

    }
    catch (error) {
        alert("validarCuentaContable - " + error + "; Comunique a sistemas")
        return null;
    }
}

//EXISTENCIA DE CODIGO
async function validarExistencia(codigo, entidad) {
    if (!codigo) return false;
    console.log("codigo ", codigo, " entidad ", entidad)
    codigo = codigo.toUpperCase()
    try {
        let response = await fetch(`../consultarExistencia/?validador=${entidad}&codigo=${codigo}&company=${ck}`);
        let data = await response.json();

        //valido el ok del retorno
        if (!response.ok) {
            throw new Error(data.error)
        }
        console.log(data)
        if (data.existe > 0) {
            switch (entidad) {
                case "centrogastos":
                    alert("Codigo de centro de gastos ya existe!")
                    break;
                case "plantillaPeriodicaCtb":
                    alert("Subcentro de gastos usado en plantilla periodica, no se puede eliminar!")
                    break;
            }
            return false;
        }
        return true;

    } catch (error) {
        alert(error + " en ValidarExistencia; Comunique a sistemas")
        return false;
    }
}


//CANCELO PROCESO
document.getElementById('cancelar-btn').addEventListener('click', function () {
    swal.fire({
        title: "¿Desea cancelar proceso?",
        text: "No se guardará registro de centro de gastos",
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
            window.location.href = urlParam;
        }
    })
});

//Agrega nueva linea de subcentro a la tabla de detalle
function agregar() {
    console.log("click agregar")
    //valido campos llenos
    if ($("#nomCuenta").val() == '' || $("#ctaContable").val() == '' || $("#subgrupo").val() == '') {
        alert("Falta un dato para poder agregar, favor revisar")
        return;
    }
    //prefijo de codigo subgrupo = codigo de centro
    numCaracteres = $("input[id='codGastos']").val().length;
    sufijo = $("#subgrupo").val().substring(0, numCaracteres)
    if (sufijo != $("input[id='codGastos']").val()) {
        alert("Código de subgrupo debe empezar por el codigo de centro")
        $("#subgrupo").focus()
        return;
    }
    //captuto datos
    let secgrp = $("#subgrupo").val();
    let cuenta = $("#ctaContable").val();
    let nombre = $("#nomCuenta").val();
    const nuevaFila = `
        <tr>
            <td style="text-align: center">
                <input  type="number" 
                        min="0" 
                        class="secgrp" 
                        id ="secgrp" 
                        style="border: 0;text-align: center" 
                        value="${secgrp}" 
                        disabled/>
            </td>
            
            <td style="text-align:center">
                <input  type="text"
                        class="cuenta"
                        id ="cuenta" 
                        style="border: 0;text-align: center"  
                        maxlength="15"
                        value="${cuenta}"
                        disabled />
            </td>

            <td class="nombreCta">
                ${nombre}
            </td>

            <td>
                  <a class='btn btn-sm btn-primary btnEditar' style='text-decoration: none;' id="editar-btn" title="Editar">
                    <i class="fa-solid fa-edit btnEditar" aria-hidden="true"></i>
                  </a>
            </td>
            <td>
                 <a href="" class='btn btn-sm btn-danger btnEliminar' style='text-decoration: none;' id='eliminar-fila' title="Eliminar" >
                    <i class='fa fa-trash'  aria-hidden="true"></i>
                 </a>
            </td>
        </tr>
    `;
    const tbody = document.getElementById("listSubcentroG_body");
    tbody.insertAdjacentHTML("beforeend", nuevaFila);
    $("#subgrupo").val("");
    $("#ctaContable").val("");
    $("#nomCuenta").val("");
    document.getElementById('btnAgregar').disabled = false;
}

//Guarda registro
document.getElementById("form-cgasto").addEventListener("submit", async function (event) {
    //metodo en caso de cancelarse evento por x razon
    event.preventDefault();
    //validaciones y captura de datos a enviar
    if ($("input[id='codGastos']").val() == '') {
        alert("No se ha ingresado código para el centro de gastos")
        return;
    }
    if ($("input[id='nomGastos']").val() == '') {
        alert("No se ha ingresado nombre para el centro de gastos")
        $("input[id='nomGastos']").focus()
        return;
    }
    //capturo datos de grupo
    const proceso = document.getElementById("proceso").value;
    const codgrupo = $("input[id='codGastos']").val();
    const nomgrupo = $("input[id='nomGastos']").val().trim();
    //capturo datos de subgrupo
    const tfilas = [];
    tabla = document.getElementById("listSubcentroG_body"); //segun si se trabaja con id de tabla o id del body de la tabla, el indice de inicio y recoorido cambia
    var rows = tabla.getElementsByTagName("tr");
    console.log("Filas :" + rows.length)
    if (rows.length == 0) {
        alert("No existe detalle para guardar")
        return;
    }

    for (var i = 0; i < rows.length; i++) {
        const Datos = {};
        fila = i + 1;
        if (rows[i].querySelector(".secgrp").value == '' || rows[i].querySelector(".cuenta").value == '' || rows[i].querySelector(".nombreCta").textContent.trim() == '') {
            alert("En fila " + fila + " de detalle de subgrupo falta definir un valor, favor revisar")
            return
        }
        else {
            //validacion codigo de grupo se prefijo del codigo de subgrupo
            numCaracteres = codgrupo.length;
            secgrp = rows[i].querySelector(".secgrp").value;
            sufijo = secgrp.substring(0, numCaracteres)
            if (sufijo != codgrupo) {
                alert("En fila " + fila + " código de subgrupo debe empezar por el codigo de centro")
                return
            }
            cta = rows[i].querySelector(".cuenta").value;
            Datos["secgrp"] = secgrp;
            Datos["cta"] = cta;
            tfilas.push(Datos);
        }
    }

    fetch("/comprasapp/guardarCentroGastos/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
            "X-Company-Key": ck,
        },
        body: JSON.stringify({ codigo: codgrupo, nombre: nomgrupo.toUpperCase(), filassubgrp: tfilas, proceso: proceso }),
    })
        .then(async response => {
            if (!response.ok) {
                console.log("Error en submit")
                const data = await response.json();
                throw new Error(data.detallerr)
            }
            return response.json();
        })
        .then(data => {
            if (data.status == 'success') {
                sessionStorage.setItem("form_enviado", "true"); //se debe setear al cargar forma nuevamente
                swal.fire({
                    title: "Proceso satisfactorio",
                    text: "Centro de Gastos guardado correctamente",
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
    console.log("bton eliminar")
    document.getElementById('eliminar-btn').addEventListener('click', async function (event) {
        console.log("ejecuta bton eliminar")
        //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION

        event.preventDefault();
        const codigo = document.getElementById('codGastos').value;

        const result = await swal.fire({
            title: "¿Desea eliminar centro de gastos?",
            text: "Se validará su uso en plantillas periódicas, se eliminarán sus asignaciones a proveedores",
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
            const response = await fetch(`/comprasapp/eliminarCentroGastos/?codigo=${codigo}&company=${ck}`, {
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
                    text: "Centro de gastos eliminado correctamente",
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