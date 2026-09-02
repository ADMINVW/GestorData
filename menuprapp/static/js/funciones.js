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

//mine0826
//validacion para ingreso de facturas
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
    hoy.setHours(0, 0, 0, 0);

    // Calcular diferencia en milisegundos
    let diferenciaMs = hoy - fechaFactura;

    // Convertir a días
    let diferenciaDias = diferenciaMs / (1000 * 60 * 60 * 24);

    //validacion 5 días(incluye mes anterior)
    if (diferenciaDias <= 5 && diferenciaDias >= 0) {
        //validacion mes anterior
        mesActual = hoy.getMonth()
        if (mes != mesActual) {
            return false;
        }
        return true;  // La fecha es válida
    } else {
        return false; // La fecha no es válida
    }
};

//validacion factura corresponde a empresa
function validaEmpresa(rucFactura) {
    //mine (Validacion RUC compania activa con ruc de comparador de xml)
    var ck = sessionStorage.getItem('company_key');

    if (ck.substring(0, 9) == 'ecuawagen' && rucFactura.textContent != '1791765842001') {
        return false;
    }
    if (ck.substring(0, 10) == 'germanmoto' && rucFactura.textContent != '1792121795001') {
        return false;
    }
    return true;
}