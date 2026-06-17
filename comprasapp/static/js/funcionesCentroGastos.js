//js para template de CRUD de centro de gastos (centroGastos.html)
//Clic boton editar subcentros 
document.getElementById("listSubcentroG_body").addEventListener("click", function (e) {
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
}
)

//Cambia de cuenta: Valida existencia y trae nombre, en conjunto con validacion de duplicidad
document.getElementById("listSubcentroG_body").addEventListener("change", function (e) {

    if (e.target.classList.contains("cuenta")) {

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
                source: "/comprasapp/cargarCuentasCtb/",
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
