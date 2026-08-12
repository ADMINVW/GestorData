import json
import re
import unicodedata
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.http import JsonResponse
from django.db import connections, transaction
from core.db_context import get_db_from_request
from core.permisos import validar_acceso
from .models import AyudaModulo
from zoneinfo import ZoneInfo
from django.utils import timezone

@csrf_exempt
@require_POST

def guardar_accesos(request):
    db_alias = get_db_from_request(request)

    data = json.loads(request.body)
    login = data.get("login")
    accesos = data.get("accesos", [])

    if not login:
        return JsonResponse({"error": "No se recibió usuario"}, status=400)
        
    with connections[db_alias].cursor() as cur:
        for acceso in accesos:
            sistema = acceso.get("sistema")
            activo = acceso.get("activo")

            if activo: 
                cur.execute("""
                    SELECT COUNT(*)
                    FROM acceso
                    WHERE login = ?
                    AND sistema = ?
                """, [login, sistema])

                existe = cur.fetchone()[0]

                if existe == 0:
                    cur.execute("""
                        INSERT INTO acceso (login, sistema, maxses, numses)
                        VALUES (?, ?, 2, 0)
                    """, [login, sistema])
            else:
                cur.execute("""
                    DELETE FROM acceso
                    WHERE login = ?
                    AND sistema = ?
                """, [login, sistema])

    return JsonResponse({"ok": True})

def usuarios(request):
    
     # if not validar_acceso(request, 'AC'):
     #   return render(request, 'core/acceso_denegado.html')

    db_alias = get_db_from_request(request)
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT 
                MIN(us_login),
                us_nombre
            FROM ciatt004
            WHERE us_nombre IS NOT NULL
            GROUP BY us_nombre
            ORDER BY us_nombre
        """)

        usuarios = [
            {
                "login": str(row[0]).strip() if row[0] is not None else "",
          
                "nombre": str(row[1]).strip() if row[1] is not None else "",
            }
            for row in cur.fetchall()
        ]

    return render(request, 'usuarios.html', {
        'usuarios': usuarios,
        'company_key': company_key,
    })


def accesos_usuario(request):
    db_alias = get_db_from_request(request)
    login = request.GET.get('login', '').strip()

    sistemas = ['AC', 'CB', 'CJ', 'CO', 'CP', 'NO', 'OC', 'RE', 'SR', 'TA', 'VE']

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT sistema
            FROM acceso
            WHERE login = ?
        """, [login])

        sistemas_activos = [
            str(row[0]).strip()
            for row in cur.fetchall()
        ]

    accesos = []
    for sistema in sistemas:
        accesos.append({
            "sistema": sistema,
            "activo": sistema in sistemas_activos
        })

    return JsonResponse({'accesos': accesos})


def centro_gastos(request):

    company_key = request.GET.get('company') or request.session.get('active_company_key', '')

    return render(request, 'centro_gastos.html', {
        'company_key': company_key,
    })

@csrf_exempt
def guardar_nivel_centro_gastos(request):
    """
    Registra un nuevo nivel para la estructura de centros de gastos.

    El código del nivel se genera automáticamente tomando
    el mayor código existente para la compañía.
    """

    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    db_alias = get_db_from_request(request)
    data = json.loads(request.body)

    nombre = data.get("nombre", "").strip().upper()
    cia = "e"

    # El nombre es obligatorio para crear el nivel.
    if not nombre:
        return JsonResponse({"ok": False, "error": "Ingrese el nombre del nivel"}, status=400)

    with connections[db_alias].cursor() as cur:

        # Evita registrar dos niveles con el mismo nombre  dentro de la misma compañía.
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt014
            WHERE cn_codcia = ?
              AND UPPER(TRIM(cn_nomnivel)) = ?
        """, [cia, nombre])

        existe = cur.fetchone()[0]

        if existe > 0:
            return JsonResponse({
                "ok": False,
                "error": f"Ya existe el nivel '{nombre}'."
            })


        # Genera el siguiente código numérico disponible.
        # Si todavía no existen niveles, comienza desde 1.

        cur.execute("""
            SELECT COALESCE(MAX(cn_codnivel), 0) + 1
            FROM ciatt014
            WHERE cn_codcia = ?
        """, [cia])

        nuevo_nivel = cur.fetchone()[0]

        # Guarda el nuevo nivel en la tabla de configuración.
        cur.execute("""
            INSERT INTO ciatt014 (
                cn_codcia,
                cn_codnivel,
                cn_nomnivel
            )
            VALUES (?, ?, ?)
        """, [cia, nuevo_nivel, nombre])

    # Devuelve el registro creado para actualizar la interfaz.
    return JsonResponse({
        "ok": True,
        "cn_codcia": cia,
        "cn_codnivel": nuevo_nivel,
        "cn_nomnivel": nombre
    })


def listar_niveles_centro_gastos(request):
    # Consulta los niveles de centros de gastos registrados para la compañia y los devuelve ordenados por códigos.
    

    db_alias = get_db_from_request(request)
    cia = "e"

    with connections[db_alias].cursor() as cur:

         # Recupera todos los niveles configurados.
        cur.execute("""
            SELECT cn_codcia, cn_codnivel, cn_nomnivel
            FROM ciatt014
            WHERE cn_codcia = ?
            ORDER BY cn_codnivel
        """, [cia])

         # Convierte las filas obtenidas en objetos JSON.
        niveles = [
            {
                "cn_codcia": str(row[0]).strip(),
                "cn_codnivel": row[1],
                "cn_nomnivel": str(row[2]).strip(),
            }
            for row in cur.fetchall()
        ]

    return JsonResponse({"niveles": niveles})


@csrf_exempt
def guardar_seccion_centro_gastos(request):
    # Registra una sección de centro de gastos asociada a un nivel , cuenta y opcionalmente una bodega 
    
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    db_alias = get_db_from_request(request)
    data = json.loads(request.body)

    cia = "e"
    nivel = data.get("nivel")
    codigo = data.get("codigo", "").strip().upper()
    nombre = data.get("nombre", "").strip().upper()
    # bodega = data.get("bodega", "").strip().upper()
    cuenta = data.get("cuenta", "").strip().upper()

    # Valida los datos mínimos requeridos.
    if not nivel or not codigo or not nombre or not cuenta:
     return JsonResponse({"error": "Faltan datos"}, status=400)

    with connections[db_alias].cursor() as cur:
        # Inserta la sección con su nivel y cuenta .
        cur.execute("""
            INSERT INTO ciatt015
            (cg_cia, cg_nivel, cg_codseccion, cg_nomseccion,  cg_cuenta)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [cia, int(nivel), codigo, nombre,  cuenta])

    return JsonResponse({"ok": True})

