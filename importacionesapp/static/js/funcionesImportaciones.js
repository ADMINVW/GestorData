var factura = [];

$.ajaxSetup({
    beforeSend: function (xhr) {
        var ck = sessionStorage.getItem('company_key');
        if (ck) xhr.setRequestHeader('X-Company-Key', ck);
    }
});

function actualizarEtiquetaCG(fila) {
    var dropdowns = document.querySelectorAll('.cg-dropdown-btn');
    var btn = dropdowns[fila];

    var checks = document.querySelectorAll('[id^="cg-' + fila + '-"]:checked');

    if (btn) {
        btn.textContent = checks.length > 0
            ? checks.length + ' seleccionado(s)'
            : 'Seleccionar C.G.';
    }
}
65
function leerArchivoXML() {
    //mine
    sessionStorage.removeItem("form_enviado");
    console.log("form", sessionStorage.removeItem("form_enviado"))
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

            if (validaFecha(FechaEmision.value) === false) {
                alert("Pasoron 5 días de la fecha de la factura, ya no se la puede ingresar.");
                document.getElementById('botonGuardar').disabled = true;
              }


            //Detalle factura

            var tablaSumaIva = "" //"<tr><th>PorcentajeIva</th><th>ValorIva</th></tr>"
            var tablaSumaBase = "" //"<tr><th>PorcentajeIva</th><th>ValorBase</th></tr>"
            var sumasPorTarifa = {}; // Aquí acumulamos
            var tablaTarifa = "<tr><th>BaseImponible</th><th>PorcentajeIva</th><th>ValorIva</th></tr>"; //almacena iva po item
            var tabla = "<tr><th scope='col'>#</th><th scope='col'>Cantidad</th><th scope='col'>Item</th><th scope='col'>Descripción</th><th scope='col'>Precio U.</th><th scope='col'>Descuento</h><th scope='col'>Total</th><th scope='col'>Centro Gastos</th><th scope='col'>";
            factura = xmlDoc.getElementsByTagName("detalle");
            fetchCuentaProv().then(opcionesHTML => {
                fetchPlantillaProv();
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
                    tabla += "<th scope='col'>";
                    tabla += factura[i].getElementsByTagName("descripcion")[0].textContent;
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
                    if (!sumasPorTarifa[tarifa]) {
                        sumasPorTarifa[tarifa] = { valor: 0, base: 0 };
                    }
                    sumasPorTarifa[tarifa].valor += valor;
                    sumasPorTarifa[tarifa].base += base;

                    // Llenamos el porcentaje del Iva y su valor
                    tablaTarifa += "<th>" + base.toFixed(2) + "</th>";
                    tablaTarifa += "<th>" + tarifa + "</th>";
                    tablaTarifa += "<th>" + valor.toFixed(2) + "</th>";

                    tabla += "<th scope='col'>";
                    tabla += "<div class='dropdown'>";
                    tabla += "  <button class='btn btn-outline-secondary btn-sm dropdown-toggle cg-dropdown-btn' type='button' data-bs-toggle='dropdown' data-bs-auto-close='outside' data-fila='" + i + "'>";
                    tabla += "    Seleccionar C.G.";
                    tabla += "  </button>";
                    tabla += "  <ul class='dropdown-menu p-2' style='min-width:420px; max-height:350px; overflow-y:auto;'>";

                    // Parsear opcionesHTML para extraer value y texto
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = opcionesHTML;
                    var options = tempDiv.querySelectorAll('option');

                    options.forEach(function(opt) {
                        var val = opt.value;
                        var texto = opt.textContent.trim();
                        tabla += "<li class='dropdown-item p-1'>";
                        tabla += "  <div class='form-check'>";
                        tabla += "    <input class='form-check-input cg-check' type='checkbox' value='" + val + "' id='cg-" + i + "-" + val + "' onchange='actualizarEtiquetaCG(" + i + ")'>";
                        tabla += "    <label class='form-check-label w-100' for='cg-" + i + "-" + val + "'>" + texto + "</label>";
                        tabla += "  </div>";
                        tabla += "</li>";
                    });

                    tabla += "  </ul>";
                    tabla += "</div>";
                    tabla += "</th>";
                
                }

                document.getElementById("tablaDetalle").innerHTML = tabla;
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
                }

                // Mostrar la tabla en el HTML
                document.getElementById("tablaSumaBase").innerHTML = tablaSumaBase;
                document.getElementById("tablaSumaIva").innerHTML = tablaSumaIva;

            }).catch(error => {
                console.error('Error al obtener las opciones del proveedor:', error);
            });

        }

        lector.readAsText(archivo);
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

