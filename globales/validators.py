VALIDACIONES = {
    "codplantilla":{"tabla": "ocxxt010", "campo": "pc_codigo"}, 
    "codgrupo":{"tabla" : "ocxxt013", "campo" : "mc_codgrp", "condicion" : "mc_codpro"},
    "centrogastos":{"tabla": "ocxxt012", "campo" : "ct_codgrp"},
    "plantillaPeriodicaCtb": {"tabla":"cgrta035", "campo":"pt_subgrupo"}
}

CONSULTAS = {
    "proveedor":{
        "tabla": "ciatt011", 
        "campos": ["pv_aut_sri","pv_region","pv_contesp","pv_autimp","pv_nombre","pv_cedruc","pv_mail","pv_codigo","pv_actpro","pv_person","pv_serie"],
        "condicion": "pv_codigo", 
        "condicionAux": None, 
        "estado" : "pv_estado ",
        "group" : None
    },
    "centroGastos":{
        "tabla": "ocxxt012",
        "campos": ["ct_grupo"],
        "condicion": "ct_codgrp",
        "condicionAux": None, 
        "estado": None,
        "group": "ct_grupo"
    },
    "cuentaContable":{
        "tabla": "cgrta001",
        "campos": ["ct_descripcion"],
        "condicion": "ct_cuenta",
        "condicionAux": "ct_compania = 'e'", 
        "estado": "ct_estado",
        "group" : None
    }
}
