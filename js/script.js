Number.prototype.clamp = function(min, max)
{
    return Math.min(Math.max(this, min), max);
};

var app = angular.module('app', ["LocalStorageModule"]);

app.factory('TeptavlService', function()
{
    var service = {};

    var socket = new WebSocket('ws://153.121.44.200:8864');
    socket.onmessage = function(message)
    {
        service.onmessage(JSON.parse(message.data));
    };

    socket.onopen = function()
    {
        service.onopen();
    };

    socket.onclose = function()
    {
        alert("close");
    };

    service.send = function(message)
    {
        socket.send(JSON.stringify(message));
    };

    service.id = Math.random().toString();

    return service;
});

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

app.config(["localStorageServiceProvider", function(localStorageServiceProvider)
{
    localStorageServiceProvider.setPrefix("teptavl");
}]);



function TeptavlCtrl($scope, localStorageService, TeptavlService)
{
    var se = new Audio("sound/swing.wav");

    $scope.windows = { system: { title: "システム", lines: [],            layout: { x:   0, y:   0, width: 256, height: 256 } },
                         main: { title: "メイン",   lines: [], input: "", layout: { x: 256, y:   0, width: 256, height: 256 } },
                          sub: { title: "サブ",     lines: [], input: "", layout: { x: 512, y:   0, width: 256, height: 256 } },
                       player: { title: "PL名",     name: "ななしな",     layout: { x: 0,   y: 256, width: 128, height: 64  } },
                      players: { title: "PL達",     names: {},            layout: { x: 0,   y: 320, width: 128, height: 256 } } };

    loadFromStorage($scope, localStorageService);

    TeptavlService.onmessage = function(message)
    {
        $scope.windows.players.names[message.id] = message.playerName;

        if (message.line)
        {
            $scope.windows[message.window].lines.push({'item': message.line});
            se.play();
        }

        $scope.$apply();
    };

    TeptavlService.onopen = function()
    {
        TeptavlService.send({ window: "system",
                                  id: TeptavlService.id,
                          playerName: $scope.windows.player.name,
                                line: "《" + $scope.windows.player.name + "》がログインしました" });
    };

    $scope.send = function(window)
    {
        TeptavlService.send({ window: window,
                                  id: TeptavlService.id,
                          playerName: $scope.windows.player.name,
                                line: $scope.windows[window].input });
    };

    $scope.updateInput = function(windowName, value)
    {
    };

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
}



function saveToStorage($scope, localStorageService)
{
    var windowLayouts = {};

    for(key in $scope.windows)
    {
        windowLayouts[key] = $scope.windows[key].layout;
    }

    localStorageService.add("windowLayouts", windowLayouts);
    localStorageService.add("playerName",    $scope.windows.player.name);
}
