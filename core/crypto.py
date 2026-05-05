from django.conf import settings

def encrypt_credential(value: str) -> str:
    """Encrypt a credential using Fernet symmetric encryption."""
    if not value:
        return value
    return settings.FERNET.encrypt(value.encode()).decode()

def decrypt_credential(token: str) -> str:
    """Decrypt a credential using Fernet symmetric encryption."""
    if not token:
        return token
    try:
        return settings.FERNET.decrypt(token.encode()).decode()
    except Exception as e:
        return None