var factura = [];

$.ajaxSetup({
    beforeSend: function (xhr) {
        var ck = sessionStorage.getItem('company_key');
        if (ck) xhr.setRequestHeader('X-Company-Key', ck);
    }
});

function leerArchivoXML() {
    //mine
    sessionStorage.removeItem("form_enviado");
    // console.log("fomr", sessionStorage.removeItem("form_enviado"))
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
            //var Periodicas = document.getElementById("PeriodicasSwitchCheck");
            var NombreProveedor = document.getElementById("nombreProveedor");
            var RucProveedor = document.getElementById("rucProveedor");
            var FechaEmision = document.getElementById("fechaEmision");
            var CodigoPorcentaje = document.getElementById("codigoPorcentaje");
            var SubTotalSinImpuestos = document.getElementById("subtotalSinImpuestos");
            var Descuento = document.getElementById("totalDescuento");
            var TotalFactura = document.getElementById("importeTotal");
            var FechaIngresoHora = document.getElementById("fechaIngresoHora");
            var SerieFactura = document.getElementById("serieFactura");
            var NumeroFactura = document.getElementById("numeroFactura");
            var AutorizacionSri = document.getElementById("autorizacionSri");


            var textoSinCDATA = textoDecodificado.replace(/<!\[CDATA\[|\]\]>/g, '');

            var textoSinDeclaracion = textoSinCDATA.replace(/<\?xml\s.*?\?>/, '').replace(/<comprobante>\s*<\?xml.*?\?>/s, '<comprobante>');

            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(textoSinDeclaracion, 'text/xml');

            //var PeriodicasisChecked = Periodicas.checked;

            var nombreElemento = xmlDoc.querySelector('factura > infoTributaria > razonSocial');
            NombreProveedor.value = nombreElemento.textContent;

            nombreElemento = xmlDoc.querySelector('infoTributaria ruc');
            RucProveedor.value = nombreElemento.textContent;

            nombreElemento = xmlDoc.querySelector('infoFactura fechaEmision');
            FechaEmision.value = nombreElemento.textContent;

            nombreElemento = xmlDoc.querySelector('infoFactura > totalConImpuestos > totalImpuesto > codigoPorcentaje');
            CodigoPorcentaje.value = nombreElemento.textContent;

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

            FechaIngresoHora.value = formatoFechaHora();

            //Detalle factura
            var tablaSumaIva = "" //"<tr><th>PorcentajeIva</th><th>ValorIva</th></tr>"
            var tablaSumaBase = "" //"<tr><th>PorcentajeIva</th><th>ValorBase</th></tr>"
            var sumasPorTarifa = {}; // Aquí acumulamos
            var tablaTarifa = "<tr><th>BaseImponible</th><th>PorcentajeIva</th><th>ValorIva</th></tr>"; //almacena iva po item
            var tabla = "<tr><th scope='col'>#</th><th scope='col'>Cantidad</th><th scope='col'>Item</th><th scope='col'>Cod. local</th><th scope='col'>Descripción</th><th scope='col'>Precio U.</th><th scope='col'>Descuento</h><th scope='col'>Total</th></tr>";
            factura = xmlDoc.getElementsByTagName("detalle");
            fetchCuentaProv().then(opcionesHTML => {
                //fetchPlantillaProv(); 
                for (var i = 0; i < factura.length; i++) {
                    var cantidad = factura[i].getElementsByTagName("cantidad")[0].textContent;
                    var precioUnitario = factura[i].getElementsByTagName("precioUnitario")[0].textContent;
                    tabla += "<tr>";
                    tablaTarifa += "<tr>";
                    tabla += "<th scope='col'>";
                    tabla += i + 1;
                    tabla += "</th>";
                    tabla += "<th scope='col' id='cantidadc-" + i + "'>";
                    tabla += "<input type='number' min = 1 id='cantidad-" + i + "' value = " + cantidad + " oninput='actualizarPrecio(" + i + ")' style='width: 80px' >";
                    tabla += "</th>";
                    tabla += "<th scope='col'>";
                    tabla += factura[i].getElementsByTagName("codigoPrincipal")[0].textContent;
                    tabla += "</th>";

                    let codigo = factura[i].getElementsByTagName("codigoPrincipal")[0].textContent;

                    // Creamos el input con el codigo local
                    tabla += "<th scope='col'>";
                    let inputId = `validationItemLocal_${i}`;
                    tabla += `<input type="text" 
                                    class="form-control" 
                                    id="${inputId}" 
                                    value="${codigo}" 
                                    style="width: 180px" 
                                    onblur="mapeaItem(this)" required>`;
                    tabla += "</th>";
                    desripItem = factura[i].getElementsByTagName("descripcion")[0].textContent;
                    tabla += "<th scope='col'>";
                    tabla += desripItem;
                    tabla += "</th>";
                    tabla += "<th scope='col' id='precioUnitario-" + i + "'>" + precioUnitario + "</th>";
                    tabla += "<th scope='col'>";
                    tabla += factura[i].getElementsByTagName("descuento")[0].textContent;
                    tabla += "</th>";
                    tabla += "<th scope='col' id='total_${i}'>";
                    tabla += factura[i].getElementsByTagName("precioTotalSinImpuesto")[0].textContent;
                    tabla += "</th>";
                    tarifa = factura[i].getElementsByTagName("tarifa")[0].textContent;
                    valor = parseFloat(factura[i].getElementsByTagName("valor")[0].textContent);
                    base = parseFloat(factura[i].getElementsByTagName("baseImponible")[0].textContent);
                    tabla += "<div class = 'row g-2'  style='text-align: right;'>";
                    if (!sumasPorTarifa[tarifa]) {
                        sumasPorTarifa[tarifa] = { valor: 0, base: 0 };
                    }
                    sumasPorTarifa[tarifa].valor += valor;
                    sumasPorTarifa[tarifa].base += base;

                    // Llenamos el porcentaje del Iva y su valor
                    tablaTarifa += "<th>" + base.toFixed(2) + "</th>";
                    tablaTarifa += "<th>" + tarifa + "</th>";
                    tablaTarifa += "<th>" + valor.toFixed(2) + "</th>";

                    tabla += "</div>";
                    tabla += "</th>";
                    tabla += "</tr>";
                    tablaTarifa += "</tr>";

                }

                document.getElementById("tablaDetalle").innerHTML = tabla;
                document.getElementById("tablaIva").innerHTML = tablaTarifa;

                // Uso después de pintar la tabla
                let inputs = document.querySelectorAll("input[id^='validationItemLocal_']");
                validarSecuencial(inputs);

                function validarSecuencial(inputs, index = 0) {
                    if (index >= inputs.length) return;

                    mapeaItem(inputs[index]).then(() => {
                        setTimeout(() => validarSecuencial(inputs, index + 1), 100); // espera 100ms entre llamadas
                    });
                }

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
                }

                // Mostrar la tabla en el HTML
                document.getElementById("tablaSumaBase").innerHTML = tablaSumaBase;
                document.getElementById("tablaSumaIva").innerHTML = tablaSumaIva;

            }).catch(error => {
                console.error('Error al obtener las opciones del proveedor:', error);
            })
        }
        lector.readAsText(archivo);
    }
}

