//js para funciones reutilizadas por algunas apps
function formateoDecimal(valor) {
    valor = Number.parseFloat(valor).toFixed(2);
    return valor;
}

function validacionesProv(item, tipo) {
    //Iva se valida con % , Fte se valida con codigo interno
    var valida = true;

    if (tipo == "I") {
        //Contribuyente Especial se valida items IVA
        if (item != 10 && item != 20 && contribEsp == "S") {
            alert(
                "Proveedor del tipo CONTRIBUYENTE ESPECIAL, solo puede retener 10% o 20% "
            );
            valida = false;
        }
        else if ((item == 10 || item == 20) && contribEsp == "N") {
            alert(
                "Proveedor no es del tipo CONTRIBUYENTE ESPECIAL, no puede retener 10% o 20% "
            );
            valida = false;
        }
    } else {
        //Regimen RIMPE se valida items FUENTE
        switch (rimpe) {
            case "N":
                if (item == 99) {
                    alert("Proveedor no aplica para retención de regimen RIMPE");
                    valida = false;
                }
                break;
            case "G":
                if (item != 98) {
                    alert(
                        "Item no aplica, proveedor Reg. RIMPE-Negocio Popular debe retener 0% COMPRAS NO SUJETAS A RETENCION"
                    );
                    valida = false;
                }
                break;
            case "E":
                if (item != 99) {
                    alert(
                        "Item no aplica, proveedor Reg. RIMPE-Emprendedor debe retener 1% OTRAS RET.REGIMEN RIMPE"
                    );
                    valida = false;
                }
                break;
        }
    }
    return valida;
}