def listar_secciones_centro_gastos(request):
    # Lista las secciones pertenecientes al nivel seleccionado
    

    db_alias = get_db_from_request(request)
    nivel = request.GET.get("nivel")
    cia = "e"

    if not nivel:
        return JsonResponse({"secciones": []})

    with connections[db_alias].cursor() as cur:
        # Consulta únicamente las secciones del nivel solicitado.
        cur.execute("""
            SELECT cg_cia, cg_nivel, cg_codseccion, cg_nomseccion,  cg_cuenta
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_nivel = ?
            ORDER BY cg_codseccion
        """, [cia, nivel])

        # Normaliza los valores de texto y controla campos nulos.
        secciones = [
            {
                "cg_cia": str(row[0]).strip(),
                "cg_nivel": row[1],
                "cg_codseccion": str(row[2]).strip(),
                "cg_nomseccion": str(row[3]).strip(),
                "cg_bodega": str(row[4]).strip() if row[4] is not None else "",
                "cg_cuenta": str(row[5]).strip() if row[5] is not None else ""
            }
            for row in cur.fetchall()
        ]

    return JsonResponse({"secciones": secciones})

@csrf_exempt
def guardar_jerarquia(request):
    """
    Crea un elemento dentro de la jerarquía de centros de gastos.

    El registro se asocia a un nivel y a un padre.
    El código de sección se genera automáticamente dentro de la ruta seleccionada.
    """
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    db_alias = get_db_from_request(request)
    data = json.loads(request.body)

    cia = "e"
    nivel = int(data.get("nivel"))
    nombre = data.get("nombre", "").strip().upper()
    padre = data.get("padre", "").strip()
    cuenta = data.get("cuenta", "").strip()

    # El valor "00" identifica la raíz de la jerarquía.
    if padre == "":
        padre = "00"

    # Nivel y nombre son obligatorios.
    if not nivel or not nombre:
        return JsonResponse({"ok": False, "error": "Faltan datos"}, status=400)
    
    # Desde el nivel 2 es obligatorio seleccionar un elemento del nivel anterior.
    if nivel > 1 and padre == "00":
        return JsonResponse({"ok": False, "error": "Debe seleccionar el nivel anterior"}, status=400)

    # La cuenta es obligatoria y debe contener solo números.
    if not cuenta:
        return JsonResponse({"ok": False, "error": "Ingrese la cuenta"}, status=400)

    if not cuenta.isdigit():
        return JsonResponse({"ok": False, "error": "La cuenta solo debe contener números"}, status=400)

    with connections[db_alias].cursor() as cur:

        # Evita repetir un nombre dentro del mismo nivel y bajo el mismo elemento padre.
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_nivel = ?
              AND cg_padre = ?
              AND UPPER(TRIM(cg_nomseccion)) = ?
        """, [cia, nivel, padre, nombre])

        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok": False,
                "error": f"Ya existe '{nombre}' en esta ruta."
            })

        # La cuenta debe ser única dentro de la compañia.
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_cuenta = ?
        """, [cia, cuenta])

        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok": False,
                "error": f"La cuenta '{cuenta}' ya existe."
            })

        # Busca el último código utilizado dentro del nivel y padre selecionados.
        cur.execute("""
            SELECT MAX(cg_codseccion)
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_nivel = ?
              AND cg_padre = ?
        """, [cia, nivel, padre])

        row = cur.fetchone()
        max_cod = row[0]

        # Genera el código consecutivo con dos dígitos.
        if max_cod is None:
            nuevo_codigo = "01"
        else:
            nuevo_codigo = str(int(str(max_cod).strip()) + 1).zfill(2)

        # Guarda el nuevo elemento de la jerarquía.
        cur.execute("""
            INSERT INTO ciatt015 (
                cg_cia,
                cg_nivel,
                cg_codseccion,
                cg_nomseccion,
                cg_cuenta,
                cg_padre
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, [cia, nivel, nuevo_codigo, nombre, cuenta, padre])

    return JsonResponse({
        "ok": True,
        "codigo": nuevo_codigo,
        "cuenta": cuenta,
        "padre": padre
        
    })

def listar_jerarquia(request):
    """
    Consulta la jerarquía de centros de gastos.

    Los parámetros nivel y padre son opcionales y permiten limitar los registros devueltos.
    """
    db_alias = get_db_from_request(request)
    nivel = request.GET.get("nivel")
    padre = request.GET.get("padre", "")
    cia = "e"

    # La consulta se construye agregando únicamente los filtros que fueron enviados
    where_extra = ""
    params = [cia]

    if nivel:
        where_extra += " AND cg_nivel = ? "
        params.append(int(nivel))

    if padre:
        where_extra += " AND cg_padre = ? "
        params.append(padre)

    with connections[db_alias].cursor() as cur:

        # Consulta la jerarquía completa o filtrada
        cur.execute(f"""
            SELECT 
                cg_cia,
                cg_nivel,
                cg_codseccion,
                cg_nomseccion,
                cg_cuenta,
                cg_padre
            FROM ciatt015
            WHERE cg_cia = ?
            {where_extra}
            ORDER BY cg_nivel, cg_cuenta
        """, params)

        registros = [
            {
                "cg_cia": str(row[0]).strip(),
                "cg_nivel": row[1],
                "cg_codseccion": str(row[2]).strip(),
                "cg_nomseccion": str(row[3]).strip(),
                "cg_cuenta": str(row[4]).strip() if row[4] else "",
                "cg_padre": str(row[5]).strip() if row[5] else "",
            }
            for row in cur.fetchall()
        ]

    return JsonResponse({"registros": registros})


def siguiente_codigo(request):
    """
    Calcula el siguiente código disponible para una sección,
    considerando su nivel y elemento padre.

    Esta vista solo presenta una vista previa del código;
    no guarda información.
    """

    db_alias = get_db_from_request(request)

    cia = "e"
    nivel = int(request.GET.get("nivel"))
    padre = request.GET.get("padre", "").strip()

    # El padre "00" representa el primer nivel.
    if padre == "":
        padre = "00"

    with connections[db_alias].cursor() as cur:

        # Busca el mayor código usado dentro de la misma ruta.
        cur.execute("""
            SELECT MAX(cg_codseccion)
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_nivel = ?
              AND cg_padre = ?
        """, [cia, nivel, padre])

        row = cur.fetchone()
        max_cod = row[0]

    # Genera el siguiente consecutivo con dos dígitos.
    if max_cod is None:
        codigo = "01"
    else:
        codigo = str(int(str(max_cod).strip()) + 1).zfill(2)

    return JsonResponse({
        "codigo": codigo,
    })

def buscar_ruta_cg(request):
    """
    Busca los elementos descendientes de una ruta
    dentro de la jerarquía de centros de gastos.
    """
    db_alias = get_db_from_request(request)

    ruta = request.GET.get("ruta", "").strip()
    cia = "e"

    if not ruta:
        return JsonResponse({"resultados": []})

    # Informix utiliza MATCHES y el * como comodín para buscar rutas descendientes.
    patron = ruta + "*"

    with connections[db_alias].cursor() as cur:

        # Recupera los registros cuyo padre comienza con la ruta indicada
        cur.execute("""
            SELECT cg_cuenta,
                   cg_padre,
                   cg_nivel,
                   cg_codseccion,
                   cg_nomseccion
            FROM ciatt015
            WHERE cg_cia = ?
              AND cg_padre MATCHES ?
            ORDER BY cg_cuenta
        """, [cia, patron])

        resultados = [
            {
                "cg_cuenta": str(row[0]).strip(),
                "cg_padre": str(row[1]).strip(),
                "cg_nivel": row[2],
                "cg_codseccion": str(row[3]).strip(),
                "cg_nomseccion": str(row[4]).strip(),
            }
            for row in cur.fetchall()
        ]

    return JsonResponse({"resultados": resultados})


def bodegas(request):

    company_key = request.GET.get('company') or request.session.get('active_company_key', '')

    return render(request, 'bodegas.html', {
        'company_key': company_key,
    })


@csrf_exempt
def listar_padres_bodega(request):
    """
 Obtiene los registros que pueden utilizarse como ubicación padre
 al crear una bodega, según el nivel seleccionado.

 Para nivel 2 agrupa agencias repetidas; para niveles superiores
 conserva la ruta jerárquica y el contexto de padre y abuelo.
    """
    db_alias = get_db_from_request(request)

    nivel_raw = request.GET.get("nivel", "").strip()
    cia = "e"

    if not nivel_raw:
        return JsonResponse({
            "ok": True,
            "padres": []
        })

    try:
        nivel = int(nivel_raw)
    except (TypeError, ValueError):
        return JsonResponse({
            "ok": False,
            "error": "El nivel seleccionado no es válido.",
            "padres": []
        }, status=400)

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT
                cg_nivel,
                cg_codseccion,
                cg_nomseccion,
                cg_cuenta,
                cg_padre
            FROM ciatt015
            WHERE cg_cia = ?
            ORDER BY cg_nivel, cg_codseccion
        """, [cia])

        filas = cur.fetchall()

    registros = []
    mapa_rutas = {}

    for row in filas:
        nivel_fila = int(row[0])
        codseccion = str(row[1]).strip() if row[1] is not None else ""
        nomseccion = str(row[2]).strip() if row[2] is not None else ""
        cuenta = str(row[3]).strip() if row[3] is not None else ""
        padre = str(row[4]).strip() if row[4] is not None else ""

        ruta_id = ( # Reconstruye la ruta jerárquica de cada registro para poder localizar posteriormente su padre ya abuelo.
            codseccion
            if padre in ("", "00")
            else padre + codseccion
        )

        registro = {
            "nivel": nivel_fila,
            "codseccion": codseccion,
            "nomseccion": nomseccion,
            "cuenta": cuenta,
            "padre": padre,
            "ruta_id": ruta_id
        }

        registros.append(registro)
        mapa_rutas[ruta_id] = registro

    padres = []

    # En nivel 2 una misma agencia puede aparecer en varias rutas
    if nivel == 2:
        agencias_vistas = {}

        for registro in registros:
            if registro["nivel"] != 2:
                continue

            clave = registro["nomseccion"].strip().upper()

            if clave not in agencias_vistas:
                agencias_vistas[clave] = registro
                continue

            # Conservamos el código menor como identificador representativo
            actual = agencias_vistas[clave]

            if registro["codseccion"] < actual["codseccion"]:
                agencias_vistas[clave] = registro

        for registro in agencias_vistas.values():
            padres.append({
                "nivel": 2,
                "codseccion": registro["codseccion"],
                "nomseccion": registro["nomseccion"],

                # Para agencia única se trabaja con el identificador
                "identificador": registro["codseccion"],
                "cuenta": registro["codseccion"],

                "nombre_padre": "",
                "nombre_abuelo": ""
            })

        padres.sort(
            key=lambda item: (
                item["codseccion"],
                item["nomseccion"]
            )
        )

    # Se mantiene la cuenta real y el contexto jerárquico para diferenciar registros con nombres similares.
    else:
        for registro in registros:
            if registro["nivel"] != nivel:
                continue

            padre_registro = mapa_rutas.get(registro["padre"])
            abuelo_registro = None

            if padre_registro:
                abuelo_registro = mapa_rutas.get(
                    padre_registro["padre"]
                )

            padres.append({
                "nivel": registro["nivel"],
                "codseccion": registro["codseccion"],
                "nomseccion": registro["nomseccion"],

                # Marca y Línea siguen vinculadas a su cuenta real
                "identificador": registro["cuenta"],
                "cuenta": registro["cuenta"],

                "nombre_padre": (
                    padre_registro["nomseccion"]
                    if padre_registro
                    else ""
                ),
                "nombre_abuelo": (
                    abuelo_registro["nomseccion"]
                    if abuelo_registro
                    else ""
                )
            })

        padres.sort(
            key=lambda item: (
                item["cuenta"],
                item["nomseccion"]
            )
        )

    return JsonResponse({
        "ok": True,
        "padres": padres
    })

