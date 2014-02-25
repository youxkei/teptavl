#coding:utf-8

require "faye/websocket"
require "json"
require "parslet"
require "moji"


class DiceParser < Parslet::Parser
    rule(:space) { match('\s|　').repeat }

    rule(:input) { space >> add >> any.repeat }

    rule(:add)  {  mul.as(:lhs) >> space >> match("[+＋]").as(:add) >> space >> add.as(:rhs) |
                   mul.as(:lhs) >> space >> match("[-ー]").as(:sub) >> space >> add.as(:rhs) |
                   mul }

    rule(:mul)  {  prim.as(:lhs) >> space >> match("[*＊]").as(:mul)  >> space >> mul.as(:rhs) |
                   prim.as(:lhs) >> space >> match("[/／]").as(:div) >> space >> mul.as(:rhs) |
                   prim }

    rule(:prim) { dice | num | str("(") >> space >> add >> space >> str(")") }

    rule(:dice) { num.maybe.as(:dice_num) >> match("[dｄDＤ]") >> num.maybe.as(:dice_face_num) }
    rule(:num)  { match("[0-9０-９]").repeat(1).as(:num_include_zen) }

    root :input
end

parser = DiceParser.new


class DiceCalculator < Parslet::Transform
    rule(:lhs => subtree(:lhs), :add => simple(:_), :rhs => subtree(:rhs)) { { src: "#{lhs[:src]} + #{rhs[:src]}",
                                                                           throwed: "#{lhs[:throwed]} + #{rhs[:throwed]}",
                                                                            result: lhs[:result] + rhs[:result] } }

    rule(:lhs => subtree(:lhs), :sub => simple(:_), :rhs => subtree(:rhs)) { { src: "#{lhs[:src]} - #{rhs[:src]}",
                                                                           throwed: "#{lhs[:throwed]} - #{rhs[:throwed]}",
                                                                            result: lhs[:result] - rhs[:result] } }

    rule(:lhs => subtree(:lhs), :mul => simple(:_), :rhs => subtree(:rhs)) { { src: "#{lhs[:src]} * #{rhs[:src]}",
                                                                           throwed: "#{lhs[:throwed]} * #{rhs[:throwed]}",
                                                                            result: lhs[:result] * rhs[:result] } }

    rule(:lhs => subtree(:lhs), :div => simple(:_), :rhs => subtree(:rhs)) { { src: "#{lhs[:src]} / #{rhs[:src]}",
                                                                           throwed: "#{lhs[:throwed]} / #{rhs[:throwed]}",
                                                                            result: lhs[:result] / rhs[:result] } }

    rule(:num_include_zen => simple(:num_include_zen)) {
        num_han = Moji.zen_to_han(num_include_zen.to_s)
        { src: num_han, throwed: num_han, result: num_han.to_i }
    }

    rule(:dice_num => subtree(:maybe_dice_num), :dice_face_num => subtree(:maybe_dice_face_num)) {
        dice_num = 1
        dice_face_num = 6

        dice_num = maybe_dice_num[:result] unless maybe_dice_num.nil?
        dice_face_num = maybe_dice_face_num[:result] unless maybe_dice_face_num.nil?

        dice = Array.new
        sum = 0

        dice_num.times do
            result = rand(1..dice_face_num)
            dice.push(result.to_s)
            sum += result
        end

        { src: "#{dice_num.to_s}D#{dice_face_num}", throwed: "[#{dice.join(", ")}]", result:sum }
    }
end

calculator = DiceCalculator.new


EM.run do
    id = rand.to_s
    playerName = "ダイス代数"

    socket = Faye::WebSocket::Client.new "ws://localhost:8864"

    socket.on :open do
        socket.send({ enter: true,
                         id: id,
                 playerName: playerName}.to_json)
    end

    socket.on :close do
        EM::stop_event_loop
    end

    socket.on :message do |ev|
        msg = JSON.parse(ev.data)
        
        if msg["talk"] and !msg["log"] and msg["id"] != id then
            input = msg["input"]

            begin
                result = calculator.apply(parser.parse(input))
                if result[:src] != result[:throwed] then
                    input = "#{result[:src]} = #{result[:throwed]} = #{result[:result]}"

                    socket.send({ talk: true,
                                window: msg["window"],
                                    id: id,
                            playerName: playerName,
                                 input: input }.to_json);
                end
            rescue
            end
        end
    end
end
