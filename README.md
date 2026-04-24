# Bronze Mirror Webview

这是给小程序 `web-view` 使用的静态 3D 页面。

## 目录

- `index.html`: 页面入口
- `main.js`: Three.js 场景、热点、右侧说明逻辑
- `models/`: 铜镜模型和贴图资源

## 本地开发

在当前目录启动静态服务：

```bash
python3 -m http.server 8123 --directory /Users/kuaishoudake/Documents/bronze-mirror-webview
```

浏览器访问：

```text
http://127.0.0.1:8123/index.html?v=1&mirrorId=M001&hotspotId=grape&source=direct
```

## 参数协议

- `v`: 协议版本，当前固定为 `1`
- `mirrorId`: 铜镜 ID，例如 `M001`
- `hotspotId`: 默认激活的热点，例如 `grape`
- `source`: 来源入口，例如 `miniapp-detail` / `graph` / `topic`

示例：

```text
https://yourname.github.io/bronze-mirror-webview/index.html?v=1&mirrorId=M001&hotspotId=grape&source=miniapp-detail
```

## GitHub Pages 部署

最简单的方式：新建一个单独仓库，把当前目录内容作为仓库根目录推上去。

仓库建议：

- 仓库名：`bronze-mirror-webview`
- 分支：`main`

部署步骤：

1. 把当前目录全部文件推到 GitHub 仓库根目录
2. 进入 GitHub 仓库 `Settings -> Pages`
3. `Build and deployment` 选择 `Deploy from a branch`
4. Branch 选 `main`，Folder 选 `/ (root)`
5. 保存后等待 GitHub Pages 发布

发布后地址通常是：

```text
https://<your-github-name>.github.io/bronze-mirror-webview/
```

## 接回小程序

小程序详情页当前通过 `pages/detail/index.js` 构造 `webviewSrc`。

把：

```js
const WEBVIEW_BASE_URL = "http://172.20.44.40:8123/index.html";
```

改成：

```js
const WEBVIEW_BASE_URL = "https://<your-github-name>.github.io/bronze-mirror-webview/index.html";
```

## 正式上线注意事项

如果要真机预览或上线，GitHub Pages 域名必须配置到小程序后台的 `业务域名`。

路径：

- 微信公众平台 -> 小程序 -> 开发管理 -> 开发设置 -> 业务域名

如果后面改成自定义域名，也要继续保持 HTTPS。
