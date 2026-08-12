from django.db import connections
from core.db_context import get_db_from_request

def validar_acceso(request, sistema):
    db_alias = get_db_from_request(request)
    login = getattr(request, "db_user", None)

    if not login:
        return False

    with connections[db_alias].cursor() as cur:
        cur.execute("""
            SELECT COUNT(*)
            FROM acceso
            WHERE login = ?
            AND sistema = ?
        """, [login, sistema])

        return cur.fetchone()[0] > 0