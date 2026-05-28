$.ajaxSetup({
    beforeSend: function (xhr) {
        var ck = sessionStorage.getItem('company_key');
        if (ck) xhr.setRequestHeader('X-Company-Key', ck);
    }
});
//Eventos al cargar plantilla
document.addEventListener("DOMContentLoaded", function (event) {
  // ── SCROLL TOP DESPUÉS DE RELOAD ──
  if (new URLSearchParams(window.location.search).get('scrollTop')) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState({}, '', window.location.pathname + 
      window.location.search.replace(/[?&]scrollTop=1/, '').replace(/^\?$/, ''));
    // Mostrar mensaje de error si existe
    const errorMsg = sessionStorage.getItem('errorMsg');
    if (errorMsg) {
      swal.fire("Error", errorMsg, "error");
      sessionStorage.removeItem('errorMsg');
    }
  }
  //Formateo valores decimales
  baseIvaB.value = formateoDecimal(baseIvaB.value);
  baseIvaS.value = formateoDecimal(baseIvaS.value);
  baseIva.value = formateoDecimal(baseIva.value);
  baseFuenteB.value = formateoDecimal(baseFuenteB.value);
  baseFuenteS.value = formateoDecimal(baseFuenteS.value);
  baseFuente.value = formateoDecimal(baseFuente.value);
  //Obtengo valores Generales
  user.value = sessionStorage.getItem('username');
  compania.value = sessionStorage.getItem("compania");
  agencia.value = sessionStorage.getItem("agencia");
  bodega.value = sessionStorage.getItem("bodega");


  //TRATAMIENTO ORDEN PERIODICA, SE PONE AUTOMATICAMENTE CHECK EN ITEMS
  let periodica = document.getElementById("dataPeriodica");

  let ivaPeriodica = periodica.dataset.secuencia_iva;
  let ftePeriodica = periodica.dataset.secuencia_renta;

  console.log(ivaPeriodica)
  console.log(ftePeriodica)
  //recorro grids
  if (retIva == "S") {
    var grid = document.getElementById("listIvaB");
    var rows = grid.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
      var codigo = rows[i].querySelector(".codInterno").value;
      if (codigo == ivaPeriodica) {
        $(rows[i].querySelector(".checkIB")).prop("checked", true);
        $(rows[i].querySelector(".checkIB")).change()
      }
    }

    var grid = document.getElementById("listIvaS");
    var rows = grid.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
      var codigo = rows[i].querySelector(".codInterno").value;
      if (codigo == ivaPeriodica) {
        $(rows[i].querySelector(".checkIS")).prop("checked", true);
        $(rows[i].querySelector(".checkIS")).change()
      }
    }
  }


  if (grancontrib == "N") {
    var grid = document.getElementById("listFuenteB");
    var rows = grid.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
      var codigo = rows[i].querySelector(".codInterno").value;
      if (codigo == ftePeriodica) {
        $(rows[i].querySelector(".checkFB")).prop("checked", true);
        $(rows[i].querySelector(".checkFB")).change()
      }
    }


    var grid = document.getElementById("listFuenteS");
    var rows = grid.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
      var codigo = rows[i].querySelector(".codInterno").value;
      if (codigo == ftePeriodica) {
        $(rows[i].querySelector(".checkFS")).prop("checked", true);
        $(rows[i].querySelector(".checkFS")).change()
      }
    }
  }
});

//VARIABLE GLOBAL PARA DATOS PROVEEDOR, checks informacion proveedor
let proveedor = document.getElementById("codProveedor");
let grancontrib = proveedor.dataset.grancontrib; //TRABAJA CON SOLO MINUSCULAS
let rimpe = proveedor.dataset.rimpe;
let contribEsp = proveedor.dataset.contribesp;
let retIva = proveedor.dataset.retiva;
let retFte = proveedor.dataset.retfte;
console.log("proveedor", grancontrib, "/", rimpe, "/", contribEsp, "/", retIva, "/", retFte)
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

