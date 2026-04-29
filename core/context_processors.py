from .models import Company

def company_context(request):
    company_key = request.session.get('active_company_key')
    print(f"CONTEXT PROCESSOR - company_key de sesión: {company_key}")
    if company_key:
        try:
            company = Company.objects.get(key=company_key)
            db_user = request.session.get(f'user_{company_key}')
            print(f"CONTEXT PROCESSOR - company: {company}, db_user: {db_user}")
            return {'company': company, 'db_user': db_user, 'company_key': company_key}
        except Company.DoesNotExist:
            print(f"CONTEXT PROCESSOR - Company no existe para key: {company_key}")
            pass
    print("CONTEXT PROCESSOR - retornando diccionario vacío")
    return {}