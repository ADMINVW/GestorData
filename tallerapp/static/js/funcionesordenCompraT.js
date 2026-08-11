//js para template de orden de compra de taller (ordenCompraT.html)
var ordenCompra;
//inicilizar datos
document.addEventListener("DOMContentLoaded", function (event) {
    codAge = document.getElementById("agencia").value;
    ck = sessionStorage.getItem('company_key');
    ordenCompra = 0;
    ivas = 0;
    ivaFactura = 0;
})

//carga datos de archivo xml de factura seleccionada por usuario
function leerArchivoXML() {
    return new Promise((resolve) => {
        //mine
        sessionStorage.removeItem("form_enviado");
        //
        var inputElement = document.getElementById('inputGroupFileFactura');

        if (inputElement.files.length > 0) {
            var archivo = inputElement.files[0];
            var lector = new FileReader();
            lector.onload = function (e) {
                var contenidoXML = e.target.result;

                var elementoTemporal = document.createElement("textarea");
                elementoTemporal.innerHTML = contenidoXML;
                var textoDecodificado = elementoTemporal.value;

                var NombreProveedor = document.getElementById("nombreProveedor");
                var RucProveedor = document.getElementById("rucProveedor");


                var FechaEmision = document.getElementById("fechaEmision");

                var SubTotalSinImpuestos = document.getElementById("subtotalSinImpuestos");
                var Descuento = document.getElementById("totalDescuento");
                var TotalFactura = document.getElementById("importeTotal");
                var SerieFactura = document.getElementById("serieFactura");
                var NumeroFactura = document.getElementById("numeroFactura");
                var AutorizacionSri = document.getElementById("autorizacionSri");


                var textoSinCDATA = textoDecodificado.replace(/<!\[CDATA\[|\]\]>/g, '');

                var textoSinDeclaracion = textoSinCDATA.replace(/<\?xml\s.*?\?>/, '').replace(/<comprobante>\s*<\?xml.*?\?>/s, '<comprobante>');



                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(textoSinDeclaracion, 'text/xml');


                var nombreElemento = xmlDoc.querySelector('infoTributaria ruc');
                if (validarProveedor(nombreElemento.textContent) == false) {
                    resolve(false);
                    return;
                }

                RucProveedor.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('factura > infoTributaria > razonSocial');
                NombreProveedor.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoFactura fechaEmision');
                FechaEmision.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoFactura totalDescuento');
                Descuento.value = nombreElemento.textContent;


                nombreElemento = xmlDoc.querySelector('infoFactura totalSinImpuestos');
                SubTotalSinImpuestos.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoFactura importeTotal');
                TotalFactura.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoTributaria estab');
                SerieFactura.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoTributaria ptoEmi');
                SerieFactura.value = SerieFactura.value + nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoTributaria secuencial');
                NumeroFactura.value = nombreElemento.textContent;

                nombreElemento = xmlDoc.querySelector('infoTributaria claveAcceso');
                AutorizacionSri.value = nombreElemento.textContent;

                if (validaFecha(FechaEmision.value) === false) {
                    alert("Factura no puede ser ingresada: Fecha de emisión del mes anterior o de mas de 5 días");
                    resolve(false);
                    return;
                }

                //mine (Validacion RUC compania activa con ruc de comparador de xml)
                var ck = sessionStorage.getItem('company_key');

                identificacionComprador = xmlDoc.querySelector('infoFactura identificacionComprador');
                if (ck.substring(0, 9) == 'ecuawagen' && identificacionComprador.textContent != '1791765842001') {
                    alert("Factura no corresponde a la compania ")
                    resolve(false);
                    return;
                }
                if (ck.substring(0, 10) == 'germanmoto' && identificacionComprador.textContent != '1792121795001') {
                    alert("Factura no corresponde a la compania")
                    resolve(false);
                    return;
                }


                //Detalle factura
                var tablaSumaIva = "" //"<tr><th>PorcentajeIva</th><th>ValorIva</th></tr>"
                var tablaSumaBase = "" //"<tr><th>PorcentajeIva</th><th>ValorBase</th></tr>"
                var sumasPorTarifa = {}; // Aquí acumulamos
                var tablaTarifa = "<tr><th>BaseImponible</th><th>PorcentajeIva</th><th>ValorIva</th></tr>"; //almacena iva po item

                var tabla = "";
                factura = xmlDoc.getElementsByTagName("detalle");
                for (var i = 0; i < factura.length; i++) {
                    var descripcion = factura[i].getElementsByTagName("descripcion")[0].textContent;
                    console.log(descripcion)
                    var precioTotal = factura[i].getElementsByTagName("precioTotalSinImpuesto")[0].textContent;
                    var cantidad = factura[i].getElementsByTagName("cantidad")[0].textContent;
                    tabla += "<tr>";
                    tablaTarifa += "<tr>";
                    tabla += "<th scope='col'>";
                    tabla += i + 1;
                    tabla += "</th>";
                    tabla += "<th scope='col' id='cantidadc-" + i + "'>";
                    tabla += "<input type='number' disabled id='cantidad" + i + "' value = '" + cantidad + "' class='cantidad'>";
                    tabla += "</th>";
                    tabla += "<th scope='col'>";
                    tabla += factura[i].getElementsByTagName("codigoPrincipal")[0].textContent;
                    tabla += "</th>";
                    tabla += "<th scope='col'>";
                    tabla += "<input type='text' disabled id='descrip" + i + "' value = '" + descripcion + "' style='width: 300px;text-transform: uppercase;' class='descripcion'>";
                    tabla += "</th>";
                    tabla += "<th scope='col' id='total_${i}'>";
                    tabla += "<input type='number' step='0.01' disabled id='precioTotal-" + i + "' value = " + precioTotal + " style='width: 100px' class='precioTotal'>";
                    tabla += "</th>";
                    tabla += "<th scope='col'>";
                    tabla += `<a title = "Editar" class='btn btn-sm btn-success btnEditar' style='text-decoration: none;' id="editar-fila">
                    <i class='fa-solid fa-edit'></i></a> `
                    tabla += "</th>";

                    tabla += "<th scope='col'>";
                    tabla += `<a title="Eliminar"  class='btn btn-sm btn-danger btnEliminar' style='text-decoration: none;' id='eliminar-fila' >
                    <i class='fa fa-trash' aria-hidden="true"></i></a>`
                    tabla += "</th>";

                    tarifa = factura[i].getElementsByTagName("tarifa")[0].textContent;
                    valor = parseFloat(factura[i].getElementsByTagName("valor")[0].textContent);
                    base = parseFloat(factura[i].getElementsByTagName("baseImponible")[0].textContent);
                    if (!sumasPorTarifa[tarifa]) {
                        sumasPorTarifa[tarifa] = { valor: 0, base: 0 };
                    }
                    sumasPorTarifa[tarifa].valor += valor;
                    sumasPorTarifa[tarifa].base += base;

                    // Llenamos el porcentaje del Iva y su valor
                    tablaTarifa += "<th>" + base.toFixed(2) + "</th>";
                    tablaTarifa += "<th>" + tarifa + "</th>";
                    tablaTarifa += "<th>" + valor.toFixed(2) + "</th>";

                    tabla += "</tr>";
                    tablaTarifa += "</tr>";

                }

                document.getElementById("bodytablaDetalle").innerHTML = tabla;

                document.getElementById("tablaIva").innerHTML = tablaTarifa;
                for (var t in sumasPorTarifa) {
                    // Sumamamos los valores de base e Iva por tarifa y los agrupo, para mostrar en la factura
                    tablaSumaBase += "<tr>";
                    tablaSumaBase += "<th scope='col' class='columna-impuesto' >SUBTOTAL  " + parseInt(t) + "%</th>";
                    tablaSumaBase += "<th scope='col' class='columna-valor'>" + sumasPorTarifa[t].base.toFixed(2) + "</th>";
                    tablaSumaBase += "</tr>";

                    tablaSumaIva += "<tr>";
                    tablaSumaIva += "<th scope='col' class='columna-impuesto'>IVA " + parseInt(t) + "%</th>";
                    tablaSumaIva += "<th scope='col' class='columna-valor'>" + sumasPorTarifa[t].valor.toFixed(2) + "</th>";
                    tablaSumaIva += "</tr>";
                    //Capturo iva, de ser mas de un iva abajo valido con alerta e inicializo variables    
                    ivaFactura = parseInt(t);
                }

                // Mostrar la tabla en el HTML
                document.getElementById("bodytablaSumaBase").innerHTML = tablaSumaBase;
                document.getElementById("bodytablaSumaIva").innerHTML = tablaSumaIva;
                ivas = Object.keys(sumasPorTarifa).length;
                console.log("ivas ", ivas)
                if (ivas > 1) {
                    console.log("ENTRA")
                    ivaFactura = null;
                    alert("Factura registra mas de una % de iva en detalle, comunique a sistemas")
                    resolve(false);
                    return;
                }
                else {
                    document.getElementById("ivaFactura").value = ivaFactura;
                }
                resolve(true);
            }
            lector.readAsText(archivo);
        }
    });
}

