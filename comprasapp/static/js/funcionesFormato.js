//js de template de consulta o resumen de ingreso de la orden de compra (resumenIngreso.html)
document.addEventListener("DOMContentLoaded", function (event) {
    let retencion = document.getElementById("retencion").value;
    //Solo si existe retencion se totaliza grid
    if (retencion > 0) {
        //Suma total por tipo de retencion
        var sum = 0;
        var sumF = 0;
        var sumI = 0;
        var grid = document.getElementById("tableRet");
        var rows = grid.getElementsByTagName("tr");

        for (var i = 1; i < rows.length; i++) {
            var tipRet = rows[i].cells[0].innerText;
            var valRet = rows[i].cells[4].innerText;

            if (tipRet === "IVA") {
                sumI += parseFloat(valRet);
            }
            if (tipRet === "FUENTE") {
                sumF += parseFloat(valRet);
            }
        }
        sum = sumF + sumI;
        document.getElementById("totalIva").textContent = "$ " + formateoDecimal(sumI);
        document.getElementById("totalFte").textContent = "$ " + formateoDecimal(sumF);
        document.getElementById("totalRet").textContent = "$ " + formateoDecimal(sum);

        //Formato decimales
        var valores = this.getElementsByClassName("val");
        for (var i = 0; i < valores.length; i++) {
            valores[i].textContent = formateoDecimal(valores[i].textContent);
        }
    }

    //checks informacion proveedor
    let proveedor = document.getElementById("dataProveedor");
    var grancontrib = proveedor.dataset.grancontrib; //TRABAJA CON SOLO MINUSCULAS
    var rimpe = proveedor.dataset.rimpe;
    var contribEsp = proveedor.dataset.contribesp;
    var retIva = proveedor.dataset.retiva;
    var retFte = proveedor.dataset.retfte;

    if (grancontrib == "S") {
        $("input[id='granContrib']").prop("checked", true);
    }
    if (rimpe == "E" || rimpe == "G") {
        $("input[id='rimpe']").prop("checked", true);
    }
    if (contribEsp == "S") {
        $("input[id='contribEsp']").prop("checked", true);
    }
    if (retIva == "S") {
        $("input[id='retIva']").prop("checked", true);
    }
    if (retFte == "S") {
        $("input[id='retFte']").prop("checked", true);
    }

    if (document.getElementById("periodica")) {
        let periodica = document.getElementById("periodica").value;
        if (periodica == '1') {
            $("input[id='periodicacheck']").prop("checked", true);
        }
    }


    //Suma valores de items de ventana modal usada para mostrar detalle de orden (no para división taller)
    $('#ventana_modal').on('show.bs.modal', function (event) {
        //Division
        let coddiv = document.getElementById("codDivision").value;
        console.log("division ", coddiv)
        //Suma total 
        let porivacab = document.getElementById("iva").value;

        var subtotalIvaG = 0;
        var subtotalIva5 = 0;
        var subtotalIva0 = 0;
        var subtotal = 0;

        var totalIvaG = 0;
        var totalIva5 = 0;
        var totalIva0 = 0;
        var totalIva = 0;

        var total = 0;

        var grid = document.getElementById("listDetalle");
        var rows = grid.getElementsByTagName("tr");
        console.log("division", coddiv)
        for (var i = 1; i < rows.length; i++) {
            //Hay de definir por tipo, solo se contempla (T)rabajos de terceros sobre orden
            if (coddiv == "t") {
                var poriva = rows[i].cells[1].innerText.trim();

                var valItem = rows[i].cells[2].innerText;
            }
            //Compra repuestos y accesorios
            if (coddiv == "r" || coddiv == "v") {
                var poriva = rows[i].cells[3].innerText.trim();

                var valItem = rows[i].cells[6].innerText;
            }
            if (coddiv == "d") {
                var valItem = rows[i].cells[7].innerText;
                var poriva = rows[i].cells[3].innerText.trim();
            }

            if (poriva == "-") {
                //casos anteriores a iva por item se trabaja con % de cabecera, se optó por enviar "-" cuando valor en nulo y poder acá identificar, pues no reconocia valor null            
                if (porivacab > 0) {
                    subtotalIvaG += parseFloat(valItem);
                }
                else {
                    subtotalIva0 += parseFloat(valItem);
                }
                console.log("iva en cabecera")
            }
            else {
                switch (poriva) {
                    case "0":
                        subtotalIva0 += parseFloat(valItem);
                        break;
                    case "5":
                        subtotalIva5 += parseFloat(valItem);
                        break;
                    default:
                        porivacab = poriva
                        subtotalIvaG += parseFloat(valItem);
                        break;
                }
            }
        }
        subtotal = subtotalIvaG + subtotalIva0 + subtotalIva5;
        totalIva = (subtotalIvaG * (porivacab / 100)) + (subtotalIva5 * (5 / 100))
        total = subtotal + totalIva;

        document.getElementById("subtotal").textContent = "$ " + formateoDecimal(subtotal);
        document.getElementById("totaliva").textContent = "$ " + formateoDecimal(totalIva);
        document.getElementById("total").textContent = "$ " + formateoDecimal(total);
    });
});