//VARIABLES PARA CONTROLAR UN ITEM POR TIPO DE RETENCION
var existeivaB = false;
var existeivaS = false;
var existefteB = false;
var existefteS = false;

//Clic y calculo item iva bienes
$("input[id='checkIB']").change(function (e) {
  const row = this.closest("tr");
  if ($(this).is(":checked")) {
    const porciento = row.querySelector(".porcenIvaB").value;
    if (validacionesProv(porciento, "I") == false) {
      $(this).prop("checked", false);
      return;
    }
    var base = document.getElementById("baseIvaB").value;
    if (!(base > 0)) {
      $(this).prop("checked", false);
      alert(
        "Factura no tiene valor de BIENES"
      );
      return;
    }
    if (existeivaB == true) {
      $(this).prop("checked", false);
      alert(
        "Ya existe un item seleccionado para IVA BIENES"
      );
      return;
    }
    const result = base * (porciento / 100);
    //row.querySelector(".txtvalorI").value = result.toLocaleString("en-US");
    row.querySelector(".txtvalorIB").value = formateoDecimal(result);
    existeivaB = true;
  } else {
    row.querySelector(".txtvalorIB").value = "";
    existeivaB = false;
  }
  sumarValoresIva();
});

//Clic y calculo item iva servicios
$("input[id='checkIS']").change(function (e) {

  const row = this.closest("tr");
  if ($(this).is(":checked")) {
    const porciento = row.querySelector(".porcenIvaS").value;
    if (validacionesProv(porciento, "I") == false) {
      $(this).prop("checked", false);
      return;
    }
    var base = document.getElementById("baseIvaS").value;
    if (!(base > 0)) {
      $(this).prop("checked", false);
      alert(
        "Factura no tiene valor de SERVICIOS"
      );
      return;
    }
    if (existeivaS == true) {
      $(this).prop("checked", false);
      alert(
        "Ya existe un item seleccionado para IVA SERVICIOS"
      );
      return;
    }
    const result = base * (porciento / 100);
    //row.querySelector(".txtvalorI").value = result.toLocaleString("en-US");
    row.querySelector(".txtvalorIS").value = formateoDecimal(result);
    existeivaS = true;
  } else {
    row.querySelector(".txtvalorIS").value = "";
    existeivaS = false;
  }
  sumarValoresIva();
});

//Clic y calculo item fuente bienes
$("input[id='checkFB']").change(function (e) {
  const row = this.closest("tr");
  if ($(this).is(":checked")) {
    const porciento = row.querySelector(".porcenFteB").value;
    const codigo = row.querySelector(".codInterno").value;
    if (validacionesProv(codigo, "F") == false) {
      $(this).prop("checked", false);
      return;
    }
    var base = document.getElementById("baseFuenteB").value;
    if (!(base > 0)) {
      $(this).prop("checked", false);
      alert(
        "Factura no tiene valor de BIENES"
      );
      return;
    }
    if (existefteB == true) {
      $(this).prop("checked", false);
      alert(
        "Ya existe un item seleccionado para FUENTE BIENES"
      );
      return;
    }
    const result = base * (porciento / 100);
    //row.querySelector(".txtvalorF").value = result.toLocaleString("en-US");
    row.querySelector(".txtvalorFB").value = formateoDecimal(result);
    existefteB = true;
  } else {
    row.querySelector(".txtvalorFB").value = "";
    existefteB = false;
  }
  sumarValoresFte();
});

//Clic y calculo item fuente servicios
$("input[id='checkFS']").change(function (e) {
  const row = this.closest("tr");
  if ($(this).is(":checked")) {
    const porciento = row.querySelector(".porcenFteS").value;
    const codigo = row.querySelector(".codInterno").value;
    if (validacionesProv(codigo, "F") == false) {
      $(this).prop("checked", false);
      return;
    }
    var base = document.getElementById("baseFuenteS").value;
    if (!(base > 0)) {
      $(this).prop("checked", false);
      alert(
        "Factura no tiene valor de SERVICIOS"
      );
      return;
    }
    if (existefteS == true) {
      $(this).prop("checked", false);
      alert(
        "Ya existe un item seleccionado para FUENTE BIENES"
      );
      return;
    }
    const result = base * (porciento / 100);
    row.querySelector(".txtvalorFS").value = formateoDecimal(result);
    existefteS = true;
  } else {
    row.querySelector(".txtvalorFS").value = "";
    existefteS = false;
  }
  sumarValoresFte();
});