@csrf_exempt
def guardar_bodega(request):
    """
    Registra una nueva bodega dentro de una ubicación jerárquica.

    La cuenta se genera concatenando el identificador del padre
    con el código de bodega y el identificador interno se genera automáticamente.
    """

    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)
    
    db_alias = get_db_from_request(request)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False,"error": "Los datos enviados no son válidos"}, status=400)

    nivel = data.get("nivel")
    codbodega = data.get("codbodega", "").strip().upper()
    nombodega = data.get("nombodega", "").strip().upper()
    padre = data.get("padre", "").strip()

    if not nivel :
        return JsonResponse({"ok": False, "error": "Seleccione el nivel"}, status=400)
    try: 
        nivel = int(nivel)
    except (TypeError, ValueError):
        return JsonResponse({"ok" : False,"error": "El nivel no es valido"}, status=400)
    
    if not padre: 
        return JsonResponse({"ok": False, "error": "Sleccione la agencia"}, status=400)
    
    if not codbodega :
        return JsonResponse({"ok": False, "error":" Ingrese el codigo de la bodega"}, status=400)
    
    if not nombodega: 
        return JsonResponse({"ok": False, "error": "Ingrese el nombre de la bodega"}, status=400)
    
    if len(codbodega) > 2:
        return JsonResponse({"ok": False, "error":"El código de bodega debe tener máximo 2 caracteres"}, status=400)
    
    cuenta = padre + codbodega # La cuenta conserva la ruta del padre y agrega la abreviatura de la bodega

    with connections[db_alias].cursor() as cur:

        #  Validar nombre repetido dentro de la misma agencia
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt915
            WHERE bd_padre = ?
               AND UPPER(TRIM(bd_nombodega)) = ?
        """, [padre, nombodega])

        if cur.fetchone()[0]  > 0:
            return JsonResponse({
                "ok": False,
                "error": f"Ya existe la bodega '{nombodega}' para esta agencia."
            }, status=400)

        # Validar abreviatura repetida dentro de la misma agencia
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt915
            WHERE bd_padre = ?
                AND bd_codbodega = ?
        """, [ padre, codbodega])


        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok" : False,
                "error" : f"El código de bodega '{codbodega}' ya existe para esta agencia."
            }, status=400) 
        

        # Validar cuenta repetida
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt915
            WHERE bd_cuenta = ?
        """, [cuenta])

        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok": False,
                "error": f"La cuenta de bodega '{cuenta}' ya existe."
            }, status=400)
        
        # Identificador automatico de la bodega dentro de la agencia
        cur.execute("""
            SELECT MAX(bd_codseccion)
            FROM ciatt915
            WHERE bd_nivel = ?
                AND bd_padre = ?
        """,[nivel, padre])


        row = cur.fetchone()
        max_codigo = row[0]

        if max_codigo is None:
            nuevo_codigo = "01"
        else:
            try:
                nuevo_codigo = str(
                    int(str(max_codigo).strip()) + 1
                ).zfill(2)
            except ValueError:
                return JsonResponse({
                    "ok": False,
                    "error": (
                        "No se pudo generar el identificador automático "
                        "de la bodega."
                    )
                }, status=500)

        # Guarda la bodega únicamente después de superar todas las validaciones.
        cur.execute("""
            INSERT INTO ciatt915 ( 
                bd_nivel,
                bd_codseccion,
                bd_codbodega,
                bd_nombodega,
                bd_padre,
                bd_cuenta
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            nivel,
            nuevo_codigo,
            codbodega,
            nombodega,
            padre,
            cuenta
        ])

    return JsonResponse({
        "ok": True,
        "bd_codseccion": nuevo_codigo,
        "bd_codbodega": codbodega,
        "bd_nombodega": nombodega,
        "bd_padre": padre,
        "bd_cuenta": cuenta
    })