//evento change de nombre de archivo xml, para manejo de validaciones, segun respuesta habilito o no el boton guardar
document.getElementById("inputGroupFileFactura").addEventListener("change", async function () {
    console.log("change xml")
    const ok = await leerArchivoXML();
    document.getElementById('guardar-btn').disabled = !ok;
})


//obtiene datos de orden a procesar
document.getElementById("obtener-btn").addEventListener("click", async function () {
    numero = document.getElementById("numeroCompra").value
    console.log("obtenerOrden " + numero)
    if (!numero) {
        alert("Ingrese numero de orden de comprar a procesar!")
        return;
    }

    if (ordenCompra > 0) {
        if (confirm("¿Desea cambiar de orden? Se perderán los datos cargados.")) {
            window.location.replace(window.location.pathname);//recargo pagina (se limpia todos los datos)
        }
        return;
    }
    inicilizar()
    try {
        ordenCompra = 0;
        let response = await fetch(`/tallerapp/obtenerOrden/?numero=${numero}&company=${ck}&agencia=${codAge}`);
        let data = await response.json();
        if (!response.ok) {
            alert("Error en respuesta - " + data.error + "; Comunique a sistemas")
        }
        else {
            console.log(data)
            if (data) {
                if (data.estado == "T") {
                    alert("obtenerOrden - Orden de Compra ya se encuentra procesada!")
                }
                else {
                    if (data.tipo != 'T' && data.tipo != 'R') { //validacion tipo (solo trabajos terceros 'T' y repuestos externos 'R')
                        alert("obtenerOrden - Tipo de orden de compra no corresponde a este proceso")
                    }
                    else {
                        document.getElementById("ordenTaller").value = data.ordenTaller
                        document.getElementById("clienteOrden").value = data.clienteOrden.trim()
                        document.getElementById("asesorOrden").value = data.asesorOrden.trim()
                        document.getElementById("codigoProveedor").value = data.codProveedor
                        document.getElementById("rucProveedor").value = data.rucProveedor.trim()
                        document.getElementById("nombreProveedor").value = data.nomProveedor.trim()
                        document.getElementById("selSolicita").value = data.solicitante; //seleccinar item de selec en js
                        document.getElementById("subTipoSelect").value = data.tipo; //seleccinar item de selec en js

                        document.getElementById("descripcionFactura").value = data.descripcion.trim()
                        document.getElementById("porcenRecargo").value = data.recargo

                        document.getElementById('numeroCompra').readonly = true;
                        document.getElementById("numeroCompra").setAttribute("readonly", true);
                        let btn = document.getElementById("obtener-btn");
                        btn.textContent = "Cambiar orden";
                        ordenCompra = numero;
                        if (data.estadoOrdenT != 'A') { //validacion estado de orden de taller
                            alert("obtenerOrden - Orden de Taller relacionada ya no se encuentra activa")
                        }
                        else {
                            document.getElementById('inputGroupFileFactura').disabled = false;
                        }
                    }

                }
            }
        }
    } catch (error) {
        alert("obtenerOrden - " + error + "; Comunique a sistemas")
    }
});


