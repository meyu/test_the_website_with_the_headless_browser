
## 目的

測試網站之可用性及效能。

## 實作概念

以無頭瀏覽器 (Headless Browser) 搭配操作腳本，快速模擬客戶端之登入操作、頁面瀏覽行為，並紀錄頁面回應狀態及耗時。  

## 使用方式

1. 找一台有安裝 Edge 瀏覽器的電腦
1. 放置 `app.exe` 及 `app.config.json` 於同一目錄
1. 修改 `app.config.json` 之設定，以符合所需
1. 執行 `app.exe` 
1. 觀測所產生之 `browse.log` 
1. 觀測所產生之 `borwse.error.log` (供錯誤監測用，每次執行時皆會重置)

> 目前僅實作於 Windows 平台

## 腳本設定檔

`app.config.json` 為 `app.exe` 之腳本設定檔，範例內容如下：

```json
{
  "要進行的登入操作": {
    "是否要進行": true,
    "要操作的頁面": "https://example.com/login",
    "要使用的帳號": "my_account",
    "要使用的密碼": "my_password",
    "帳號的selector": "#account_input",
    "密碼的selector": "#password_input",
    "登入觸發的selector": "#submit_button",
    "成功登入後的頁面為": "https://example.com/user"
  },
  "要瀏覽的頁面們": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "操作紀錄存檔路徑": "browse.log",
  "特殊即時觀測檔存檔路徑": "browse.error.log",
  "同時進行幾個": 1
}
```

### 注意事項

- 所測網站若需登入後使用，請完成 `要進行的登入操作` 之設定
- 欲測頁面，請自行增添於 `要瀏覽的頁面們`
- `同時進行幾個`之數字，為`可同時進行`之瀏覽器實體，權充模擬多個客戶端要求連線之情況，但不建議超過 `10` 個 (node.js 有 EventEmitter memory leak 之限制，而主機效能不足時，亦會影響頁面回應之實際速度)

## 開發環境

```ps
winget install OpenJS.NodeJS
npm i puppeteer-core
npm i edge-paths
npm i pkg
```

## 編譯指令

```bash
pkg app.js -c package.json
```

## 執行效能備忘

在 `i7-8700 CPU @ 3.20GHz` 環境下，執行數及其頁面回應時間，約略紀錄如下：
- 1：566ms 
- 10：1777ms
- 20：2643ms
- 30：4355ms
- 40：6033ms
- 50：7045ms
- 100：37820ms
- 200：239550ms (約有 172 次逾時錯誤)

> 在多台電腦同時執行時，各台電腦之表現與單台一致，故判斷回應時間之變化，係受電腦之效能(CPU、網卡頻寬)所影響。


## 參考資源

- [puppeteer: Headless Chrome Node.js API](https://github.com/puppeteer/puppeteer)
- [Puppeteer overview](https://learn.microsoft.com/en-us/microsoft-edge/puppeteer/)
- [pkg: Package your Node.js project into an executable](https://github.com/vercel/pkg)