function fetchSubTipo() {

    var selectElement = document.getElementById("divisionSelect");
    var division = selectElement.value;

    if (division) {
        var ck = sessionStorage.getItem('company_key') || '';
        $.ajax({
            url: '/comprasapp/subTipo/?division=' + division + '&company=' + ck,
            method: 'GET',
            data: {
                'division': division,
                'company': ck
            },
            success: function (data) {

                var select = document.getElementById("subTipoSelect");
                select.innerHTML = '';

                if (data.ntipoorden && data.ntipoorden.length > 0) {
                    var option = document.createElement("option");
                    option.value = "SubTipo"; // Usa el campo adecuado para el valor
                    option.text = "Escoja tipo de Compra"; // Usa el campo adecuado para el texto
                    select.appendChild(option);
                    data.ntipoorden.forEach(function (item) {
                        var option = document.createElement("option");
                        option.value = item.to_tipo; // Usa el campo adecuado para el valor
                        option.text = item.to_descrip; // Usa el campo adecuado para el texto
                        select.appendChild(option);
                    });
                } else {
                    var option = document.createElement("option");
                    option.value = "SubTipo";
                    option.text = 'No hay datos disponibles';
                    select.appendChild(option);
                }

            },
            error: function (xhr, status, error) {
                console.error('Ha ocurrido un error:', error);
            }
        });
    } else {
        console.warn('Por favor, seleccione una división.');
    }
}