//limpiar datos de orden
function inicilizar() {
    document.getElementById("ordenTaller").value = ""
    document.getElementById("clienteOrden").value = ""
    document.getElementById("asesorOrden").value = ""
    document.getElementById("codigoProveedor").value = ""
    document.getElementById("rucProveedor").value = ""
    document.getElementById("nombreProveedor").value = ""
    document.getElementById("subTipoSelect").selectedIndex = 0
    document.getElementById("selSolicita").selectedIndex = 0
    document.getElementById("selSolicita").selectedIndex = 0
    document.getElementById("descripcionFactura").value = ""
    document.getElementById("porcenRecargo").value = ""
}

//validar proveedor de orden con proveedor de factura
function validarProveedor(provFactura) {
    provOrden = document.getElementById("rucProveedor").value;
    console.log("provFactura " + provFactura + " provOrden " + provOrden)
    if (provFactura != provOrden) {
        alert("Factura no corresponde a proveedor de orden de compra")
        return false;
    }
    return true;
}

//validacion fecha factura
function validaFecha(fecha) {
    let fechaStr = fecha;

    // Separar día, mes y año
    let partes = fechaStr.split("/");
    let dia = parseInt(partes[0], 10);
    let mes = parseInt(partes[1], 10) - 1; // Los meses en JS van de 0 a 11
    let anio = parseInt(partes[2], 10);

    // Crear objeto Date
    let fechaFactura = new Date(anio, mes, dia);

    // Fecha actual (sin horas para evitar errores)
    let hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular diferencia en milisegundos
    let diferenciaMs = hoy - fechaFactura;

    // Convertir a días
    let diferenciaDias = diferenciaMs / (1000 * 60 * 60 * 24);

    //validacion 5 días
    if (diferenciaDias <= 5 && diferenciaDias >= 0) {
        //validacion mes anterior
        mesActual = hoy.getMonth()
        if (mes != mesActual) {
            return false;
        }
        return true;  // La fecha es válida
    } else {
        return false; // La fecha no es válida
    }
};