function sumarValoresIva() {
  //Suma items de ivaB
  var grid = document.getElementById("listIvaB");
  var rows = grid.getElementsByTagName("tr");
  var sumB = 0;
  var sumS = 0;
  var sum = 0;
  for (var i = 1; i < rows.length; i++) {
    var cells = rows[i].querySelector(".txtvalorIB").value;
    if (cells.length === 0) {
      cells = 0;
    }
    sumB += parseFloat(cells);
  }

  //Suma items de ivaS
  var grid = document.getElementById("listIvaS");
  var rows = grid.getElementsByTagName("tr");

  for (var i = 1; i < rows.length; i++) {
    var cells = rows[i].querySelector(".txtvalorIS").value;
    if (cells.length === 0) {
      cells = 0;
    }
    sumS += parseFloat(cells);
  }
  sum = sumB + sumS;
  document.getElementById("valRetenidoIvaB").value = sumB.toLocaleString("en-US");
  document.getElementById("valRetenidoIvaS").value = sumS.toLocaleString("en-US");
  document.getElementById("valRetenidoIva").value = sum.toLocaleString("en-US");
  sumarTotalRetencion();
}

function sumarValoresFte() {
  //Suma items de fuente bienes
  var grid = document.getElementById("listFuenteB");
  var rows = grid.getElementsByTagName("tr");
  var sum = 0;
  var sumB = 0;
  var sumS = 0;
  for (var i = 1; i < rows.length; i++) {
    var cells = rows[i].querySelector(".txtvalorFB").value;
    if (cells.length === 0) {
      cells = 0;
    }
    sumB += parseFloat(cells);
  }
  //Suma items de fuente servicios
  var grid = document.getElementById("listFuenteS");
  var rows = grid.getElementsByTagName("tr");

  for (var i = 1; i < rows.length; i++) {
    var cells = rows[i].querySelector(".txtvalorFS").value;
    if (cells.length === 0) {
      cells = 0;
    }
    sumS += parseFloat(cells);
  }
  sum = sumS + sumB;
  document.getElementById("valRetenidoFteB").value = sumB.toLocaleString("en-US");
  document.getElementById("valRetenidoFteS").value = sumS.toLocaleString("en-US");
  document.getElementById("valRetenidoFte").value = sum.toLocaleString("en-US");
  sumarTotalRetencion();
}


//CANCELO PROCESO
document.getElementById('cancelar-btn').addEventListener('click', function () {
  let url = this.getAttribute("data-url"); //Obtengo nombre vista a direccionar añadida como atributo en el boton

  let agencia = sessionStorage.getItem("agencia");
  let division = document.getElementById("division").value;
  //probar
  let urlParam = `${url}/?agencia=` + agencia + `&division=` + division + `+&proceso=I`;
  console.log(urlParam);
  swal.fire({
    title: "¿Desea cancelar proceso retención ?",
    text: "No se generará retención de la factura en proceso",
    icon: "warning",
    showCancelButton: true,
    showConfirmButton: true,
    confirmButtonText: "Si",
    cancelButtonText: "No",
    confirmButtonColor: "#DD6B55"
  }).then((result) => {
    if (result.isConfirmed) {
      //window.location.href = "{% url 'mimenu' %}"; //no se puede usar en js extreno funcionario en scrpt dentro de hmtl
      window.location.href = urlParam;
    }
  })
});

