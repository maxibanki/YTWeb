registerPlugin({
    name: 'Youtube Webinterface!',
    version: '2.0',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: 'maxibanki <max@schmitt.ovh> & irgendwer <dev@sandstorm-projects.de>',
    backends: ['ts3', 'discord'],
    vars: [{
        name: 'ytApiKey',
        title: 'Youtube API Key (see the tutorial for instructions)',
        type: 'string'
    }, {
        name: 'play',
        title: 'enable playing (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'dl',
        title: 'enable downloading (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'enq',
        title: 'enable enqueuing (just working with YouTube)',
        type: 'select',
        options: ['on', 'off']
    }, {
        name: 'ytAlllowed',
        title: 'Allowed group Ids split by comma without space who are allowed to use the "!playlist <playlistlink>" command.',
        type: 'string'
    }, {
        name: 'scApiKey',
        title: 'Soundcloud API Key (see the tutorial for instructions)',
        type: 'string'
    }],
    enableWeb: true
}, function(sinusbot, config, info) {

    var engine = require('engine');
    var store = require('store');
    var event = require('event');
    var media = require('media');

    engine.log("YTWeb Webinterface Ready");

    if (config.ytApiKey || sinusbot.getVar("ytapikey")) {
        sinusbot.registerHandler({
            isHandlerFor: function(url) {
                if (url.substring(0, 6) == 'ytwiyt') {
                    engine.log(url);
                    return true;
                }
                if (/youtube\.com/.test(url)) {
                    engine.log(url);
                    return true;
                }
                engine.log('NOPE: ' + url);
                return false;
            },
            getTrackInfo: function(url, cb) {
                engine.log(url);
                if (/youtube\.com/.test(url)) {
                    return cb({
                        urlType: 'ytdl',
                        url: url
                    });
                }
                return cb({
                    urlType: 'ytdl',
                    url: url.substring(19)
                });
            },
            getSearchResult: function(search, cb) {
                engine.log("Youtube triggered.");
                sinusbot.http({
                    timeout: 5000,
                    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(search) + '&maxResults=20&type=video,playlist&key=' + encodeURIComponent(store.get("ytapikey"))
                }, function(err, data) {
                    if (err || !data || data.statusCode != 200) {
                        return cb(null);
                    }
                    var result = [];
                    var data = JSON.parse(data.data);
                    if (!data || !data.items) {
                        engine.log('Error in json');
                        return cb(null);
                    }
                    data.items.forEach(function(entry) {
                        result.push({
                            title: '[YouTube]' + entry.snippet.title,
                            artist: entry.snippet.channelTitle,
                            coverUrl: entry.snippet.thumbnails.default.url,
                            url: 'ytwiyt://ytdl/?url=' + encodeURIComponent(entry.id.videoId)
                        });
                    });
                    return cb(result);
                });
            }
        });
    } else {
        engine.log("Youtube API Key is not set, so it isn't working atm.");
    }


    if (config.scApiKey) {
        sinusbot.registerHandler({
            isHandlerFor: function(url) {
                if (url.substring(0, 6) == 'ytwisc') {
                    return true;
                }
                if (/soundcloud\.com/.test(url)) {
                    return true;
                }
                engine.log('Soundcloud: NOPE: ' + url);
                return false;
            },
            getTrackInfo: function(url, cb) {
                if (/soundcloud\.com/.test(url)) {
                    return cb({
                        urlType: 'ytdl',
                        url: url.substring(19)
                    });
                }
            },
            getSearchResult: function(search, cb) {
                engine.log("Soundcloud triggered");
                sinusbot.http({
                    timeout: 5000,
                    url: 'http://api.soundcloud.com/tracks.json?client_id=' + config.scApiKey + '&q=' + encodeURIComponent(search) + '&limit=20'
                }, function(err, data) {
                    if (err || !data || data.statusCode != 200) {
                        return cb(null);
                    }
                    var result = [];
                    var data = JSON.parse(data.data);
                    if (!data) {
                        engine.log('Error in json');
                        return cb(null);
                    }
                    data.forEach(function(entry) {
                        result.push({
                            title: '[SoundCloud]' + entry.title,
                            artist: entry.user.username,
                            coverUrl: entry.artwork_url,
                            url: 'ytwisc://ytdl/?url=' + entry.permalink_url,
                        });
                    });
                    return cb(result);
                });
            }
        });
    } else {
        engine.log("Soundcloud API Key is not set, so it isn't working atm.");
    }

    event.on('chat', function(msg) {
        if (msg.text.startsWith("!playlist ")) {
                    engine.log(JSON.stringify(msg.client.getServerGroups()));
//             msg.client.getServerGroups().forEach(function(group) {
//                 engine.log(group);
//                 if (config.ytAlllowed.split(",").indexOf(group) === -1) {
//                     return;
//                 }
//             });
            var url = msg.text.substr("!playlist ".length);
            url = url.replace("[URL]", "").replace("[/URL]", "");
            url = url.substr(url.indexOf("list=") + "list=".length);
            if (url.indexOf("&") > 0) {
                url = url.substr(0, url.indexOf("&"));
            }

            if (url.length == 34) {
                sinusbot.http({
                    "method": "GET",
                    "url": "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=" + encodeURIComponent(url) + "&key=" + encodeURIComponent(store.get("ytapikey")),
                    "timeout": 6000,
                }, function(error, response) {
                    if (response.statusCode != 200) {
                        sinusbot.log(error);
                        return;
                    }

                    var Response = JSON.parse(response.data);
                    engine.log(Response.items.length + " results.");

                    Response.items.forEach(function(item) {
                        msg.client.chat('Adding [B]' + item.snippet.title + '[/B] to queue.');
                    });
                });
            } else {
                msg.client.chat("Error: Invalid url (list = " + url + ")");
            }
        }
    });

    if (typeof config.ytApiKey != 'undefined') {
        store.set("ytapikey", config.ytApiKey);
    }

    event.on('api:ytplay', function(ev) {
        if (config.play != 1) {
            media.yt(ev.data);
            engine.log('YTWeb Triggered with "played" at ' + ev.data);
            return 'The Video will be sucessfully played now.';
        } else {
            engine.log('YTWeb tried to play ' + ev.data + ' but it was deactivated.');
            return 'Playing is not enabled.';
        }
    });

    event.on('api:ytenq', function(ev) {
        if (config.enq != 1) {
            media.qyt(ev.data);
            engine.log('YTWeb Triggered with "enque" at ' + ev.data);
            return 'The Video will be sucessfully enqueued now.';
        } else {
            engine.log('YTWeb tried to play ' + ev.data + ' but it was deactivated.');
            return 'Enqueuing is not enabled.';
        }
    });

    event.on('api:ytdl', function(ev) {
        if (config.dl != 1) {
            media.ytdl(ev.data, false);
            engine.log('YTWeb Triggered with "downloaded" at ' + ev.data);
            return 'The Video will be sucessfully downloaded now.';
        } else {
            engine.log('YTWeb tried to download ' + ev.data + ' but it was deactivated.');
            return 'Downloading is not enabled.';
        }
    });

    event.on('api:ytwebconfig', function(ev) {
        var ytwebconfig = {};
        ytwebconfig.play = (config.play != 1);
        ytwebconfig.enqueue = (config.enq != 1);
        ytwebconfig.download = (config.dl != 1);
        ytwebconfig.ytapikey = store.get("ytapikey");
        return ytwebconfig;
    })
  
    String.prototype.startsWith = function(str) {
        return this.indexOf(str) == 0;
    }
});