//Clic boton editar y eliminar detalle factura
document.getElementById("tablaDetalle").addEventListener("click", async function (e) {
    const row = e.target.closest("tr");
    const inputDescrip = row.querySelector(".descripcion");
    const inputValor = row.querySelector(".precioTotal");
    const btnEdicion = row.querySelector("a");
    if (e.target.closest(".btnEditar")) {
        e.preventDefault()
        //activo controles
        inputDescrip.removeAttribute("disabled");
        inputValor.removeAttribute("disabled");
        //oculto boton
        btnEdicion.setAttribute("hidden", "true")
    }
    if (e.target.closest(".btnEliminar")) { //elimina fila
        e.preventDefault()
        const miTabla = document.getElementById("tablaDetalle");
        const filasDatos = miTabla.tBodies[0].rows.length; //numero de filas
        if (filasDatos == 1) {
            alert("No se puede eliminar, detalle debe tener al menos un item")
            return
        }
        else {
            if (confirm(`¿Eliminar fila?`)) {
                //recalculo, valor de fila eliminada se suma a la primera fila que este en su momento tras eliminar
                valorFinal = 0
                valorEliminado = inputValor.value
                console.log("valorEliminado " + valorEliminado)
                if (valorEliminado != "") {
                    valorEliminado = parseFloat(valorEliminado) //capturo valor eliminado siempre tenga valor, caso contrario se mantiene con valor 0 
                }
                else {
                    valorEliminado = 0
                }
                row.remove(); //elimino

                rowsDetalle = this.getElementsByTagName("tr") //capturo todas las filas que quedan
                console.log(rowsDetalle)
                valorInicial = rowsDetalle[1].querySelector(".precioTotal").value

                console.log("valorInicial " + valorInicial)
                if (valorInicial != "") {
                    valorInicial = parseFloat(valorInicial)
                }
                else {
                    valorInicial = 0
                }
                console.log("valorInicial " + valorInicial + " valorEliminado " + valorEliminado)
                valorFinal = valorInicial + valorEliminado
                rowsDetalle[1].querySelector(".precioTotal").value = Number.parseFloat(valorFinal).toFixed(2);
            }
        }
    }
}
)

