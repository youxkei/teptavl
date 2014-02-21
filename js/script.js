Number.prototype.clamp = function(min, max)
{
    return Math.min(Math.max(this, min), max);
};


var app = angular.module('app', ["LocalStorageModule", "angular-websocket"]);

app.directive('window', function()
{
    return function(scope, element, attr)
    {
        var windowInfo = scope.$eval(attr.window);
        var moveWithoutEvent = false;
        var resizeWithoutEvent = false;

        element.window({ title: windowInfo.title,
                      closable: false,
                        shadow: false,
                        inline: true,
                   minimizable: false,
                         width: windowInfo.layout.width,
                        height: windowInfo.layout.height,
                          left: windowInfo.layout.x,
                           top: windowInfo.layout.y,
                         title: windowInfo.title,

                        onMove: function(left, top)
                                {
                                    if (moveWithoutEvent) return;

                                    windowInfo.layout.x = left.clamp(0, $(window).width()  - windowInfo.layout.width);
                                    windowInfo.layout.y =  top.clamp(0, $(window).height() - windowInfo.layout.height);

                                    moveWithoutEvent = true;
                                    element.window("move", { left: windowInfo.layout.x,
                                                              top: windowInfo.layout.y });
                                    moveWithoutEvent = false;
                                },

                      onResize: function(width, height)
                                {
                                    if (resizeWithoutEvent) return;

                                    element.window("move", {});

                                    windowInfo.layout.width  =  width.clamp(128, $(window).width());
                                    windowInfo.layout.height = height.clamp(0,   $(window).height());

                                    resizeWithoutEvent = true;
                                    element.window("resize", { width: windowInfo.layout.width,
                                                              height: windowInfo.layout.height });
                                    resizeWithoutEvent = false;
                                } });
    };
});

app.directive('layout', function()
{
    return function(scope, element, attr)
    {
        element.layout({ fit: true });
    };
});

app.directive('fitParent', function()
{
    return function(scope, element, attr)
    {
        var parent = element.parent().css("overflow", "hidden");
        var fitter = function()
        {
            element.outerWidth (parent.width(),  true);
            element.outerHeight(parent.height(), true);
        };
        parent.mutate("width height", fitter);
        $(fitter);
    };
});

app.directive('autoScroll', function()
{
    return function(scope, element, attr)
    {
        element.mutate("height scrollHeight", function()
        {
            element.scrollTop(element[0].scrollHeight);
        });
    };
});


app.config(function(WebSocketProvider, localStorageServiceProvider)
{
    WebSocketProvider.prefix("")
                     .uri(location.protocol === "file:" ? "ws://localhost:8864"
                                                        : "ws://153.121.44.200:8864");
    localStorageServiceProvider.setPrefix("teptavl");
});



function TeptavlCtrl($scope, WebSocket, localStorageService)
{
    var se = document.getElementById("se");
    var id = Math.random().toString();

    $scope.windows = { system: { title: "システム", lines: [],                         layout: { x:   0, y:   0, width: 256, height: 256 } },
                         main: { title: "メイン",   lines: [], input: "", typings: {}, layout: { x: 256, y:   0, width: 256, height: 256 } },
                          sub: { title: "サブ",     lines: [], input: "", typings: {}, layout: { x: 512, y:   0, width: 256, height: 256 } },
                       player: { title: "PL名",     name: "ななしな",                  layout: { x: 0,   y: 256, width: 128, height: 64  } },
                      players: { title: "PL達",     names: {},                         layout: { x: 0,   y: 320, width: 128, height: 256 } } };

    loadFromStorage($scope, localStorageService);

    function send(message)
    {
        WebSocket.send(JSON.stringify(message));
    }

    WebSocket.onmessage(function(ev)
    {
        message = JSON.parse(ev.data);

        if (message.enter)
        {
            $scope.windows.players.names[message.id] = message.playerName;
            $scope.windows.system.lines.push({ line: "IN : " + message.playerName });
        }

        if (message.leave)
        {
            delete $scope.windows.players.names[message.id];
            $scope.windows.system.lines.push({ line: "OUT: " + message.playerName });
        }

        if (message.changeName)
        {
            $scope.windows.players.names[message.id] = message.playerName;
            for (key in $scope.windows)
            {
                if ($scope.windows[key].typings !== undefined && $scope.windows[key].typings[message.id] !== undefined)
                {
                    $scope.windows[key].typings[message.id] = message.playerName;
                }
            }
        }

        if (message.typingStart)
        {
            $scope.windows[message.window].typings[message.id] = message.playerName;
        }

        if (message.typingStop)
        {
            delete $scope.windows[message.window].typings[message.id];
        }

        if (message.talk)
        {
            $scope.windows.players.names[message.id] = message.playerName;
            $scope.windows[message.window].lines.push({ name: message.playerName, line: message.input });
            delete $scope.windows[message.window].typings[message.id];
            se.play();
        }

        $scope.$apply();
    });

    WebSocket.onopen(function()
    {
        send({ enter: true,
                  id: id,
          playerName: $scope.windows.player.name });
    });

    $scope.inputKeyDown = function(window, keyEvent)
    {
        if (!keyEvent.altKey && !keyEvent.shiftKey && !keyEvent.ctrlKey && keyEvent.keyCode == 13)
        {
            if ($scope.windows[window].input !== "")
            {
                send({ talk: true,
                     window: window,
                         id: id,
                 playerName: $scope.windows.player.name,
                      input: $scope.windows[window].input });

                $scope.windows[window].input = "";
            }

            keyEvent.preventDefault();
        }
    };

    $scope.inputKeyUp = function(window, keyEvent)
    {
        if (keyEvent.target.value !== "")
        {
            send({ typingStart: true,
                       trivial: true,
                        window: window,
                            id: id,
                    playerName: $scope.windows.player.name });
        }
        else
        {
            send({ typingStop: true,
                      trivial: true,
                       window: window,
                           id: id,
                   playerName: $scope.windows.player.name });
        }
    }

    $scope.playerNameKeyUp = function(window, keyEvent)
    {
        send({  changeName: true,
                   trivial: true,
                        id: id,
                playerName: keyEvent.target.value });
    }

    $(function()
    {
        $(window).on("unload", function()
        {
            saveToStorage($scope, localStorageService);
        });
    });
}



function loadFromStorage($scope, localStorageService)
{
    var playerName = localStorageService.get("playerName");
    if (playerName !== null)
    {
        $scope.windows.player.name = playerName;
    }

    var windowLayouts = localStorageService.get("windowLayouts");
    if (windowLayouts !== null)
    {
        for(key in $scope.windows)
        {
            $scope.windows[key].layout = windowLayouts[key];
        }
    }

    var windowInputs = localStorageService.get("windowInputs");
    if (windowInputs !== null)
    {
        for(key in $scope.windows)
        {
            if ($scope.windows[key].input !== undefined)
            {
                $scope.windows[key].input = windowInputs[key];
            }
        }
    }
}



function saveToStorage($scope, localStorageService)
{
    localStorageService.add("playerName",    $scope.windows.player.name);

    var windowLayouts = {};
    for(key in $scope.windows)
    {
        windowLayouts[key] = $scope.windows[key].layout;
    }
    localStorageService.add("windowLayouts", windowLayouts);

    var windowInputs = {};
    for(key in $scope.windows)
    {
        if ($scope.windows[key].input !== undefined)
        {
            windowInputs[key] = $scope.windows[key].input;
        }
    }
    localStorageService.add("windowInputs", windowInputs);
}
