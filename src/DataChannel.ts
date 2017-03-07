// Copyright © 2017 DWANGO Co., Ltd.

import { DataBus, DataBusHandler } from '@cross-border-bridge/data-bus';

/**
 * データ種別コード
 */
const DATA_TYPE_PUSH = 1;
const DATA_TYPE_REQUEST = 2;
const DATA_TYPE_RESPONSE = 3;
const DATA_TYPE_ERROR = 4;

/**
 * DataChannel内部エラー
 */
export class DataChannelError extends Error {
    /**
     * エラータイプ。以下の文字列が入る
     *  - Unspecified : 不明なエラー
     *  - Timeout     : メッセージがタイムアウトした
     *  - Closed      : メッセージのレスポンスを受け取る前にDataChannelがクローズした
     */
    type: string
}

export type DataChannelCallback = (error: DataChannelError, packet: any) => void;
export type DataChannelResponseCallback = (packet: any) => void;
export type DataChannelHandler  = (packet: any, callback?: DataChannelResponseCallback) => boolean | void;

/**
 * DataBus上で単純なリクエスト＆レスポンス機構を提供する。
 */
export class DataChannel {
    private _identifier: string;
    private _dataBus: DataBus;
    private _handler: DataBusHandler = undefined;
    private _handlers: DataChannelHandler[] = [];
    private _tagCount: number = 0;
    private _waitingCallbacks: { [tag: string]: DataChannelCallback } = {};
    private _timeoutObjects: { [tag: string]: number } = {};

    constructor(dataBus: DataBus) {
        this._dataBus = dataBus;
    }

    /**
     * DataChannelを破棄する際に実行する。
     * このメソッドを実行するとすべてのハンドラが解放され、レスポンス待ちの処理についてはエラーが返る。
     */
    destroy(): void {
        if (!this._dataBus) return;
        this.unregister();
        this._dataBus = undefined;
        this._handlers = undefined;
        Object.keys(this._waitingCallbacks).forEach((tag) => {
            let error = <DataChannelError>new Error("plugin channel destroyed.");
            error.type = "Closed";
            this.processCallback(tag, error);
        });
        this._waitingCallbacks = undefined;
    }

    /**
     * このDataChannelが既に破棄されたかどうかを返す
     *
     * @return 破棄されていればtrue、されていなければfalse
     */
    destroyed(): boolean {
        return !this._dataBus;
    }

    /**
     * メッセージハンドラの登録を行う
     *
     * @param handler メッセージ受信時に実行されるハンドラ
     * @return ハンドラID
     */
    addHandler(handler: DataChannelHandler): void {
        if (!Object.keys(this._handlers).length) {
            this.register();
        }
        if (this._handlers.indexOf(handler) === -1) {
            this._handlers.push(handler);
        }
    }

    /**
     * メッセージハンドラの解除を行う
     *
     * @param handlerId ハンドラ登録時に取得したハンドラID
     */
    removeHandler(handler: DataChannelHandler): void {
        this._handlers = this._handlers.filter((h) => h !== handler);
        if (!Object.keys(this._handlers).length) {
            this.unregister();
        }
    }

    /**
     * 登録されているすべてのメッセージハンドラの解除を行う
     */
    removeAllHandlers(): void {
        if (!Object.keys(this._handlers).length) return;
        this._handlers = [];
        this.unregister();
    }

    /**
     * メッセージの送信を行う。
     *
     * @param packet メッセージの実データ。フォーマットによって内容は自由に定義できる
     * @param callback メッセージに対してのレスポンスを受け取るコールバック。任意指定
     * @param timeout レスポンスを待つ待機時間。待機時間を過ぎるとcallbackにtimeoutエラーが返る。未指定時はタイムアウトしない。
     */
    send(packet: any, callback: DataChannelCallback, timeout = 0): void {
        if (callback) {
            this.register();
            let tag = this.acquireTag();
            if (0 < timeout) {
                var timeoutObject = setTimeout(() => {
                    var error = <DataChannelError>new Error("send timeout.");
                    error.type = "Timeout";
                    this.processCallback(tag, error);
                }, timeout);
                this._timeoutObjects[tag] = timeoutObject;
            }
            this._waitingCallbacks[tag] = callback;
            this._dataBus.send(DATA_TYPE_REQUEST, [tag, packet]);
        } else {
            this._dataBus.send(DATA_TYPE_PUSH, [packet]);
        }
    }

    private register(): void {
        if (this._handler) return;
        this._handler = (dataType, data) => {
            switch (dataType) {
                case DATA_TYPE_ERROR: {
                    var error = new DataChannelError();
                    error.type = data[1];
                    this.processCallback(data[0], error);
                    return;
                }
                case DATA_TYPE_RESPONSE:
                    this.processCallback(data[0], null, data[1]);
                    return;
                case DATA_TYPE_PUSH:
                    this._handlers.forEach((handler) => {
                        handler(data[0]);
                    });
                    return;
                case DATA_TYPE_REQUEST: {
                    const responseCallback = (rpacket: any) => {
                        this._dataBus.send(DATA_TYPE_RESPONSE, [data[0], rpacket]);
                    }
                    this._handlers.forEach((handler) => {
                        handler(data[1], responseCallback);
                    });
                    return;
                }
            }
        };
        this._dataBus.addHandler(this._handler);
    }

    private unregister(): void {
        if (!this._handler) return;
        this._dataBus.removeHandler(this._handler);
        this._handler = undefined;
    }

    private processCallback(targetTag: string, error: DataChannelError, packet?: any): boolean {
        let callback = this._waitingCallbacks[targetTag];
        if (callback) {
            delete this._waitingCallbacks[targetTag];
            delete this._timeoutObjects[targetTag];
            callback(error, packet);
            return true;
        }
        return false;
    }

    private acquireTag(): string {
        return "c:" + ++this._tagCount;
    }
}
