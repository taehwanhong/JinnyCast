from django.db import models

# Create your models here.
from django.db import models

class Bbs(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=100, blank=True, default='')
    artist = models.CharField(max_length=20, blank=True, default='')
    videoId = models.CharField(max_length=12, blank=True, default='')
    thumbnailUrl = models.CharField(max_length=50, blank=True, default='')
    album = models.CharField(max_length=20, blank=True, default='')

class Meta:
    ordering = ('created',)