//ENVIO DE FORMULARIO
document.getElementById("form-retencion").addEventListener("submit", function (event) {
  //METODO PARA CANCELAR ENVIO EN CASO DE CAER EN UNA VALIDACION
  event.preventDefault();

  //BANDERAS DE VALIDACION
  let ivaS = false
  let ivaB = false
  let fteS = false
  let fteB = false

  //VARIABLES ENVIO DATOS A VISTA
  const jsonData = {};
  const filas = [];
  let tabla;

  //Capturo item seleccionado en tablas
  //Si no tengo base iva no muestro seccion iva, tampoco cuando no es agente de retencion de iva, por tanto tampoco valido
  if (document.getElementById("baseIva").value > 0 && retIva == "S") {
    /*Iva Bienes*/
    if (document.getElementById("baseIvaB").value > 0) {
      tabla = document.getElementById("listIvaB");
      var rows = tabla.getElementsByTagName("tr");
      for (var i = 1; i < rows.length; i++) {
        const Datos = {};
        var check = rows[i].querySelector(".checkIB").checked;
        if (check) {
          Datos["porcentaje"] = rows[i].querySelector(".porcenIvaB").value;
          Datos["codigo"] = rows[i].querySelector(".codInterno").value;
          Datos["base"] = document.getElementById("baseIvaB").value;
          Datos["tipo"] = "I"

          filas.push(Datos)
          ivaB = true
        }
      }
      //VALIDO QUE DEBIÓ SELECCIONAR AL MENOS 1
      if (ivaB == false) {
        alert("No ha registrado retencion sobre valor de IVA BIENES")
        return;
      }
    }

    /*Iva Servicios*/
    if (document.getElementById("baseIvaS").value > 0) {
      tabla = document.getElementById("listIvaS");
      var rows = tabla.getElementsByTagName("tr");
      for (var i = 1; i < rows.length; i++) {
        const Datos = {};
        var check = rows[i].querySelector(".checkIS").checked;
        if (check) {
          Datos["porcentaje"] = rows[i].querySelector(".porcenIvaS").value;
          Datos["codigo"] = rows[i].querySelector(".codInterno").value;
          Datos["base"] = document.getElementById("baseIvaS").value;
          Datos["tipo"] = "I"

          filas.push(Datos)
          ivaS = true
        }
      }
      //VALIDO SI HAY BASE DE BIENES DEBIO SELECCIONAR AL MENOS 1
      if (ivaS == false) {
        alert("No ha registrado retencion sobre valor de IVA SERVICIOS")
        return;
      }
    }
  }

  //Cuando no es agente de retención fte (incluye a proveedores del tipo GRAN CONTRIBUYENTE) EN VISTA NO SE MUESTRA GRID DE ITEM FTE
  if (retFte == "S") {
    /*Fuente Servicios*/
    if (document.getElementById("baseFuenteS").value > 0) {
      tabla = document.getElementById("listFuenteS");
      var rows = tabla.getElementsByTagName("tr");
      for (var i = 1; i < rows.length; i++) {
        const Datos = {};
        var check = rows[i].querySelector(".checkFS").checked;
        if (check) {
          Datos["porcentaje"] = rows[i].querySelector(".porcenFteS").value;
          Datos["codigo"] = rows[i].querySelector(".codInterno").value;
          Datos["base"] = document.getElementById("baseFuenteS").value;
          Datos["tipo"] = "F"

          filas.push(Datos)
          fteS = true
        }
      }
      //VALIDO SI HAY BASE DE BIENES DEBIO SELECCIONAR AL MENOS 1
      if (fteS == false) {
        alert("No ha registrado retencion sobre valor de FUENTE SERVICIOS")
        return;
      }
    }

    /*Fuente Bienes*/
    if (document.getElementById("baseFuenteB").value > 0) {
      tabla = document.getElementById("listFuenteB");
      var rows = tabla.getElementsByTagName("tr");
      for (var i = 1; i < rows.length; i++) {
        const Datos = {};
        var check = rows[i].querySelector(".checkFB").checked;
        if (check) {
          Datos["porcentaje"] = rows[i].querySelector(".porcenFteB").value;
          Datos["codigo"] = rows[i].querySelector(".codInterno").value;
          Datos["base"] = document.getElementById("baseFuenteB").value;
          Datos["tipo"] = "F"

          filas.push(Datos)
          fteB = true
        }
      }
      //VALIDO SI HAY BASE DE BIENES DEBIO SELECCIONAR AL MENOS 1
      if (fteB == false) {
        alert("No ha registrado retencion sobre valor de FUENTE BIENES")
        return;
      }
    }
  }

  //CONTROL TRANSACCION ENVIADA
  if (sessionStorage.getItem("form_enviado")) {
    swal.fire("Oops!", "Retencion de factura ya registrada!", "warning");
    document.getElementById("guardar-btn").disabled = true;
    return
  }

  //CAPTURO DEMAS DATOS DE FOURMULARIO
  const formulario = document.querySelector("#form-retencion")
  const datosformulario = new FormData(formulario)
  // const jsonData = {};
  datosformulario.forEach((value, key) => {
    jsonData[key] = value;
  });

  var ck = sessionStorage.getItem('company_key') || '';

  //ENVIO DATOS
  fetch("/comprasapp/guardarRetencion/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,
      'X-Company-Key': ck,
    },
    body: JSON.stringify({ tabla: filas, forma: jsonData }),

  })

    .then(response => {
      if (!response.ok) {
        // Antes: window.location.reload();
        const url = new URL(window.location.href);
        url.searchParams.set('scrollTop', '1');
        sessionStorage.setItem('errorMsg', 'Oops!", "Ocurrio un error al guardar, comunique a sistemas');
        window.location.href = url.toString();
        throw new Error('Error en la respuesta del servidor');
      }
      return response.json();
    })
    .then(data => {
      if (data.redirect_url) {
        // Redirige al usuario a la URL devuelta por el servidor
        sessionStorage.setItem("form_enviado", "true");
        //swal.fire("Oops!", "Retención generada", "success"); -->muestra pero no espera confirmacion, desaparce y va al resumen
        window.location.href = data.redirect_url;
      } else {
        console.error('No se recibió URL de redirección');
      }
    })
    .catch(error => {
      console.error('Hubo un problema con la solicitud:', error);
    });
});

