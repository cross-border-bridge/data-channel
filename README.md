# <p align="center"><img src="title.png"/></p> 
- DataChannelのTypeScript用の実装を提供します
- Node.jsで利用することを想定しています

## Setup
### package.json
```
    "dependencies": {
        "@cross-border-bridge/data-channel": "~2.0.0"
    },
```

## Usage
#### step 1: import

```typescript
import * as dc from "@cross-border-bridge/data-channel";
```

#### step 2: DataChannelを準備
使用するDataBusインスタンスを指定してDataChannelを生成します。

```typescript
    var dataChannel: dc.DataChannel = new dc.DataChannel(dataBus);
```

#### step 3: 受信データの受け口を設定
`DataChannel#addHandler` で受信データの受け口となるハンドラを追加します

```typescript
    var handler: dc.DataChannelHandler = (packet, callback?) => {
        データ受信時の処理（省略）
        // callbackがundefinedでない場合, 以下のように応答を返信する
        if (callback) {
            callback.apply(this, ["format", "response-data"]);
        }
    }
    dataChannel.addHandler(handler);
```

> `DataChannel#removeHandler` で解除することができます。

#### step 4-1: PUSH (単方向データ) を送信
- `DataChannel#send` で `callback` の指定を省略することで, PUSH (単方向データ) を送信することができます
- PUSH は相手からの応答が不要な場合に使用します

```typescript
    dataChannel.send(["format", "data"]);
```

#### step 4-2: REQUEST (双方向データ) を送信
- `DataChannel#send` に `callback` を指定することで, REQUEST (双方向データ) を送信することができます
- REQUEST は相手からの応答が必要な場合に使用します

```typescript
    dataChannel.send(["format", "data"], (error, packet) => {
        応答受信時の処理（省略）
        // errorはDataChannel内でエラーが発生した時に設定される
    });
```

#### step 5: 破棄
`DataChannel#destroy` で破棄できます。

```typescript
    dataChannel.destroy();
```

> DataChannelをdestroyしても下位層（DataBus）のdestroyは行われません。

## License
- Source code, Documents: [MIT](LICENSE)
- Image files: [CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/)