function fetchPlantillaProv() {

    var selectElement = document.getElementById("rucProveedor");
    var rucprovp = selectElement.value;
    var ck = sessionStorage.getItem('company_key') || '';

    if (rucprovp) {
        $.ajax({
            url: '/comprasapp/plantillaProv/',  // Asegúrate de que esta URL coincida con la URL de tu vista en Django
            method: 'GET',
            data: {
                'rucprovp': rucprovp,
                'company': ck
            },
            success: function (data) {

                var select = document.getElementById("PlantillaSelect");
                select.innerHTML = '';

                if (data.nplantilla && data.nplantilla.length > 0) {
                    var option = document.createElement("option");
                    option.value = "Plantilla"; // Usa el campo adecuado para el valor
                    option.text = "Escoja la plantilla"; // Usa el campo adecuado para el texto
                    select.appendChild(option);
                    data.nplantilla.forEach(function (item) {
                        var option = document.createElement("option");
                        option.value = item.pt_codplantilla; // Usa el campo adecuado para el valor
                        option.text = item.pt_codplantilla + ' ' + item.pc_concepto; // Usa el campo adecuado para el texto
                        select.appendChild(option);
                    });
                } else {
                    var option = document.createElement("option");
                    option.value = "Plantilla";
                    option.text = 'Datos no disponibles';
                    select.appendChild(option);
                }

            },
            error: function (xhr, status, error) {
                console.error('Ha ocurrido un error:', error);
            }
        });
    } else {
        console.warn('Por favor, seleccione una plantilla.');
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
                url: '/importacionesapp/cuentaProv/',
                method: 'GET',
                data: {
                    'rucprov': rucprov,
                    'company': ck
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
                        document.getElementById('botonGuardar').disabled = true;
                        alert('Proveedor no exixte o no tiene cuenta asignada.')
                        resolve("<option value=''>No hay datos disponibles</option>");
                        return;
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
        hoy.setHours(0,0,0,0);

        // Calcular diferencia en milisegundos
        let diferenciaMs = hoy - fechaFactura;

        // Convertir a días
        let diferenciaDias = diferenciaMs / (1000 * 60 * 60 * 24);

        if (diferenciaDias <= 5 && diferenciaDias >= 0) {
            return true;  // La fecha es válida
        } else {
            return false; // La fecha no es válida
        }
};

async function enviarDatosFactura() {
    //if (validaDatosFactura() === false) {
    //    return;
    //}

    const result = await validaDatosFactura();
    if (result) {

    } else {
        return;  // Esto devuelve `true` correctamente
    }

    var DescripTemp = document.getElementById("descripcionFactura");
    DescripTemp.value = DescripTemp.value.toUpperCase();

    var datos = {
        Compania: sessionStorage.getItem('compania'),
        Agencia: sessionStorage.getItem('agencia'),
        Bodega: sessionStorage.getItem('bodega'),
        Division: document.getElementById("divisionSelect").value,
        SubTipo: document.getElementById("subTipoSelect").value,
        Solicitante: document.getElementById("selSolicita").value,
        Usuario: document.getElementById("userName").value,
        RucProveedor: document.getElementById("rucProveedor").value,
        Plantillas: document.getElementById("PlantillaSelect").value,
        FechaEmision: document.getElementById("fechaEmision").value,
        SubTotalSinImpuestos: document.getElementById("subtotalSinImpuestos").value,
        TotalDescuento: document.getElementById("totalDescuento").value,
        TotalFactura: document.getElementById("importeTotal").value,
        FechaIngresoHora: document.getElementById("fechaIngresoHora").value,
        PlazoPago: document.getElementById("plazoPago").value,
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

        filaDatos.push(cantidad);
        // Suponemos que la tabla tiene 10 columnas: cantidad, item, descripcion, precio, incluye valores de iva por item
        filaDatos.push(celdas[2].innerText);    // Item (1)
        filaDatos.push(celdas[3].innerText);    // Descripcion (2)
        filaDatos.push(celdas[4].innerText);    // Precio Unitario (3)
        filaDatos.push(celdas[5].innerText);    // Descuento (4)
        var radios = celdas[8].getElementsByTagName("input");
        for (var j = 0; j < radios.length; j++) {
            if (radios[j].checked) {
                var selectValue = radios ? radios[j].value : "";
                filaDatos.push(selectValue); // Bienes/Servicios (5)
                //console.log("Valor seleccionado en esta fila:", radios[i].value);
                break;
            }
        }

        filaDatos.push(celdas[6].innerText);    // Total (6)
        
        var selectElement = celdas[7].getElementsByTagName("select")[0];
        if (selectElement.selectedIndex == 0) {
            alert('Debe seleccionar todos los Centros de Gastos.');
            selectElement.focus();
            return false;
        }
        var selectElement = celdas[7].getElementsByTagName("select")[0];
        var selectValue = selectElement ? selectElement.value : "";
        filaDatos.push(selectValue); // Centro de Gastos (7)
        
        filaDatos.push(celdasIva[1].innerText);    // Porcentaje IVA (8)
        filaDatos.push(celdasIva[2].innerText);    // Valor IVA (9)
        // Agrega la submatriz a la matriz principal
        datosTabla.push(filaDatos);

        var datosFactura = {
            datos: datos,
            datosTabla: datosTabla,

        };
    }

    var ck = sessionStorage.getItem('company_key') || '';

    $.ajax({
        url: '/importacionesapp/guardaFacturaImportaciones/',
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
            if (data.redirect_url) {
                // Redirige al usuario a la URL devuelta por el servidor
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
    var Division = document.getElementById("divisionSelect").value;
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
    const divisionselect = document.getElementById('divisionSelect');
    const subtiposelect = document.getElementById('subTipoSelect');
    const selsolicita = document.getElementById('selSolicita');
    const tipocredito = document.getElementById('tipoCreditoSelect')
    const plantillas = document.getElementById('PlantillaSelect');
    const descripcionfactura = document.getElementById('descripcionFactura');
    const plazopago = document.getElementById('plazoPago');
    const factura = document.getElementById('numeroFactura');

    // Validación de select
    if (divisionselect.selectedIndex == 0) {
        alert('Debe seleccionar una División.');
        divisionselect.focus();
        return false;
    }

    // Valida subtipo
    if (subtiposelect.selectedIndex == 0) {
        alert('Debe seleccionar un Sub Tipo.');
        subtiposelect.focus();
        return false;
    }

    // Validación de campo de texto
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

    if (plantillas.selectedIndex == 0) {
        alert('El campo Plantillas es obligatorio.');
        plantillas.focus();
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

function clickBien() {
    var tabla = document.getElementById("tablaDetalle");

    // Obtén todas las filas de la tabla
    var filas = tabla.getElementsByTagName("tr");

    // Recorre cada fila (comenzando desde 1 si la primera fila es el encabezado)
    for (var i = 0; i < filas.length - 1; i++) {
        // CREAR AQUI OPCION DE BIENES/SERVICIOS
        const btnBien = document.getElementById(`btnradioBien${i}`);
        btnBien.checked = true;
    }

}


function clickServicio() {
    var tabla = document.getElementById("tablaDetalle");

    // Obtén todas las filas de la tabla
    var filas = tabla.getElementsByTagName("tr");

    // Recorre cada fila (comenzando desde 1 si la primera fila es el encabezado)
    for (var i = 0; i < filas.length - 1; i++) {
        // CREAR AQUI OPCION DE BIENES/SERVICIOS
        const btnServicio = document.getElementById(`btnradioServicio${i}`);
        btnServicio.checked = true;
    }
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


