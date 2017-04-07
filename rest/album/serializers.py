from rest_framework import serializers  
from album.models import Album

class AlbumSerializer(serializers.ModelSerializer):
    # ModelSerializer 를 이용해서 아래와 같이 짧은 코드로 직렬화 필드를 정의할 수 있다
    class Meta:
        model = Album
        fields = ('id','title','user')

    # 신규 Bbs instance를 생성해서 리턴해준다
    def create(self, validated_data):
        return Album.objects.create(**validated_data)

    # 생성되어 있는 Bbs instance 를 저장한 후 리턴해준다
    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.user = validated_data.get('user', instance.user)
        instance.save()
        return instance