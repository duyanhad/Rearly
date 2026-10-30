<#
  Mở app ra Internet bằng HTTPS để test trên điện thoại (thông báo/push chỉ chạy trên HTTPS).

  Cách dùng (PowerShell, tại thư mục DrinkWatter):
    .\scripts\tunnel.ps1

  Yêu cầu: Vite dev đang chạy (npm run dev) và backend đang chạy (:5157).
  Mỗi lần chạy tạo một URL mới dạng https://xxx.trycloudflare.com — mở URL đó trên điện thoại.
  Không cần tài khoản Cloudflare. Dừng bằng Ctrl+C.
#>
$ErrorActionPreference = 'Stop'

$exe = Join-Path $env:LOCALAPPDATA 'dw-art-tools\cloudflared.exe'
if (-not (Test-Path $exe)) { $exe = Join-Path $env:TEMP 'cloudflared.exe' }
if (-not (Test-Path $exe)) {
    Write-Host 'Đang tải cloudflared (~53 MB)...' -ForegroundColor Cyan
    curl.exe -L --silent --show-error `
        'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' `
        -o $exe
}

$port = if ($env:VITE_PORT) { $env:VITE_PORT } else { 5173 }
Write-Host "Mở tunnel tới http://localhost:$port ..." -ForegroundColor Cyan
& $exe tunnel --no-autoupdate --url "http://localhost:$port"
