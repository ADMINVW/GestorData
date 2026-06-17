//js para consultar y listar las ordenes de compra en base a filtro en pantalla (consultaOrdenes.html)
let dataTable;
let dataTableIniciada = false;

const opcionesDataTable = {
    columnDefs: [
        { orderable: false, targets: [7] },
        { searchable: false, targets: [0, 1, 6, 7] }
    ],
    //pageLength:5,
    destroy: true,
    language: {
        "sEmptyTable": "No se encontraron registros para esta búsqueda",
        "sSearch": "Buscar:",
        "sInfo": "Mostrando _START_ a _END_ de _TOTAL_ registros",
        "sInfoEmpty": "Mostrando 0 a 0 de 0 registros",
        "lengthMenu": "_MENU_ registros por pagina"
    }
};

const iniciarDataTable = async () => {
    if (dataTableIniciada) {
        dataTable.destroy();
    }

    await listOrdenes();

    dataTable = $("#datatable-consultaoc").DataTable(opcionesDataTable);
    dataTableIniciada = true;
}

const listOrdenes = async () => {
    try {
        //Parametros
        const agencia = document.getElementById("codAgencia").value;
        const proveedor = document.getElementById("codProveedor").value;
        const ordenCompra = document.getElementById("numOrden").value;
        const fecIni = document.getElementById("fecIngresoIni").value;
        const fecFin = document.getElementById("fecIngresoFin").value;
        const division = document.getElementById("codDivision").value;
        const factura = document.getElementById("numFactura").value;
        const ordenTaller = document.getElementById("numOrdenTaller").value;

        console.log("filtro ", agencia)

        const parametros = {
            agencia: agencia,
            proveedor: proveedor,
            ordenCompra: ordenCompra,
            fecIni: fecIni,
            fecFin: fecFin,
            division: division,
            factura: factura,
            ordenTaller: ordenTaller
        };

        let filtros = false;
        for (const valorParam of Object.values(parametros)) {
            if (valorParam.trim() != '') {
                filtros = true;
            }
        }

        let response;
        //Si parametros vacios 
        if (!filtros) {
            response = await fetch("/comprasapp/consultarOrdenes/");
        } else {
            response = await fetch("/comprasapp/consultarOrdenes/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value, // siempre que tengp {% csrf_token %} en el formulario de html, otra opcion getCookie('csrftoken')
                },
                body: JSON.stringify(parametros)
            });

        }
        var ck = sessionStorage.getItem('company_key') || '';
        const data = await response.json();
        let content = ``;
        data.ordenes.forEach((orden) => {
            content += `
                <tr>
                    <td>${orden.oc_agencia}</td>
                    <td>${orden.oc_division}</td>
                    <td>${orden.pv_nombre}</td>
                    <td>${orden.oc_numero}</td>
                    <td>${orden.oc_facpro}</td>
                    <td>${orden.oc_ordtra == null ? "-" : orden.oc_ordtra} </td>
                    <td>${orden.oc_fecing}</td>
                    <td>
                         <a href="/comprasapp/templates/verTransaccion/${orden.oc_numero}?agencia=${orden.oc_agencia}&division=${orden.oc_division}&company=${ck}" 
               class='btn btn-sm btn-primary' style='text-decoration: none;' target="_blank">
               <i class='fa-solid fa-search'></i>
            </a>
                    </td>
                </tr>
            `;
        });
        tablebody_ordenes.innerHTML = content;
    } catch (error) {
        alert(error);
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    cargarAgencias();
    cargarDivisiones();
    iniciarDataTable();
});

const cargarAgencias = async () => {
    try {
        const response = await fetch("/comprasapp/cargarAgencias/");
        const data = await response.json();

        const selectAgencia = document.getElementById("codAgencia");
        data.agencias.forEach(agencia => {
            const option = document.createElement("option");
            option.value = agencia.co_agencia;
            option.textContent = agencia.co_nomcorto;
            selectAgencia.appendChild(option);
        });
    } catch (error) {
        alert("Error al cargar agencias:" + error)
    }
};

const cargarDivisiones = async () => {
    try {
        const response = await fetch("/comprasapp/cargarDivisiones/");
        const data = await response.json();
        const selectDivision = document.getElementById("codDivision");

        data.divisiones.forEach(division => {
            const option = document.createElement("option");
            option.value = division.co_div;
            option.textContent = division.co_nomcorto;
            selectDivision.appendChild(option);
        });

    } catch (error) {
        alert("Error al cargar divisiones:" + error)
    }
};

$(function () {
    $("#nomProveedor").autocomplete({
        source: "/comprasapp/cargarProveedores/",
        minLength: 3,
        select: function (event, ui) {
            $("#codProveedor").val(ui.item.codigo);
        }
    });
});