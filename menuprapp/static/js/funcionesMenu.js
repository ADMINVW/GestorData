function cerrarSesion() {
    console.log("cerrarSesion")
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("compania");
    sessionStorage.removeItem("agencia");
    sessionStorage.removeItem("bodega");
    sessionStorage.removeItem("company_key");
}



// document.addEventListener("DOMContentLoaded", function (event) {
//     console.log(" DOMContentLoaded -IDS " + $("#accesos").text())
//     //capturo id de acceso de usuario
//     const accesosUsuario = JSON.parse($("#accesos").text());
//     //capturo solo datos con llave del diccionario
//     const idsHabilitados = accesosUsuario.map(item => item.pf_codmenu);
//     //recorro todos los items de menu
//     $(".dropdown-item").each(function () {
//         let id = this.id;
//         //si la opción del menu no es parte de conjunto de accesos, lo deshabilita
//         if (!idsHabilitados.includes(id)) {
//             $(this)
//                 .addClass("disabled")
//                 .css({
//                     "pointer-events": "none",
//                     "opacity": "0.5"
//                 });
//         }
//     })
// })

// //Para prevenir la llamada del evento sin interaccion del usuario
// $(document).on("click", ".dropdown-item.disabled", function (e) {
//     e.preventDefault();
//     e.stopPropagation();
//     return false;
// });