function fetchCuentaProv() {
    return new Promise((resolve, reject) => {
        var tabla = document.getElementById("tablaDetalle");
        var selectElement = document.getElementById("rucProveedor");
        var rucprov = selectElement.value;
        var ck = sessionStorage.getItem('company_key') || '';

        if (rucprov) {
            $.ajax({
                url: '/comprasapp/cuentaProv/',
                method: 'GET',
                headers: {
                    'X-Company-Key': ck
                },
                data: {
                    'rucprov': rucprov
                },
                success: function (data) {
                    //var nuevoSelect = document.getElementById("selectCuentaProv");
                    var opcionesHTML = '';
                    //var celda = document.createElement('td');
                    if (data.ncuentaprov && data.ncuentaprov.length > 0) {
                        data.ncuentaprov.forEach(function (item) {
                            var option = document.createElement("option");
                            option.value = item.mc_secgrp; // Usa el campo adecuado para el valor
                            option.text = item.ct_cuenta + "  " + item.ct_descripcion; // Usa el campo adecuado para el texto
                            opcionesHTML += "<option value='" + option.value + "'>" + option.text + "</option>";
                        });
                        resolve(opcionesHTML);
                    } else {
                        resolve("<option value=''>No hay datos disponibles</option>");
                        //var option = document.createElement("option");
                        //option.value = '';
                        //option.text = 'No hay datos disponibles';
                        //nuevoSelect.appendChild(option);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Ha ocurrido un error:', error);
                    reject(error)
                }
            });
        } else {
            console.warn('Por favor, seleccione una cuenta.');
            resolve("<option value=''>Por favor, seleccione una cuenta.</option>");
        }
    });
}

function formatoFecha() {
    // Obtiene la fecha actual
    ifecha = new Date()

    // Formatea la fecha en YYYY-MM-DD
    const year = ifecha.getFullYear();
    const month = String(ifecha.getMonth() + 1).padStart(2, '0'); // Los meses son de 0-11
    const day = String(ifecha.getDate()).padStart(2, '0');
    const formattedDate = `${day}/${month}/${year}`;

    // Asigna la fecha formateada al input
    const dateInput = formattedDate // document.getElementById('fecha');
    //dateInput.value = formattedDate;
    return dateInput
};

function formatoFechaHora() {
    // Obtiene la fecha actual
    ifecha = new Date()

    // Formatea la fecha en YYYY-MM-DD
    const year = ifecha.getFullYear();
    const month = String(ifecha.getMonth() + 1).padStart(2, '0'); // Los meses son de 0-11
    const day = String(ifecha.getDate()).padStart(2, '0');
    const hour = String(ifecha.getHours()).padStart(2, '0');
    const min = String(ifecha.getMinutes()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hour}:${min}`;

    // Asigna la fecha formateada al input
    const dateInput = formattedDate // document.getElementById('fecha');
    //dateInput.value = formattedDate;
    return dateInput
};

async function enviarDatosFactura() {
    console.log("inicio enviarDatosFactura ")
    //if (validaDatosFactura() === false) {
    //    return;
    //}

    const result = await validaDatosFactura();
    if (result) {

    } else {
        return;  // Esto devuelve `true` correctamente
    }

    //const periodicas = document.getElementById('PeriodicasSwitchCheck');
    var DescripTemp = document.getElementById("descripcionFactura");
    DescripTemp.value = DescripTemp.value.toUpperCase();

    var datos = {
        //Periodicas : periodicas.checked,
        Compania: sessionStorage.getItem('compania'),
        Agencia: sessionStorage.getItem('agencia'),
        Bodega: sessionStorage.getItem('bodega'),
        Division: "r", //document.getElementById("divisionSelect").value,
        SubTipo: "I", //document.getElementById("subTipoSelect").value,
        Solicitante: document.getElementById("selSolicita").value,
        Usuario: document.getElementById("userName").value,
        RucProveedor: document.getElementById("rucProveedor").value,
        //Plantillas : document.getElementById("PlantillaSelect").value,
        FechaEmision: document.getElementById("fechaEmision").value,
        SubTotalSinImpuestos: document.getElementById("subtotalSinImpuestos").value,
        TotalDescuento: document.getElementById("totalDescuento").value,
        TotalFactura: document.getElementById("importeTotal").value,
        FechaIngresoHora: document.getElementById("fechaIngresoHora").value,
        PlazoPago: document.getElementById("plazoPago").value,
        FactorVenta: document.getElementById("factorVenta").value,
        SerieFactura: document.getElementById("serieFactura").value,
        NumeroFactura: document.getElementById("numeroFactura").value,
        TipoCredito: document.getElementById("tipoCreditoSelect").value,
        AutorizacionSri: document.getElementById("autorizacionSri").value,
        DescripcionFactura: DescripTemp.value,
        OrdenCompra: document.getElementById("ordenCompra").value,

        FechaIngreso: formatoFecha()
    };

    var tabla = document.getElementById("tablaDetalle");
    var tablaTarifa = document.getElementById("tablaIva"); //tabla de porcentaje y valor iva

    // Obtén todas las filas de la tabla
    var filas = tabla.getElementsByTagName("tr");
    var filasIva = tablaTarifa.getElementsByTagName("tr");

    // Crear una matriz para almacenar los datos
    var datosTabla = [];

    // Recorre cada fila (comenzando desde 1 si la primera fila es el encabezado)
    for (var i = 1; i < filas.length; i++) {
        // Obtén todas las celdas de la fila actual
        var celdas = filas[i].getElementsByTagName("th");
        var celdasIva = filasIva[i].getElementsByTagName("th");

        // Crear una submatriz para la fila actual
        var filaDatos = [];
        var cantidadInput = celdas[1].querySelector("input"); // para acceder al input de la columna
        var cantidad = cantidadInput ? cantidadInput.value : ""; // Si no hay input, devuelve ""

        filaDatos.push(cantidad); // Cantidad (0)
        // Suponemos que la tabla tiene 10 columnas: cantidad, item, descripcion, precio, incluye valores de iva por item
        filaDatos.push(celdas[2].innerText);    // Item (1)
        var codigoLocalInput = celdas[3].querySelector("input"); // para acceder al input de la columna
        var codigoLocal = codigoLocalInput ? codigoLocalInput.value : ""; // Si no hay input, devuelve ""
        filaDatos.push(codigoLocal);    // Item local (2)
        filaDatos.push(celdas[4].innerText);    // Descripcion (3)
        filaDatos.push(celdas[5].innerText);    // Precio Unitario (4)
        filaDatos.push(celdas[6].innerText);    // Descuento (5)
        filaDatos.push(celdas[7].innerText);    // Total (6)
        filaDatos.push(celdasIva[1].innerText);    // Porcentaje IVA (7)
        filaDatos.push(celdasIva[2].innerText);    // Valor IVA (8)
        // Agrega la submatriz a la matriz principal
        datosTabla.push(filaDatos);

        var datosFactura = {
            datos: datos,
            datosTabla: datosTabla,

        };
    }

    var ck = sessionStorage.getItem('company_key') || '';

    console.log("Enviar")
    $.ajax({
        url: '/repuestosapp/guardaFacturaRepuestos/',
        method: 'POST',
        headers: {
            'X-Company-Key': ck
        },
        data: JSON.stringify(datosFactura),
        contentType: 'application/json',
        dataType: 'json',
        success: function (data) {
            alert('Datos enviados exitosamente');
            //console.log('Secuencia recibida:', data.nsecuencia); 

            var inputElement = document.getElementById('ordenCompra');
            if (data.nsecuencia !== undefined) {
                inputElement.value = data.nsecuencia;
            } else {
                console.error('La secuencia no se recibió correctamente.');
            }
            document.getElementById('botonGuardar').disabled = true;

            /*mineoctubre*/
            if (data.redirect_url) {
                //Redirige al usuario a la URL devuelta por el servidor
                window.location.href = data.redirect_url;
            } else {
                console.error('No se recibió URL de redirección');
            }
        },
        error: function (xhr, status, error) {
            console.error('Ha ocurrido un error:', error);
        }
    });
}

async function validaExisteFactura() {

    var Cia = String(sessionStorage.getItem('compania'));
    var Agencia = sessionStorage.getItem('agencia');
    var Division = "r"; //document.getElementById("divisionSelect").value;
    var Ruc = document.getElementById("rucProveedor").value;
    var NumeroFactura = document.getElementById("numeroFactura").value;
    var ck = sessionStorage.getItem('company_key') || '';

    try {
        let response = await fetch(`/comprasapp/existe_factura/?NumeroFactura=${NumeroFactura}&Division=${Division}&Agencia=${Agencia}&Cia=${Cia}&Ruc=${Ruc}`,
            { headers: { 'X-Company-Key': ck } }
        );
        let data = await response.json();
        //console.log("Respuesta del servidor:", data);

        if (data.existe === 1) {
            console.log("La factura existe.");
            return true;
        } else {
            console.log("La factura NO existe.");
            return false;
        }
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

async function validaDatosFactura() {

    // Obtén los elementos del formulario
    const selsolicita = document.getElementById('selSolicita');
    const tipocredito = document.getElementById('tipoCreditoSelect')
    const descripcionfactura = document.getElementById('descripcionFactura');
    const plazopago = document.getElementById('plazoPago');
    const factorventa = document.getElementById('factorVenta');
    const factura = document.getElementById('numeroFactura');

    // Validación de campo de texto
    if (validaCodigo() == false) {
        alert('El Código Local no puede estar vacio');
        //selsolicita.focus();
        return false;
    }

    if (selsolicita.selectedIndex == 0) {
        alert('El campo Solicitante es obligatorio.');
        selsolicita.focus();
        return false;
    }

    if (tipocredito.selectedIndex == 0) {
        alert('El campo Tipo Crédito es obligatorio.');
        tipocredito.focus();
        return false;
    }

    if (descripcionfactura.value.trim() === '') {
        alert('El campo Descripción Factura es obligatorio.');
        descripcionfactura.focus();
        return false;
    }

    if (plazopago.value.trim() == 0) {
        alert('El campo Plazo Pago es obligatorio.');
        plazopago.focus();
        return false;
    }

    if (factorventa.value.trim() == 0) {
        alert('El factor de venta es obligatorio.');
        factorventa.focus();
        return false;
    }

    const result = await validaExisteFactura();

    if (result) {
        // Ejecuta el código cuando la factura existe
        alert("La factura ya existe.");
        //factura.focus();
        return false;  // Esto devuelve `false` correctamente a la función que llamó a `miFuncion`
    } else {
        return true;  // Esto devuelve `true` correctamente
    }
    //Si todos los campos requeridos están llenos, puedes proceder con el envío o la acción de guardar
}

function actualizarPrecio(index) {

    var cantidadInput = document.getElementById('cantidad-' + index);
    var cantidad = cantidadInput.value;
    var precioTotal = factura[index].getElementsByTagName("precioTotalSinImpuesto")[0].textContent;
    var descuento = factura[index].getElementsByTagName("descuento")[0].textContent;
    var nuevoPrecioUnitario  = parseFloat(precioTotal) + parseFloat(descuento);
    nuevoPrecioUnitario = nuevoPrecioUnitario / cantidad;

    cantidadInput.value = cantidad;
    document.getElementById('precioUnitario-' + index).textContent = nuevoPrecioUnitario.toFixed(5);

}

async function mapeaItem(input) {
    let codigoIngresado = input.value.trim();
    var ck = sessionStorage.getItem('company_key') || '';

    try {
        let response = await fetch(`/repuestosapp/mapeaItem/?codigo=${codigoIngresado}`,
            { headers: { 'X-Company-Key': ck } }
        );
        let data = await response.json();

        if (data.codigo) {
            input.value = data.codigo;   // devuelve el real de la BD
            desripItem = data.desripItem
            input.classList.remove("is-invalid");
            input.classList.add("is-valid");
        } else {
            input.value = "";            // lo dejas vacío si no existe
            input.classList.remove("is-valid");
            input.classList.add("is-invalid");
        }
    } catch (error) {
        console.error("Error al validar código", error);
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
    }
}
function obtenerSeleccion() {
    // Obtener el elemento select
    var selectElement = document.getElementById("selSolicita");
    var inputElement = document.getElementById("validationTooltipProveedor");

    // Obtener el valor seleccionado, solo como prueba
    var valorSeleccionado = selectElement.value;
    //inputElement.value = valorSeleccionado;

}

function validaCodigo() {
    var tabla = document.getElementById("tablaDetalle");

    // Obtén todas las filas de la tabla
    var filas = tabla.getElementsByTagName("tr");

    // Recorre cada fila (comenzando desde 1 si la primera fila es el encabezado)
    for (var i = 0; i < filas.length - 1; i++) {
        // CREAR AQUI OPCION DE BIENES/SERVICIOS
        const textCodigo = document.getElementById(`validationItemLocal_${i}`);
        if (textCodigo.value == "") {
            return false
        } else {
            return true
        }
    }
}