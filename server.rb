#coding:utf-8

require 'em-websocket'
require 'json'

clients  = Array.new
chat_log = Array.new

EventMachine::WebSocket.start(:host => '0.0.0.0', :port => "8864") { |socket|
    id = ""
    playerName = ""

    socket.onopen {
        clients.push(socket);

        chat_log.each { |log|
            socket.send(log);
        }
    }

    socket.onmessage { |msg_json|
        clients.each { |client|
            client.send(msg_json)
        }

        msg = JSON.parse(msg_json)
        id = msg["id"]
        playerName = msg["playerName"];

        chat_log.push(msg_json) unless msg["trivial"]
    }

    socket.onclose {
        clients.delete(socket);

        leave_log = { leave: true,
                         id: id,
                 playerName: playerName }.to_json

        clients.each { |client|
            client.send(leave_log)
        }

        chat_log.push(leave_log)
    }
}
