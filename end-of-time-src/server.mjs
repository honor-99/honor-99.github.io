import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
if (!existsSync(resolve(root, 'index.html'))) {
  console.error('尚未生成作品。请先运行 npm install 和 npm run build。');
  process.exit(1);
}
const server = createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400);response.end('请求地址无效');return; }
  const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(resolve(root) + sep)) { response.writeHead(403);response.end('禁止访问');return; }
  if (!existsSync(target) || !statSync(target).isFile()) { response.writeHead(404);response.end('文件不存在');return; }
  response.writeHead(200, {
    'Content-Type': types[extname(target)] || 'application/octet-stream',
    'Content-Length': statSync(target).size,
    'Cache-Control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(target).pipe(response);
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。如果作品已经打开，请继续访问 http://localhost:${port}。也可设置 PORT 后重新启动。` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`《时间的尽头》已启动：http://localhost:${port}\n保持此窗口运行，按 Ctrl+C 关闭。`));
