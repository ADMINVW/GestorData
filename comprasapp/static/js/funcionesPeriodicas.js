let dataTable;
let dataTableIniciada = false;
const opcionesDataTable = {
    columnDefs: [
        { orderable: false, targets: [0, 3, 4] },
        { searchable: false, targets: [0, 3, 1, 4] },
    ],
    //pageLength:5,
    destroy: true,
    language: {
        "sEmptyTable": "No se encontraron registros para esta búsqueda",
        "sSearch": "Buscar Proveedor:",
        "sInfo": "Mostrando _START_ a _END_ de _TOTAL_ registros",
        "sInfoEmpty": "Mostrando 0 a 0 de 0 registros",
        "lengthMenu": "_MENU_ registros por pagina"
    }
};


const iniciarDataTable = async () => {
    if (dataTableIniciada) {
        dataTable.destroy();
    }

    await listPlantillas();
    dataTable = $("#datatable-consultaplantillas").DataTable(opcionesDataTable);
    dataTableIniciada = true;
}

const listPlantillas = async () => {
    try {
        //Parametro
        const codigo = document.getElementById("codPlantilla").value;

        const parametro = {
            codigo: codigo.toUpperCase()
        };

        let filtro = false;
        if (codigo.trim() != '') {
            filtro = true;
        }

        let response;
        if (!filtro) {
            response = await fetch("/comprasapp/consultarPlantillas/");
        }
        else {
            response = await fetch("/comprasapp/consultarPlantillas/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify(parametro)
            });
        }

        const data = await response.json();
        let content = ``;
        data.plantillas.forEach((plantilla) => {
            content += `
                <tr>
                    <td>${plantilla.pc_codigo}</td>
                    <td>${plantilla.pc_concepto}</td>
                    <td>${plantilla.pv_nombre}</td>
                    <td><a href="/comprasapp/editarPlantilla/${plantilla.pc_codigo}" 
               class='btn btn-sm btn-outline-primary' style='text-decoration: none;' >
            <i class='fa-solid fa-search'></i></a>  </td>
            <td><a href="/comprasapp/cargarTmplPlantillaCtb/${plantilla.pc_codigo}" 
               class='btn btn-sm btn-outline-primary' style='text-decoration: none;' >
            <i class='fa-solid fa-percent'></i></a>  </td>
                </tr>
            `;
        });
        tablebody_plantillas.innerHTML = content;

    } catch (error) {
        alert(error);
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    iniciarDataTable();
});

$(function () {
    $("#nomPlantilla").autocomplete({
        source: "/comprasapp/cargarConceptoPlantillas/",
        minLength: 3,
        select: function (event, ui) {
            $("#codPlantilla").val(ui.item.codigo);
        }
    });
});