def listar_bodegas(request):
    # Lista las bodegas registradas y complementa cada registro con el nombre de la agencia asociada.

    db_alias = get_db_from_request(request)
    cia = "e"

    bodegas = []

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT
                bd_nivel,
                bd_codseccion,
                bd_codbodega,
                bd_nombodega,
                bd_padre,
                bd_cuenta
            FROM ciatt915
            ORDER BY bd_padre, bd_codseccion
        """)

        filas = cur.fetchall()

        for fila in filas: # El padre almacenado en la bodega corresponde al código de la agenica.
            nivel = fila[0]

            codseccion = (
                str(fila[1]).strip()
                if fila[1] is not None
                else ""
            )

            codbodega = (
                str(fila[2]).strip()
                if fila[2] is not None
                else ""
            )

            nombodega = (
                str(fila[3]).strip()
                if fila[3] is not None
                else ""
            )

            padre = (
                str(fila[4]).strip()
                if fila[4] is not None
                else ""
            )

            cuenta = (
                str(fila[5]).strip()
                if fila[5] is not None
                else ""
            )

            nombre_agencia = ""

            # MIN permite obtener un único nombre cuando existen varias filas asociadas al mismo código de agencia.
            cur.execute("""
                SELECT MIN(cg_nomseccion) 
                FROM ciatt015
                WHERE cg_cia = ?
                  AND cg_nivel = ?
                  AND cg_codseccion = ?
            """, [cia, 2, padre])

            agencia = cur.fetchone()

            if agencia and agencia[0] is not None:
                nombre_agencia = str(agencia[0]).strip()

            bodegas.append({
                "bd_nivel": nivel,
                "bd_codseccion": codseccion,
                "bd_codbodega": codbodega,
                "bd_nombodega": nombodega,
                "bd_padre": padre,
                "bd_cuenta": cuenta,
                "nombre_agencia": nombre_agencia,
            })

    return JsonResponse({
        "ok": True,
        "bodegas": bodegas
    })


def niveles_disponibles_cg(request):
    """
    Devuelve los niveles configurados para Centros de Gastos.
    Estos niveles se reutilizan en otros formularios, como Bodegas.
    """
    db_alias = get_db_from_request(request)
    cia = "e"

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT cn_codnivel, cn_nomnivel
            FROM ciatt014
            WHERE cn_codcia = ?
            ORDER BY cn_codnivel
        """, [cia])

        niveles = [
            {
                "nivel": row[0],
                "nombre": str(row[1]).strip()
            }
            for row in cur.fetchall()
        ]

    return JsonResponse({"niveles": niveles})

