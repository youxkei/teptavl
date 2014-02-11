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
    bind($scope, localStorageService, "playerName", "名無し");
    $scope.playerNames = {};
    $scope.windows = {システム: {lines: [], input: ""},
                        メイン: {lines: [], input: ""},
                          サブ: {lines: [], input: ""}};
    $scope.messages = [];

    TeptavlService.onmessage = function(message) {
        $scope.playerNames[message.id] = message.playerName;

        if (message.line)
        {
            $scope.windows[message.windowName].lines.push({'item': message.line});
        }

        $scope.$apply();
    };

    TeptavlService.onopen = function() {
        TeptavlService.send({windowName: "システム",
                                     id: TeptavlService.id,
                             playerName: $scope.playerName,
                                   line: "《" + $scope.playerName + "》がログインしました"});

        $scope.$watch("playerName", function(newValue, oldValue) {
            if (newValue != oldValue)
            {
                TeptavlService.send({windowName: "システム",
                                             id: TeptavlService.id,
                                     playerName: $scope.playerName,
                                           line: ""});
            }
        });
    }

    $scope.send = function(windowName) {
        TeptavlService.send({windowName: windowName,
                                   line: $scope.windows[windowName].input
        });
    };

    $scope.updateInput = function(windowName, value) {
    }
}

function bind($scope, localStorageService, variable, defaultValue)
{
    $scope[variable] = localStorageService.get(variable);
    if ($scope[variable] == null)
    {
        $scope[variable] = defaultValue;
    }

    $scope.$watch(variable, function(value) {
        localStorageService.add(variable, value);
    });
}