//Procesar (Guardar orden)
document.getElementById("form-ocompraTaller").addEventListener("submit", function (event) {
    //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION
    event.preventDefault();
    numero = document.getElementById("numeroCompra").value
    if (!numero) {
        alert("Ingrese numero de orden de comprar a procesar!")
        return;
    }
    //validaciones select
    if (validaDatosSelect() == false) {
        return;
    }
    //carga de detalle, de paso validacion de valor detalle - valor factura
    let tabla;
    let valDetalle = 0;
    const filas = [];
    tabla = document.getElementById("bodytablaDetalle");
    var rows = tabla.getElementsByTagName("tr");
    if (rows.length == 0) {
        alert("Detalle no puede estar vacio")
        return;
    }

    for (var i = 0; i < rows.length; i++) {

        const Datos = {};
        Datos["cantidad"] = rows[i].querySelector(".cantidad").value;
        Datos["descripcion"] = rows[i].querySelector(".descripcion").value.trim();
        if (Datos["descripcion"] == "") {
            alert("Descripción de item de detalle no puede estar vacio")
            return;
        }

        Datos["precioTotal"] = parseFloat(rows[i].querySelector(".precioTotal").value.trim());
        if (Datos["precioTotal"] != "") {
            valDetalle = valDetalle + parseFloat(Datos["precioTotal"])
        }
        else {
            alert("Total de item de detalle no puede estar vacio")
            return;
        }
        filas.push(Datos)
    }

    let subtotal = document.getElementById("subtotalSinImpuestos").value;
    console.log("subtotal " + subtotal + " valDetalle " + valDetalle)
    if (Number.parseFloat(valDetalle).toFixed(2) != subtotal) {
        alert("Suma total de detalle no coincide con subtotal de factura, se deberá corregir")
        return;
    }

    //CAPTURO DEMAS DATOS DE FORMULARIO
    const jsonData = {};
    const formulario = document.querySelector("#form-ocompraTaller")
    const datosformulario = new FormData(formulario)

    datosformulario.forEach((value, key) => {
        jsonData[key] = value;
    });



    // ENVIO DATOS A VISTA
    //ENVIO DATOS
    fetch(`/tallerapp/guardarOrdenCompra/?Agencia=${codAge}&company=${ck}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Company-Key': ck,
        },
        body: JSON.stringify({ tabla: filas, forma: jsonData }),

    })
        .then(async response => {

            const data = await response.json();   // <-- SOLO UNA VEZ

            console.log("Respuesta:", data);
            if (!response.ok) {
                throw new Error(data.detallerr)
            }

            return data;
        })
        .then(data => {
            console.log("data ", data)
            if (data.status == 'success') {
                sessionStorage.setItem("form_enviado", "true"); //se debe setear al cargar forma nuevamente
                if (data.redirect_url) {
                    window.location.href = data.redirect_url; // Redirige al usuario a la URL devuelta por la vista
                }
                else {
                    throw new Error('No se recibió URL de redirección');
                }
            }
        })
        .catch(error => {
            console.error('Error en submit :', error);
            swal.fire("Oops!", "Ocurrio un error (" + error.message + "); De requetir detalle comunique a sistemas ", "error");
        })
});

//valida select de forma, los demas campos trabajan con la propiedad required
function validaDatosSelect() {
    console.log("validaDatosSelect")
    // Obtén los elementos del formulario
    const subtiposelect = document.getElementById('subTipoSelect');
    const selsolicita = document.getElementById('selSolicita');
    const tipocredito = document.getElementById('tipoCreditoSelect')

    // Valida subtipo
    if (subtiposelect.selectedIndex == 0 || subtiposelect.value.trim() == '') {
        alert('Debe seleccionar TIPO DE COMPRA');
        subtiposelect.focus();
        return false;
    }

    // Validación de campo de texto
    if (selsolicita.selectedIndex == 0 || selsolicita.value.trim() == '') {
        alert('Debe seleccionar SOLICITANTE');
        selsolicita.focus();
        return false;
    }

    if (tipocredito.selectedIndex == 0 || tipocredito.value.trim() == '') {
        alert('Debe seleccionar TIPO CRÉDITO');
        tipocredito.focus();
        return false;
    }
}
