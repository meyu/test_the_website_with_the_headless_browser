
// 取得設定
const _fs = require('fs');
const _config_file = _fs.readFileSync('./app.config.json', 'utf8');
const _config = JSON.parse(_config_file);
const _lets = {
  send_ninjas: _config["同時進行幾個"],
  go_urls: _config["要瀏覽的頁面們"],
  do_login: {
    do: _config["要進行的登入操作"]["是否要進行"],
    url: _config["要進行的登入操作"]["要操作的頁面"],
    account: _config["要進行的登入操作"]["要使用的帳號"],
    password: _config["要進行的登入操作"]["要使用的密碼"],
    account_selector: _config["要進行的登入操作"]["帳號的selector"],
    password_selector: _config["要進行的登入操作"]["密碼的selector"],
    submit_selector: _config["要進行的登入操作"]["登入觸發的selector"],
    landing_url: _config["要進行的登入操作"]["成功登入後的頁面為"],
  },
  log_file_path: _config["操作紀錄存檔路徑"],
  log_error_file_path: _config["特殊即時觀測檔存檔路徑"],
};

// 起手式
const puppeteer = require("puppeteer-core");
const fs = require("fs/promises");
clear_error_log_file();

// 確認有 EDGE 才開始
let edge_path = "";
let has_edge = false;
try {
  const edge = require("edge-paths");
  edge_path = edge.getEdgePath();
  has_edge = true;
} catch (error) {
  log_to_file(error.message, "", true);
}

// 依要求之執行數，命名後派工
if (has_edge) {
  try {
    const ninjas = _lets.send_ninjas;
    const prefix_name = "0".repeat(ninjas.toString().length);
    for (let ii = 1; ii <= ninjas; ii++) {
      // 命名
      const mission_index_prefix =
        ninjas +
        "-" +
        prefix_name.substring(0, prefix_name.length - ii.toString().length);
      // 派工
      browse_website(mission_index_prefix + ii);
    }
  } catch (error) {
    log_to_file(error.message, "", true);
  }
}

// 派工方法：依設定檔內容，啟動瀏覽器、進行登入操作(若需)、前往各頁面瀏覽(若有)
async function browse_website(mission_index) {
  // 啟動瀏覽器
  const browser = await puppeteer.launch({ executablePath: edge_path });
  const page = await browser.newPage();
  log_to_file("browswer " + mission_index + " started", mission_index);
  // 植入特殊行為：有跳出訊息時，記錄內容後忽略之，以免頁面因等候回應而被卡住
  page.on("dialog", async (dialog) => {
    page.url
    log_to_file("message 『" + dialog.message() + "』 from " + page.url(), mission_index);
    await dialog.dismiss();
  });
  // 登入操作
  if (_lets.do_login.do) {
      await do_login(page, mission_index);
  }
  // 頁面瀏覽
  const urls = _lets.go_urls;
  if (urls) {
    for (let ii = 0; ii < urls.length; ii++) {
      await load_page(urls[ii], page, mission_index);
    }
  }
  // 收功
  await browser.close();
  log_to_file("browswer " + mission_index + " had ended", mission_index);
}

// 登入操作
async function do_login(page_instance, mission_index) {
  const login = _lets.do_login;
  // 先進行載入
  const is_load_ok = await load_page(login.url, page_instance, mission_index);
  if (!is_load_ok) {
    return false;
  }
  // 再進行操作
  let is_login = false;
  try {
    // 操作
    const start_time = new Date();
    await page_instance.type(login.account_selector, login.account);
    await page_instance.type(login.password_selector, login.password);
    const [response] = await Promise.all([
      page_instance.waitForNavigation(),
      page_instance.click(login.submit_selector),
    ]);
    const end_time = new Date();
    // 記下情況
    const is_login = response.url() == login.landing_url;
    log_to_file(
      "responsed status " +
        response.status() +
        " within " +
        (end_time - start_time) +
        "ms [login action] " +
        (is_login ? "succeded" : "failed") +
        "",
      mission_index,
      !response.ok()
    );
    // 記下伺服器錯誤
    if (response.status() >= 500) {
      const response_body = await response.text();
      log_to_file(
        "[login action] responsed text " + "\n" + response_body,
        mission_index,
        true
      );
    }
  } catch (error) {
    log_to_file(
      "[login action] responsed error " + "\n\t" + error.message,
      mission_index,
      true
    );
  }
  return is_login;
}

// 頁面瀏覽
async function load_page(url, page_instance, mission_index) {
  let is_load_ok = false;
  try {
    const start_time = new Date();
    const response = await page_instance.goto(url);
    const end_time = new Date();
    // 記下情況
    log_to_file(
      "responsed status " +
        response.status() + " within " +
        (end_time - start_time) + "ms " + 
        "from url " +
        url + " " + 
        (response.url() == url ? "" : "redirect to " + response.url()) + 
        "",
      mission_index,
      !response.ok()
    );
    // 記下伺服器錯誤
    if (response.status() >= 500) {
      const response_body = await response.text();
      log_to_file(
        "responsed text " + "\n" + response_body,
        mission_index,
        true
      );
    }
    is_load_ok = response.ok();
  } catch (error) {
    log_to_file('responsed error from ' + url + '\n\t' + error.message, mission_index, true);
  }
  return is_load_ok;
}

// 寫紀錄
async function log_to_file(msg, mission_index, is_error) {
  try {
    log_path = _lets.log_file_path;
    log_msg =
      new Date().toLocaleTimeString("zh-TW", { hour12: false }) +
      " " +
      mission_index +
      " " +
      msg;
    fs.appendFile(_lets.log_file_path, log_msg + "\n");
    if (is_error) {
      fs.appendFile(_lets.log_error_file_path, log_msg + "\n");
    }
  } catch (err) {}
}

// 清除即時觀測檔
async function clear_error_log_file() {
  try {
    await fs.writeFile(_lets.log_error_file_path, "");
  } catch (err) {}
}
