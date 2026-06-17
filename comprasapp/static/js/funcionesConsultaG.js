//js para consultar y listar los centros de gastos (consultaCentroGastos.html)
let dataTable;
let dataTableIniciada = false;
const opcionesDataTable = {
    columnDefs: [
        { orderable: false, targets: [2] },
        { searchable: false, targets: [2] },
    ],
    //pageLength:5,
    destroy: true,
    language: {
        "sEmptyTable": "No se encontraron registros para esta búsqueda",
        "sSearch": "Buscar por Nombre:",
        "sInfo": "Mostrando _START_ a _END_ de _TOTAL_ registros",
        "sInfoEmpty": "Mostrando 0 a 0 de 0 registros",
        "lengthMenu": "_MENU_ registros por pagina"
    }
};

const listarGastos = async () => {
    try {
        response = await fetch('/comprasapp/consultarCentroGastos/');
        const data = await response.json();
        let content = ``;
        data.cgastos.forEach((cgasto) => {
            content += `
                <tr>
                    <td>${cgasto.ct_codgrp}</td>
                    <td>${cgasto.ct_grupo}</td>
                     <td><a href="/comprasapp/verCentroGastos/${cgasto.ct_codgrp}" title="Consultar"
               class='btn btn-sm btn-primary' style='text-decoration: none;' id='editar-btn' >
            <i class='fa-solid fa-search'></i></a>  </td>  
            
                  <td><a href="/comprasapp/cargarTmplCentroGastos/?codigo=${cgasto.ct_codgrp}&proceso=U" title="Editar"
               class='btn btn-sm btn-success' style='text-decoration: none;' id='editar-btn' >
            <i class='fa-solid fa-edit'></i></a>  </td>                    
                </tr>
            `;
        });
        tablebody_gastos.innerHTML = content;

    } catch (error) {
        alert(error);
    }
}

const iniciarDataTable = async () => {
    if (dataTableIniciada) {
        dataTable.destroy();
    }
    await listarGastos();
    dataTable = $("#datatable-consultagastos").DataTable(opcionesDataTable);
    dataTableIniciada = true;
}

document.addEventListener("DOMContentLoaded", function (event) {
    iniciarDataTable();
});