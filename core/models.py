from django.db import models

class Company(models.Model):
    ENGINE_CHOICES = [
        ('django_informixdb',            'Informix'),
        ('django.db.backends.postgresql','PostgreSQL'),
        ('django.db.backends.mysql',     'MySQL'),
        ('django.db.backends.oracle',    'Oracle'),
        ('mssql',                        'SQL Server'),
    ]
    key      = models.CharField(max_length=50, unique=True)
    name     = models.CharField(max_length=100)
    db_alias = models.CharField(max_length=50)
    db_engine = models.CharField(max_length=100, choices=ENGINE_CHOICES, default='django_informixdb')
    db_dsn    = models.CharField(max_length=100)  
    db_name   = models.CharField(max_length=100)   
    db_server = models.CharField(max_length=100)   
    db_host   = models.CharField(max_length=200)   
    db_port   = models.IntegerField(null=True, blank=True)
    logo      = models.CharField(max_length=200, blank=True)
    activa    = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        app_label = 'core'