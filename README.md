# GestorData

Proyecto Django para gestión de empresas y compras con conexión dinámica a bases de datos por empresa.

## Resumen

Este proyecto utiliza una base de datos SQLite local para almacenar la configuración de las empresas (`core_company`) y luego conecta dinámicamente a cada base de datos de empresa según la selección del usuario.

## Requisitos

- Python 3.11+ (o compatible con Django 4.2)
- Django 4.2.x
- python-dotenv
- djangorestframework
- SQLite3 (incluido con Python)
- Dependencias específicas para los backends de base de datos que uses, por ejemplo:
  - `django_informixdb` para Informix
  - `psycopg2` para PostgreSQL
  - `mysqlclient` para MySQL
  - `cx_Oracle` para Oracle
  - `pyodbc` o `mssql-django` para SQL Server

## Estructura principal

- `ewsite/` — configuración del proyecto Django
- `core/` — modelo `Company`, middleware y lógica de selección de empresa
- `menuprapp/`, `tallerapp/`, `comprasapp/`, `repuestosapp/` — aplicaciones de la solución
- `db.sqlite3` — base de datos SQLite local

## Configuración inicial

1. Crear un entorno virtual y activarlo:

```powershell
python -m venv venv
venv\Scripts\activate
```

2. Instalar dependencias:

```powershell
pip install django python-dotenv djangorestframework
```

> Si necesitas drivers de base de datos adicionales, instálalos también según el motor de destino.

3. Configurar variables de entorno:

Crea un archivo `.env` en la raíz del proyecto con al menos:

```env
SECRET_KEY=tu_clave_secreta
DEBUG=True
```

4. Ejecutar migraciones básicas:

```powershell
python manage.py migrate
```

## Agregar empresas en SQLite

El proyecto requiere que agregues las empresas y sus parámetros de conexión en la tabla `core_company` de la base de datos `db.sqlite3`.

### Usar SQLite shell

```powershell
python manage.py shell
from core.models import Company
```

### Ejemplo de inserción para Informix

```shell
Company.objects.create(
    key='ecuawagen',
    name='Ecuawagen',
    db_alias='ecuawagen',
    db_dsn='DNSdesarrollo',
    db_name='ecuawagen',
    db_server='ol_desarrollo',
    db_host='192.168.1.9',
    logo='/static/ecuawagen.png',
    activa=True,
    db_engine='django_informixdb', 
)
```

### Campos importantes

- `key`: identificador único de empresa
- `name`: nombre visible de la empresa
- `db_alias`: alias usado internamente para la conexión
- `db_engine`: motor de base de datos (Informix, PostgreSQL, MySQL, Oracle, SQL Server)
- `db_dsn`: cadena DSN para Informix
- `db_name`: nombre de la base de datos de empresa
- `db_host`: host del servidor de base de datos
- `db_port`: puerto del servidor de base de datos
- `activa`: 1 para activar la empresa

> Nota: `db_dsn` y `db_server` se usan principalmente con Informix.

## Ejecución del proyecto

1. Activa el entorno virtual.
2. Asegúrate de que `db.sqlite3` existe y contiene las filas de empresa.
3. Ejecuta:

```powershell
python manage.py runserver
```

4. Abre en el navegador:

```text
http://127.0.0.1:8000/
```

5. Selecciona la empresa y luego usa el formulario de login.

## Lógica de conexión dinámica

- `core.middleware.DynamicConnectionMiddleware` detecta la empresa activa en:
  - parámetros GET `company`
  - header `X-Company-Key`
  - sesión de usuario
- `core.routers.CompanyDBRouter` envía todas las consultas de apps externas a la base de datos de la empresa seleccionada, mientras que las apps centrales (`admin`, `auth`, `contenttypes`, `sessions`, `core`) usan la base `default`.

## Notas finales

- El login de empresa intenta conectar con la base de datos seleccionada usando el usuario y contraseña enviados por el formulario.
- Si la empresa usa Informix, asegúrate de tener instalado y configurado el backend `django_informixdb`.
- Ajusta `ALLOWED_HOSTS` en `ewsite/settings.py` antes de ponerlo en producción.
