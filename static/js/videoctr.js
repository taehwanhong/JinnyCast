        function initEmbed() {
            $(this).on('embedplayer:statechange', function(event) {
                $('#state').text(event.state);
            }).on('embedplayer:error', function(event) {
                var message = event.error || '';
                if (event.title) {
                    message += " " + event.title;
                } else if (event.message) {
                    message += " " + event.message;
                }
                $('#error').text(message);
            }).on('embedplayer:durationchange', function(event) {
                if (isFinite(event.duration)) {
                    $('#currenttime').show().prop('max', event.duration);
                } else {
                    $('#currenttime').hide();
                }
                $('#duration').text(event.duration.toFixed(2) + ' seconds');
            }).on('embedplayer:timeupdate', function(event) {
                $('#currenttime').val(event.currentTime);
                $('#currenttime-txt').text(event.currentTime.toFixed(2) + ' seconds');
            }).on('embedplayer:volumechange', function(event) {
                $('#volume').val(event.volume);
                $('#volume-label').text(
                    event.volume <= 0 ? '🔇' :
                    event.volume <= 1 / 3 ? '🔈' :
                    event.volume <= 2 / 3 ? '🔉' :
                    '🔊'
                );
                $('#volume-txt').text(event.volume.toFixed(2));
            }).on('embedplayer:ready', function(event) {
                var link = $(this).embedplayer('link');
                if (link) {
                    $('#link').attr('href', link);
                    $('#link-wrapper').show();
                }
            }).
            embedplayer("listen").
            embedplayer('volume', function(volume) {
                $('#volume').text(volume.toFixed(2));
            });
        }

        function loadVideo(tag, url) {
            try {
                var attrs = {
                    id: 'video',
                    src: url
                };
                switch (tag) {
                    case 'iframe':
                        attrs.allowfullscreen = 'allowfullscreen';
                        attrs.frameborder = '0';
                        attrs.width = '640';
                        attrs.height = '360';
                        break;

                    case 'video':
                        attrs.width = '640';
                        attrs.height = '360';
                    case 'audio':
                        attrs.controls = 'controls';
                        attrs.preload = 'auto';
                        break;
                }
                $('#link-wrapper').hide();
                $('<' + tag + '>').attr(attrs).replaceAll('#video').each(initEmbed);
            } catch (e) {
                $('#error').text(String(e));
            }
        }

        function updateVideo() {
            var value = $('#embed').val().split('|');
            $('#duration, #currenttime, #volume').text('?');
            $('#state').text('loading...');
            $('#error').text('');
            loadVideo(value[0], value[1]);
        }

        $(document).ready(updateVideo);