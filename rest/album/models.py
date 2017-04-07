# Create your models here.
from django.db import models

class Album(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=20, blank=True, default='')
    user = models.CharField(max_length=20, blank=True, default='')

class Meta:
        ordering = ('created',)