# vista de condiguraciones de menus 

def configuracion_menus(request):
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')

    return render(request, 'configuracion_menus.html', {
        'company_key': company_key,
    })

def listar_configuracion_menus(request):
    # Consulta los menús disponibles para el perfil activo y los devuelve ordenados por nivel y código.
    
    db_alias =get_db_from_request(request)

    # Temporalmente se obtienen del usuario autenticado

    codperfil= request.session.get("pf_codperfil", "S")
    nivelperfil = request.session.get("pf_nivelperfil", 1)


    with connections[db_alias].cursor() as cur: # Solo se muestran los mnús pertenecientes al perfil activo.
        cur.execute(""" 
            SELECT  
                pf_codperfil,
                pf_nivelperfil,
                pf_padremenu,
                pf_nivelmenu,
                pf_codmenu,
                pf_nommenu
            FROM ciatt010
            WHERE pf_codperfil = ?
              AND pf_nivelperfil = ?
            ORDER BY pf_nivelmenu, pf_codmenu
        """, [codperfil, nivelperfil])

        menus = [
            {
            "pf_codperfil": (
                str(row[0]).strip()
                if row[0] is not None
                else ""
            ),
            "pf_nivelperfil": row[1],
            "pf_padremenu": (
                str(row[2]).strip()
                if row[2] is not None
                else ""

            ),
            "pf_nivelmenu": row[3],
            "pf_codmenu": (
                str(row[4]).strip()
                if row[4] is not None
                else ""

            ),
            "pf_nommenu": (
                str(row[5]).strip()
                if row[5] is not None
                else ""

            ),

        }
        for row in cur.fetchall()
     ]
    
    return JsonResponse({
        "ok": True,
        "menus": menus
    })


