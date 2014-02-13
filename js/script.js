var app = angular.module('app', ["LocalStorageModule"]);

app.factory('TeptavlService', function() {
    var service = {};

    service.socket = new WebSocket('ws://localhost:8864/');
    service.socket.onmessage = function(message) {
        service.onmessage(JSON.parse(message.data));
    };
    service.socket.onopen = function() {
        service.onopen();
    }

    service.send = function(message) {
        service.socket.send(JSON.stringify(message));
    }

    service.id = Math.random().toString();

    return service;
});

app.directive('window', function() {
    return function(scope, element, attr) {
        element.window({ width: +attr.width,
                        height: +attr.height,
                          left: +attr.x,
                           top: +attr.y,
                         title: attr.title });
    };
});

app.directive('layout', function() {
    return function(scope, element, attr) {
        element.layout({ fit: true })
    };
});

app.directive("datagrid", function() {
    return function(scope, element, attr) {
        element.datagrid({ fitColumns:true });
    }
})

app.directive('fitParent', function() {
    return function(scope, element, attr) {
        var parent = element.parent().css("overflow", "hidden");
        var fitter = function() {
            element.outerWidth(parent.width(), true);
            element.outerHeight(parent.height(), true);
        };
        parent.mutate("width height", fitter);
        $(fitter);
    };
});

app.directive('autoScroll', function() {
    return function(scope, element, attr) {
        element.mutate("height scrollHeight", function() {
            element.scrollTop(element[0].scrollHeight);
        });
    };
});

app.config(["localStorageServiceProvider", function(localStorageServiceProvider) {
    localStorageServiceProvider.setPrefix("teptavl");
}]);



function TeptavlCtrl($scope, localStorageService, TeptavlService) {
    $scope.windows = {system: {title: "システム", lines: [],            layout: {x:   0, y:   0, width: 256, height: 256}},
                        main: {title: "メイン",   lines: [], input: "", layout: {x: 256, y:   0, width: 256, height: 256}},
                         sub: {title: "サブ",     lines: [], input: "", layout: {x: 512, y:   0, width: 256, height: 256}},
                      player: {title: "PL名",     name: "名無し",       layout: {x: 0,   y: 256, width: 128, height: 64}},
                     players: {title: "PL達",     names: {},            layout: {x: 0,   y: 384, width: 128, height: 256}}};

    TeptavlService.onmessage = function(message) {
        $scope.windows.players.names[message.id] = message.playerName;

        if (message.line)
        {
            $scope.windows[message.window].lines.push({'item': message.line});
        }

        $scope.$apply();
    };

    TeptavlService.onopen = function() {
        TeptavlService.send({window: "system",
                                 id: TeptavlService.id,
                         playerName: $scope.windows.player.name,
                               line: "《" + $scope.windows.player.name + "》がログインしました"});
    }

    $scope.send = function(window) {
        TeptavlService.send({window: window,
                                 id: TeptavlService.id,
                         playerName: $scope.windows.player.name,
                               line: $scope.windows[window].input
        });
    };

    $scope.updateInput = function(windowName, value) {
    }
}
