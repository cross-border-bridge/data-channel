// Copyright © 2017 DWANGO Co., Ltd.

describe("DataChannelSpec", function(){
    var dc = require("../lib/DataChannel.js")
    var dataBus = new Object();
    var dataChannel;
    var counter;
    var handler1, handler2;

    it("インスタンス生成", function() {
        dataChannel = new dc.DataChannel(dataBus);
        expect(dataChannel).not.toBeUndefined();
    });

    it("最初のハンドラ登録時にDataBusにaddHandlerされる", function() {
        counter = 0;
        dataBus.addHandler = function() {
            counter++;
        }
        dataBus.removeHandler = function() {
            counter += 2;
        }
        handler1 = function(error, packet, callback) {
        }
        dataChannel.addHandler(handler1);
        expect(1).toEqual(counter);
        expect(1).toEqual(dataChannel._handlers.length);
    });

    it("2回目のハンドラ登録時にはDataBusにはaddHandlerされない", function() {
        handler2 = function(error, packet, callback) {
        }
        dataChannel.addHandler(handler2);
        expect(1).toEqual(counter);
        expect(2).toEqual(dataChannel._handlers.length);
    });

    it("ハンドラ解除（1/2）", function() {
        dataChannel.removeHandler(handler1);
        expect(1).toEqual(counter);
        expect(1).toEqual(dataChannel._handlers.length);
    });

    it("ハンドラ解除（2/2）", function() {
        dataChannel.removeHandler(handler2);
        expect(3).toEqual(counter); // DataBus.removeHandlerが呼び出される
        expect(0).toEqual(dataChannel._handlers.length);
    });

    it("removeAllHandlers", function() {
        counter = 0;
        dataBus.addHandler = function() {
            counter++;
        }
        dataBus.removeHandler = function() {
            counter += 2;
        }
        handler1 = function(error, packet, callback) {
        }
        dataChannel.addHandler(handler1);
        handler2 = function(error, packet, callback) {
        }
        dataChannel.addHandler(handler2);
        expect(1).toEqual(counter);
        expect(2).toEqual(dataChannel._handlers.length);
        dataChannel.removeAllHandlers();
        expect(3).toEqual(counter);
        expect(0).toEqual(dataChannel._handlers.length);
    });

    it("PUSHデータ受信", function() {
        var handler = function(packet, callback) {
            expect("Hello").toEqual(packet);
            expect(callback).toBeUndefined();
        }
        dataChannel.addHandler(handler);
        dataChannel._handler(1, ["Hello"]);
        dataChannel.removeHandler(handler);
    });

    it("REQUESTデータ受信", function() {
        var handler = function(packet, callback) {
            expect("Hello").toEqual(packet);
            expect(callback).not.toBeUndefined();
        }
        dataChannel.addHandler(handler);
        dataChannel._handler(2, ["Tag", "Hello"]);
        dataChannel.removeHandler(handler);
    });

    it("無効なRESPONSEデータ受信", function() {
        var handler = function(packet, callback) {
            fail();
        }
        dataChannel.addHandler(handler);
        dataChannel._handler(3, ["Tag", "Response"]);
        dataChannel.removeHandler(handler);
    });

    it("無効なERRORデータ受信", function() {
        var handler = function(packet, callback) {
            fail();
        }
        dataChannel.addHandler(handler);
        dataChannel._handler(4, ["Tag", "Response"]);
        dataChannel.removeHandler(handler);
    });

    it("PUSHデータ送信", function() {
        dataBus.send = function(dataType, data) {
            expect(1).toEqual(dataType);
            expect(1).toEqual(data.length);
            expect(2).toEqual(data[0].length);
            expect("format").toEqual(data[0][0]);
            expect("packet").toEqual(data[0][1]);
        }
        dataChannel.send(["format", "packet"]);
    });

    it("REQUESTデータ送信（正常な応答）", function() {
        dataBus.send = function(dataType, data) {
            expect(2).toEqual(dataType);
            expect(2).toEqual(data.length);
            expect("c:1").toEqual(data[0]);
            expect(2).toEqual(data[1].length);
            expect("format").toEqual(data[1][0]);
            expect("packet").toEqual(data[1][1]);
            dataChannel._handler(3, [data[0], "Response"]);
        }
        dataChannel.send(["format", "packet"], function(error, packet) {
            expect(null, error);
            expect("Response", packet);
        });
    });

    it("REQUESTデータ送信（エラー応答）", function() {
        dataBus.send = function(dataType, data) {
            expect(2).toEqual(dataType);
            expect(2).toEqual(data.length);
            expect("c:2").toEqual(data[0]);
            expect(2).toEqual(data[1].length);
            expect("format").toEqual(data[1][0]);
            expect("packet").toEqual(data[1][1]);
            dataChannel._handler(4, [data[0], "Test Error"]);
        }
        dataChannel.send(["format", "packet"], function(error, packet) {
            expect("Test Error", error.type);
            expect(packet).toBeUndefined();
        });
    });

    it("REQUESTデータ送信（タイムアウト: 100ms）", function(done) {
        dataBus.send = function(dataType, data) {
            expect(2).toEqual(dataType);
            expect(2).toEqual(data.length);
            expect("c:3").toEqual(data[0]);
            expect(2).toEqual(data[1].length);
            expect("format").toEqual(data[1][0]);
            expect("packet").toEqual(data[1][1]);
        }
        dataChannel.send(["format", "packet"], function(error, packet) {
            expect("Timeout", error.type);
            expect(packet).toBeUndefined();
            done();
        }, 100);
    });

    it("REQUESTデータ送信（待ちぼうけdestroy→Closed）", function() {
        dataBus.send = function(dataType, data) {
            expect(2).toEqual(dataType);
            expect(2).toEqual(data.length);
            expect("c:4").toEqual(data[0]);
            expect(2).toEqual(data[1].length);
            expect("format").toEqual(data[1][0]);
            expect("packet").toEqual(data[1][1]);
        }
        dataChannel.send(["format", "packet"], function(error, packet) {
            expect("Closed", error.type);
            expect(packet).toBeUndefined();
        });
        expect(dataChannel.destroyed()).toBeFalsy();
        dataChannel.destroy();
        expect(dataChannel.destroyed()).toBeTruthy();
    });

    it("多重destroy", function() {
        dataChannel.destroy();
    });
});