function sumarTotalRetencion() {
  /* Suma campos del total de cada tipo, fte e iva*/
  var totalRet = 0;
  var totalRetFte = document.getElementById("valRetenidoFte").value;
  var totalRetIva = document.getElementById("valRetenidoIva").value;
  if (totalRetFte.length === 0) {
    totalRetFte = 0;
  }
  if (totalRetIva.length === 0) {
    totalRetIva = 0;
  }
  totalRet = parseFloat(totalRetFte) + parseFloat(totalRetIva);
  document.getElementById("totRetencion").value =
    totalRet.toLocaleString("en-US");
}

/*eventos pestañas iva*/
const litab = document.querySelectorAll('.litabi')
const bloquetab = document.querySelectorAll('.bloquetabi')
const atab = document.querySelectorAll('.atabi')

litab.forEach((cadalitab, i) => {
  litab[i].addEventListener('click', () => {
    litab.forEach((cadalitab, i) => {
      litab[i].classList.remove('active')
      bloquetab[i].classList.remove('active')
      atab[i].classList.remove('active')
    })
    litab[i].classList.add('active')
    bloquetab[i].classList.add('active')
    atab[i].classList.add('active')
  })
})

/*eventos pestañas fuente*/
const litabf = document.querySelectorAll('.litabf')
const bloquetabf = document.querySelectorAll('.bloquetabf')
const atabf = document.querySelectorAll('.atabf')

litabf.forEach((cadalitab, i) => {
  litabf[i].addEventListener('click', () => {
    litabf.forEach((cadalitab, i) => {
      litabf[i].classList.remove('active')
      bloquetabf[i].classList.remove('active')
      atabf[i].classList.remove('active')
    })
    litabf[i].classList.add('active')
    bloquetabf[i].classList.add('active')
    atabf[i].classList.add('active')
  })
})

