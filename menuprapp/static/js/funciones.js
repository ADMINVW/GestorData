function validaLogin() {
    return new Promise(function (resolve, reject) {
        var selectElement = document.getElementById("username");
        var username = selectElement.value;
        var selectElement = document.getElementById("password");
        var password = selectElement.value;
        var modal = document.getElementById("loginModal");


        if (username) {
            $.ajax({
                url: '/menuprapp/inilogin/',  // Asegúrate de que esta URL coincida con la URL de tu vista en Django
                method: 'GET',
                data: {
                    'password': password,
                    'username': username

                },
                success: function (data) {

                    //var resultado = document.getElementById("response");

                    if (data.ndatuser && data.ndatuser.length > 0) {
                        data.ndatuser.forEach(function (item) {
                            localStorage.setItem('username', item.ur_user);
                            localStorage.setItem('compania', item.ur_cia);
                            localStorage.setItem('agencia', item.ur_age);
                            localStorage.setItem('bodega', item.ur_bodprn);
                        });
                        resolve(true);

                    } else {
                        resultado.value = 'No hay datos disponibles';
                        resolve(false);
                    }

                },
                error: function (xhr, status, error) {
                    console.error('Ha ocurrido un error:', error);
                    resolve(false);
                }
            });
        } else {
            console.warn('Login Incorrectoo!!.');
            resolve(false)
        }
    });
}
//mine
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

