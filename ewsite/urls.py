"""
URL configuration for ewsite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from menuprapp.views import mimenu 
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path,include
from core.views import company_select, company_login, company_logout
from django.conf import settings
import os


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', company_select, name='company_select'),
    path('login_db/', company_login, name='company_login'),
    path('logout/', company_logout, name='company_logout'),
    path('',mimenu),
    path('',include('menuprapp.urls')),
    path('',include('tallerapp.urls')),
    path('',include('comprasapp.urls')),
    path('',include('repuestosapp.urls')),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static('/static/', document_root=os.path.join(settings.BASE_DIR, 'core/static'))