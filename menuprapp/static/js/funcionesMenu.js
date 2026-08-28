function cerrarSesion() {
    console.log("cerrarSesion")
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("compania");
    sessionStorage.removeItem("agencia");
    sessionStorage.removeItem("bodega");
    sessionStorage.removeItem("company_key");
}



document.addEventListener("DOMContentLoaded", function (event) {
    //capturo registros de acceso de usuario
    const accesos = JSON.parse($("#accesos").text());
    if (accesos.length == 0) {
        alert("Usuario sin accesos habilitados, comunique a sistemas")
        //deshabilito todos las opciones de menu
        $(".dropdown-item").each(function () {
            $(this)
                .addClass("disabled")
                .attr("aria-disabled", "true")
                .css({
                    "pointer-events": "none",
                    "opacity": "0.5"
                });
        });
        return;
    }
    //capturo nivelPerfil 
    const niveles = accesos.map(item => item.pf_nivelperfil);
    const nivelPerfil = niveles[0];

    if (nivelPerfil == 1) {
        //Nivel S (SUPER ADMINISTRADOR): No ejecuta procedimiento de habilitar accesos
        return;
    }
    if (nivelPerfil >= 2) {
        //Nivel AD (ADMINISTRADOR): Ejecuta procedimiento solo a nivel de modulo
        const modulosPermitidos = accesos.filter(acceso => acceso.pf_nivelmenu === 1).map(acceso => acceso.pf_codmenu);
        //recorro items de class modulo asignado a cada menuPadre en menuBarraNav.html
        $(".modulo").each(function () {
            let idpadremenu = this.id;
            if (!modulosPermitidos.includes(idpadremenu)) {
                $(this)
                    .addClass("disabled")
                    .css({
                        "pointer-events": "none",
                        "opacity": "0.5"
                    });
            }
            //Niveles ejecutivos/operativos/multifuncionales se ejecuta procedimiento a nivel de opciones de menu siempre que tenga items de este modulo
            if (nivelPerfil >= 3 && (accesos.some(acceso => acceso.pf_nivelmenu > 1 && acceso.pf_padremenu === idpadremenu))) {
                //capturo solo los registros que sean del modulo en analisis
                const idsHabilitados = accesos.filter(acceso => acceso.pf_nivelmenu > 1 && acceso.pf_padremenu === idpadremenu).map(acceso => acceso.pf_codmenu);
                const menu = document.getElementById(idpadremenu);
                //capturo solo los items del modulo en analisis
                $(menu).find(".dropdown-item").each(function () {
                    let id = this.id;
                    //si la opción del menu no es parte de conjunto de accesos, lo deshabilita
                    if (!idsHabilitados.includes(id)) {
                        $(this)
                            .addClass("disabled")
                            .css({
                                "pointer-events": "none",
                                "opacity": "0.5"
                            });
                    }
                })
            }
        })
    }
})

//Para prevenir la llamada del evento sin interaccion del usuario
$(document).on("click", ".dropdown-item.disabled", function (e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
});