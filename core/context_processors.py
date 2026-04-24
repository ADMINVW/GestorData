from .models import Company

def company_context(request):
    company_key = request.session.get('company_key')
    if company_key:
        try:
            company = Company.objects.get(key=company_key)
            db_user = request.session.get(f'user_{company_key}')
            return {'company': company, 'db_user': db_user}
        except Company.DoesNotExist:
            pass
    return {}