def niveles_disponibles_menu(request):
    """
    Devuelve los niveles disponibles para crear menús desde el formulario principal.
    Actualmente solo se permite crear directamente el nivel 1.
    """
    db_alias = get_db_from_request(request)

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT MAX(pf_nivelmenu)
            FROM ciatt010
        """)

        row = cur.fetchone()
        max_nivel = int(row[0]) if row and row[0] is not None else 0

    ultimo_nivel_disponible = max(max_nivel + 1, 1)

    niveles = [ # La creación de niveles superiores se realiza desde un menú padre
    {
        "nivel": 1,
        "nombre": "MENÚ PRINCIPAL"
    }
    ]

    

    return JsonResponse({
        "ok": True,
        "niveles": niveles
    })

def listar_padres_menu(request):
    # Devuelve los menús del nivel inmediatamente anterior que pueden actuar como padre del nivel seleccionado
    
    db_alias= get_db_from_request(request)

    nivel_raw = request.GET.get("nivel", "").strip()

    if not nivel_raw:
        return JsonResponse({
            "ok": True,
            "padres": []
        })
    try:
        nivel = int(nivel_raw)
    except (TypeError, ValueError):
        return JsonResponse ({
            "ok": False,
            "error": "El nivel no es válido.",
            "padres": []
        }, status=400)
    
    if nivel <= 1:
        return JsonResponse({
            "ok": True,
            "padres": []
        })
    
    codperfil = request.session.get("pf_codperfil", "S")
    nivelperfil = request.session.get("pf_nivelperfil", 1)

    nivel_padre = nivel - 1 # Un submenú solo puede depender de un menú del nivel anterior

    with connections[db_alias].cursor() as cur: # La búsqueda queda limitada al perfil activo del usuario
        cur.execute(""" 
            SELECT
                pf_codmenu,
                pf_nommenu,
                pf_padremenu,
                pf_nivelmenu
            FROM ciatt010
            WHERE pf_codperfil = ?
             AND  pf_nivelperfil = ?
             AND  pf_nivelmenu = ?
            ORDER BY pf_codmenu 
        """,[
            codperfil,
            nivelperfil,
            nivel_padre
        ])

        padres = [
            {  
                "codmenu": (
                    str(row[0]).strip()
                    if row[0] is not None
                    else ""
                ),
                "nommenu": (
                    str(row[1]).strip()
                    if row[1] is not None
                    else ""
                ),
                "padremenu": (
                    str(row[2]).strip()
                    if row[2] is not None
                    else ""
                ),
                "nivelmenu": row[3],
            }
            for row in cur.fetchall()
        ]

    return  JsonResponse({
          "ok": True,
          "padres": padres
      })

@csrf_exempt
def guardar_configuracion_menu(request):
    """
    Crea menús principales y submenús.

    Los menús principales reciben su código desde el formulario.
    Los submenús generan automáticamente su código a partir
    del código del padre, el nuevo nivel y el nombre normalizado.
    """
    if request.method != "POST":
        return JsonResponse({
            "ok": False,
            "error": "Método no permitido."
        }, status=405)

    db_alias = get_db_from_request(request)

    #  Obtener información enviada
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({
            "ok": False,
            "error": "Los datos enviados no son válidos."
        }, status=400)

    # Preparar datos generales
    nommenu = str(
        data.get("nommenu", "")
    ).strip().upper()

    codigo_padre = str(
        data.get("codigopadre", "")
    ).strip().upper()

    codmenu_enviado = str(
        data.get("codmenu", "")
    ).strip().upper()

    codperfil = request.session.get(
        "pf_codperfil",
        "S"
    )

    nivelperfil = request.session.get(
        "pf_nivelperfil",
        1
    )

    
    if not nommenu:
        return JsonResponse({
            "ok": False,
            "error": "Ingrese el nombre del menú."
        }, status=400)

    with connections[db_alias].cursor() as cur:

        #  Determinar si es menú principal o submenú
        if codigo_padre:
            
            
          
            # Verifica que el código padre exista dentro del mismo perfil.
            cur.execute("""
                SELECT
                    pf_codmenu,
                    pf_nommenu,
                    pf_nivelmenu
                FROM ciatt010
                WHERE pf_codperfil = ?
                  AND pf_nivelperfil = ?
                  AND UPPER(TRIM(pf_codmenu)) = ?
            """, [
                codperfil,
                nivelperfil,
                codigo_padre
            ])

            padre = cur.fetchone()

            if not padre:
                return JsonResponse({
                    "ok": False,
                    "error": (
                        f"El menú padre con código "
                        f"'{codigo_padre}' no existe."
                    )
                }, status=400)

            codigo_padre_real = (
                str(padre[0]).strip().upper()
                if padre[0] is not None
                else ""
            )

            nombre_padre = (
                str(padre[1]).strip().upper()
                if padre[1] is not None
                else ""
            )

            padremenu = codigo_padre_real

            try:
                nivel_padre = int(padre[2])
            except (TypeError, ValueError):
                return JsonResponse({
                    "ok": False,
                    "error": (
                        "El nivel del menú padre "
                        "no es válido."
                    )
                }, status=400)

            nivelmenu = nivel_padre + 1 # El nivel del nuevo submenú siempre es uno mayor +1  que el de su padre

            prefijo = obtener_prefijo_codigo_menu( # Construye automáticamente el código manteniendo
                codigo_padre_real,
                nivel_padre
            )

            nombre_codigo = normalizar_nombre_codigo_menu(
                nommenu
            )

            if not prefijo:
                return JsonResponse({
                    "ok": False,
                    "error": (
                        "No se pudo determinar el prefijo "
                        f"del código padre '{codigo_padre_real}'."
                    )
                }, status=400)

            if not nombre_codigo:
                return JsonResponse({ 
                    "ok": False,
                    "error": (
                        "El nombre no permite generar "
                        "un código válido."
                    )
                }, status=400)

            codmenu = ( # Formato generado: PREFIJO + NIVEL + "_" + NOMBRE_NORMALIZADO
                f"{prefijo}"
                f"{nivelmenu}_"
                f"{nombre_codigo}"
            )

        else:
            
            # Un menú principal no tiene un padre externo y pertenece al nivel 
            try:
                nivelmenu = int(
                    data.get("nivelmenu", 1)
                )
            except (TypeError, ValueError):
                return JsonResponse({
                    "ok": False,
                    "error": "El nivel del menú no es válido."
                }, status=400)

            if nivelmenu != 1:
                return JsonResponse({
                    "ok": False,
                    "error": (
                        "Para crear un submenú debe "
                        "seleccionar un menú padre."
                    )
                }, status=400)

            codmenu = codmenu_enviado
            padremenu = codmenu # En los menús principales el propio código se guarda como padre raíz

            if not codmenu:
                return JsonResponse({
                    "ok": False,
                    "error": (
                        "Ingrese el código del menú principal."
                    )
                }, status=400)

        # El código debe ser único dentro del perfil.
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt010
            WHERE pf_codperfil = ?
              AND pf_nivelperfil = ?
              AND UPPER(TRIM(pf_codmenu)) = ?
        """, [
            codperfil,
            nivelperfil,
            codmenu
        ])

        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok": False,
                "error": (
                    f"El código de menú "
                    f"'{codmenu}' ya existe."
                )
            }, status=400)

        # Evita nombres duplicados dentro del mismo nivel y padre
        cur.execute("""
            SELECT COUNT(*)
            FROM ciatt010
            WHERE pf_codperfil = ?
              AND pf_nivelperfil = ?
              AND pf_nivelmenu = ?
              AND UPPER(TRIM(pf_padremenu)) = ?
              AND UPPER(TRIM(pf_nommenu)) = ?
        """, [
            codperfil,
            nivelperfil,
            nivelmenu,
            padremenu,
            nommenu
        ])

        if cur.fetchone()[0] > 0:
            return JsonResponse({
                "ok": False,
                "error": (
                    f"Ya existe el menú '{nommenu}' "
                    f"dentro de '{padremenu}'."
                )
            }, status=400)

        # Guarda la relación jerárquica definitiva del menú
        cur.execute("""
            INSERT INTO ciatt010 (
                pf_codperfil,
                pf_nivelperfil,
                pf_padremenu,
                pf_nivelmenu,
                pf_codmenu,
                pf_nommenu
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            codperfil,
            nivelperfil,
            padremenu,
            nivelmenu,
            codmenu,
            nommenu
        ])

    
    return JsonResponse({
        "ok": True,
        "menu": {
            "pf_codperfil": codperfil,
            "pf_nivelperfil": nivelperfil,
            "pf_padremenu": padremenu,
            "pf_nivelmenu": nivelmenu,
            "pf_codmenu": codmenu,
            "pf_nommenu": nommenu
        }
    })

def obtener_prefijo_codigo_menu(codigo, nivel_actual):
    # Extrae del código de un menú el prefijo utilizado para generar códigos de sus niveles descendintes
    
    codigo_limpio = str(
        codigo or ""
    ).strip().upper()

    try:
        nivel_texto = str(
            int(nivel_actual)
        )
    except (TypeError, ValueError):
        return ""

    if not codigo_limpio or "_" not in codigo_limpio:
        return ""

    cabecera = codigo_limpio.split("_", 1)[0] # Solo se analiza la parte anterior al guion bajo.

    if not cabecera.endswith(nivel_texto): # El código debe terminar con el nivel actual para poder retirar ese número.
        return ""

    return cabecera[:-len(nivel_texto)]

#############
def normalizar_nombre_codigo_menu(nombre):
    """
    Quita las palabras ignoradas para reducir texto  del codigo de los menús.
    """
    palabras_ignoradas = { # Estas palabras se excluyen para mantener códigos más cortos.
        "DE",
        "DEL",
        "LA",
        "LAS",
        "EL",
        "LOS"
    }

    texto = str(nombre or "").strip().upper() 

    texto = unicodedata.normalize("NFD",texto) # Se eliminan tildes para que el código use únicamente caracteres simples

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    palabras = re.findall(
        r"[A-Z0-9]+",
        texto
    )

    palabras = [
        palabra
        for palabra in palabras
        if palabra not in palabras_ignoradas
    ]

    return "".join(palabras)

    

@csrf_exempt
def eliminar_configuracion_menu(request):
    # Elimina un menú y todos sus descendientes dentro del mismo perfil
    if request.method != "POST":
        return JsonResponse({
            "ok": False,
            "error": "Método no permitido."
        }, status=405)

    db_alias = get_db_from_request(request)

    #  Obtener información enviada
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({
            "ok": False,
            "error": "Los datos enviados no son válidos."
        }, status=400)

    codmenu = str(
        data.get("codmenu", "")
    ).strip().upper()

    codperfil = request.session.get(
        "pf_codperfil",
        "S"
    )

    nivelperfil = request.session.get(
        "pf_nivelperfil",
        1
    )

    #  Validaciones
    if not codmenu:
        return JsonResponse({
            "ok": False,
            "error": "No se recibió el código del menú."
        }, status=400)

    try:
        with transaction.atomic(using=db_alias): # Toda la eliminación se confirma o revierte como una sola operación

            with connections[db_alias].cursor() as cur:

                #  Comprobar que el menú existe
                cur.execute("""
                    SELECT
                        pf_codmenu,
                        pf_nommenu,
                        pf_padremenu,
                        pf_nivelmenu
                    FROM ciatt010
                    WHERE pf_codperfil = ?
                      AND pf_nivelperfil = ?
                      AND UPPER(TRIM(pf_codmenu)) = ?
                """, [
                    codperfil,
                    nivelperfil,
                    codmenu
                ])

                menu_principal = cur.fetchone()

                if not menu_principal:
                    return JsonResponse({
                        "ok": False,
                        "error": (
                            f"El menú con código "
                            f"'{codmenu}' no existe."
                        )
                    }, status=404)

                #  Obtener todos los menús del perfil
                cur.execute("""
                    SELECT
                        pf_codmenu,
                        pf_padremenu,
                        pf_nivelmenu
                    FROM ciatt010
                    WHERE pf_codperfil = ?
                      AND pf_nivelperfil = ?
                """, [
                    codperfil,
                    nivelperfil
                ])

                registros = cur.fetchall()

                menus = []

                for row in registros:
                    codigo = (
                        str(row[0]).strip().upper()
                        if row[0] is not None
                        else ""
                    )

                    codigo_padre = (
                        str(row[1]).strip().upper()
                        if row[1] is not None
                        else ""
                    )

                    try:
                        nivel = int(row[2])
                    except (TypeError, ValueError):
                        nivel = 0

                    menus.append({
                        "codigo": codigo,
                        "padre": codigo_padre,
                        "nivel": nivel
                    })

                #  Localizar todos los descendientes
                codigos_eliminar = {codmenu}

                se_encontraron_hijos = True

                while se_encontraron_hijos: # Recorre repetidamente la jerarquía hasta que no aparezcan nuevos descendientes.
                    se_encontraron_hijos = False

                    for menu in menus:
                        if (
                            menu["padre"] in codigos_eliminar
                            and
                            menu["codigo"] not in codigos_eliminar
                        ):
                            codigos_eliminar.add(
                                menu["codigo"]
                            )

                            se_encontraron_hijos = True

                #  Ordenar desde el nivel más profundo
                menus_eliminar = [
                    menu
                    for menu in menus
                    if menu["codigo"] in codigos_eliminar
                ]

                menus_eliminar.sort(
                    key=lambda menu: menu["nivel"],
                    reverse=True
                )

                #  Eliminar hijos antes que padres
                for menu in menus_eliminar:
                    cur.execute("""
                        DELETE FROM ciatt010
                        WHERE pf_codperfil = ?
                          AND pf_nivelperfil = ?
                          AND UPPER(TRIM(pf_codmenu)) = ?
                    """, [
                        codperfil,
                        nivelperfil,
                        menu["codigo"]
                    ])

    
        return JsonResponse({
            "ok": True,
            "mensaje": "Menú eliminado correctamente.",
            "eliminados": len(codigos_eliminar),
            "codigos_eliminados": list(
                codigos_eliminar
            )
        })

    except Exception as error:
        print(
            "ERROR ELIMINANDO MENÚ:",
            error
        )

        return JsonResponse({
            "ok": False,
            "error": (
                "Ocurrió un error al eliminar "
                "el menú."
            )
        }, status=500)


# Vistas para la configuración de ayudas

def configuracion_ayudas(request):
# Carga la pantalla de administración de ayudas manteniendo la compañia activa en el contexto
    company_key = (
        request.GET.get("company")
        or request.session.get(
            "active_company_key",
            "",
        )
    )

    return render(
        request,
        "configuracion_ayudas.html",
        {
            "company_key": company_key,
        },
    )

ZONA_HORARIA_ECUADOR = ZoneInfo( # las fechas se almacenan con zona horaria
    "America/Guayaquil"
)

def listar_ayudas(request):
    # Devuelve todas las ayudas configuradas ordenadas por módulo y título
    ayudas_queryset = (
        AyudaModulo.objects
        .all()
        .order_by(
            "modulo",
            "titulo",
        )
    )

    ayudas = [
        {
            "id": ayuda.id,
            "codigo_menu": ayuda.codigo_menu,
            "modulo": ayuda.modulo,
            "titulo": ayuda.titulo,
            "descripcion": ayuda.descripcion,
            "objetivo": ayuda.objetivo,
            "proceso": ayuda.proceso,
            "consejos": ayuda.consejos,
            "activo": ayuda.activo,
            "fecha_actualizacion": ( # Convierte la fecha al horario local antes de mostrarla al usuario 
                     timezone.localtime(
                     ayuda.fecha_actualizacion,
                     ZONA_HORARIA_ECUADOR
                 ).strftime(
               "%d/%m/%Y %H:%M"
    )
),
        }
        for ayuda in ayudas_queryset
    ]

    return JsonResponse({
        "ok": True,
        "ayudas": ayudas,
    })

@csrf_exempt
def guardar_ayuda(request): 
    # Crea una nueva ayuda o actualiza una existente 
    # La presencia del ID determina si la operación es creación o edición
    if request.method != "POST":
        return JsonResponse({
            "ok": False,
            "error": "Método no permitido.",
        }, status=405)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({
            "ok": False,
            "error": "Los datos enviados no son válidos.",
        }, status=400)

    # Normaliza los campos principales recibidos desde el formulario 
    codigo_menu = str(
        data.get("codigo_menu", "")
    ).strip().upper()

    modulo = str(
        data.get("modulo", "")
    ).strip()

    titulo = str(
        data.get("titulo", "")
    ).strip()

    descripcion = str(
        data.get("descripcion", "")
    ).strip()

    objetivo = str(
        data.get("objetivo", "")
    ).strip()

    proceso = data.get("proceso", [])
    consejos = data.get("consejos", [])
    ayuda_id = data.get("id")


    if not codigo_menu:
        return JsonResponse({
            "ok": False,
            "error": "Ingrese el código del menú.",
        }, status=400)

    if not modulo:
        return JsonResponse({
            "ok": False,
            "error": "Ingrese el módulo.",
        }, status=400)

    if not titulo:
        return JsonResponse({
            "ok": False,
            "error": "Ingrese el título.",
        }, status=400)

    # Proceso y consejos deben almacenarse como listas; cualquier formato inesperado  se reemplaza por una lista vacia
    if not isinstance(proceso, list):
        proceso = []

    if not isinstance(consejos, list):
        consejos = []

    proceso = [
        str(item).strip()
        for item in proceso
        if str(item).strip()
    ]

    consejos = [
        str(item).strip()
        for item in consejos
        if str(item).strip()
    ]

    # El código de menú debe ser único entre las ayudas registradas
    duplicado = AyudaModulo.objects.filter(
        codigo_menu=codigo_menu
    )

    if ayuda_id: # Con ID se recupera el registro existente 
        duplicado = duplicado.exclude(
            id=ayuda_id
        )

    if duplicado.exists():
        return JsonResponse({
            "ok": False,
            "error": (
                f"Ya existe una ayuda para el código "
                f"'{codigo_menu}'."
            ),
        }, status=400)

    # Crear o editar
    if ayuda_id:
        ayuda = AyudaModulo.objects.filter(
            id=ayuda_id
        ).first()

        if not ayuda:
            return JsonResponse({
                "ok": False,
                "error": (
                    f"No se encontró la ayuda con ID "
                    f"'{ayuda_id}'."
                ),
            }, status=404)

    else:
        ayuda = AyudaModulo()

    # Asignar información
    ayuda.codigo_menu = codigo_menu
    ayuda.modulo = modulo
    ayuda.titulo = titulo
    ayuda.descripcion = descripcion
    ayuda.objetivo = objetivo
    ayuda.proceso = proceso
    ayuda.consejos = consejos
    ayuda.activo = True # Toda ayuda creada o modificada queda activa 


    ayuda.save()

    
    return JsonResponse({
    "ok": True,
    "ayuda": {
        "id": ayuda.id,
        "codigo_menu": ayuda.codigo_menu,
        "modulo": ayuda.modulo,
        "titulo": ayuda.titulo,
        "descripcion": ayuda.descripcion,
        "objetivo": ayuda.objetivo,
        "proceso": ayuda.proceso,
        "consejos": ayuda.consejos,
        "activo": ayuda.activo,
        },
    })

def obtener_ayuda(request):
  # Obtiene la ayuda activa asociada a un código de menú.
    codigo_menu = str(
        request.GET.get(
            "codigo_menu",
            ""
        )
    ).strip().upper()

    # Validar información
    if not codigo_menu:
        return JsonResponse({
            "ok": False,
            "error": "No se recibió el código del menú."
        }, status=400)

    #  Solo se devuelven ayudas activas
    ayuda = (
        AyudaModulo.objects
        .filter(
            codigo_menu=codigo_menu,
            activo=True
        )
        .first()
    )

    #  Validar resultado
    if not ayuda:
        return JsonResponse({
            "ok": False,
            "error": (
                "No existe una ayuda activa para "
                f"el código '{codigo_menu}'."
            )
        }, status=404)

    # Garantiza que proceso y consejos siempre lleguen al frontend como listas 
    proceso = (
        ayuda.proceso
        if isinstance(ayuda.proceso, list)
        else []
    )

    consejos = (
        ayuda.consejos
        if isinstance(ayuda.consejos, list)
        else []
    )

    return JsonResponse({
        "ok": True,
        "ayuda": {
            "id": ayuda.id,
            "codigo_menu": ayuda.codigo_menu,
            "modulo": ayuda.modulo,
            "titulo": ayuda.titulo,
            "descripcion": ayuda.descripcion,
            "objetivo": ayuda.objetivo,
            "proceso": proceso,
            "consejos": consejos,
            "activo": ayuda.activo
        }
    })

@csrf_exempt
def eliminar_ayuda(request):
    # Elimina definitivamente una auda utilizando su ID
    if request.method != "POST":
        return JsonResponse({
            "ok": False,
            "error": "Método no permitido.",
        }, status=405)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({
            "ok": False,
            "error": "Los datos enviados no son válidos.",
        }, status=400)

    # El ID se valida como entero antes de realizar cualquier consulta

    ayuda_id = data.get("id")

    try:
        ayuda_id = int(ayuda_id)
    except (TypeError, ValueError):
        return JsonResponse({
            "ok": False,
            "error": "El identificador de la ayuda no es válido.",
        }, status=400)

    ayuda = AyudaModulo.objects.filter( # Se identifica el registro por su ID para evitar depender del código del menú 
        id=ayuda_id
    ).first()

    if not ayuda:
        return JsonResponse({
            "ok": False,
            "error": "La ayuda no existe.",
        }, status=404)

    ayuda.delete() # El registro deja de existir en el sqlite

    return JsonResponse({
        "ok": True
    })