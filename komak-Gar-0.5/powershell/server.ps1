$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataDir = Join-Path $root 'data'
$ordersFile = Join-Path $dataDir 'orders.json'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
if (-not (Test-Path $ordersFile)) { Set-Content -Path $ordersFile -Value '[]' -Encoding UTF8 }

function Send-Json($context, $status, $payload) {
  $body = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 10))
  $context.Response.StatusCode = $status
  $context.Response.ContentType = 'application/json; charset=utf-8'
  $context.Response.ContentLength64 = $body.Length
  $context.Response.OutputStream.Write($body, 0, $body.Length)
  $context.Response.Close()
}

function Get-Mime($path) {
  switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.js' { 'text/javascript; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.png' { 'image/png' }
    default { 'application/octet-stream' }
  }
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add('http://127.0.0.1:3001/')
$listener.Start()
Write-Host 'Helpgar local store: http://127.0.0.1:3001/'

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/api/health') {
      Send-Json $context 200 @{ ok = $true; service = 'helpgar-local-store' }
      continue
    }
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/api/orders') {
      $ordersRaw = Get-Content $ordersFile -Raw
      $orders = if ($ordersRaw.Trim() -eq '[]') { @() } else { @(ConvertFrom-Json $ordersRaw) }
      Send-Json $context 200 $orders
      continue
    }
    if ($request.HttpMethod -eq 'POST' -and $request.Url.AbsolutePath -eq '/api/orders/status') {
      $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
      $statusInput = $reader.ReadToEnd() | ConvertFrom-Json
      $reader.Close()
      $ordersRaw = Get-Content $ordersFile -Raw
      $orders = if ($ordersRaw.Trim() -eq '[]') { @() } else { @(ConvertFrom-Json $ordersRaw) }
      $order = $orders | Where-Object { $_.id -eq [string]$statusInput.id } | Select-Object -First 1
      if (-not $order) {
        Send-Json $context 404 @{ error = 'Order not found.' }
        continue
      }
      $allowedStatuses = @('جدید', 'تأیید شد', 'در حال آماده‌سازی', 'ارسال شد', 'تکمیل شد', 'لغو شد')
      if ($allowedStatuses -notcontains [string]$statusInput.status) {
        Send-Json $context 400 @{ error = 'Invalid order status.' }
        continue
      }
      $order.status = [string]$statusInput.status
      $orders | ConvertTo-Json -Depth 10 | Set-Content -Path $ordersFile -Encoding UTF8
      Send-Json $context 200 @{ ok = $true; order = $order }
      continue
    }
    if ($request.HttpMethod -eq 'POST' -and $request.Url.AbsolutePath -eq '/api/orders') {
      $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
      $input = $reader.ReadToEnd() | ConvertFrom-Json
      $reader.Close()
      if (-not $input.name -or -not $input.phone -or -not $input.address -or -not $input.items) {
        Send-Json $context 400 @{ error = 'Name, phone, address, and at least one item are required.' }
        continue
      }
      $orders = @()
      $ordersRaw = Get-Content $ordersFile -Raw
      if ($ordersRaw.Trim() -ne '[]') { $orders = @(ConvertFrom-Json $ordersRaw) }
      $total = 0
      foreach ($item in $input.items) { $total += ([double]$item.price * [int]$item.quantity) }
      $order = [ordered]@{
        id = 'HG-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        createdAt = [DateTime]::UtcNow.ToString('o')
        status = 'جدید'
        name = [string]$input.name
        phone = [string]$input.phone
        address = [string]$input.address
        items = @($input.items)
        total = $total
      }
      $orders += [PSCustomObject]$order
      $orders | ConvertTo-Json -Depth 10 | Set-Content -Path $ordersFile -Encoding UTF8
      Send-Json $context 201 @{ ok = $true; order = $order }
      continue
    }

    $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
    if (-not $relative) { $relative = 'project.html' }
    $file = if ($relative -notmatch '/') { Join-Path $root (Join-Path 'html' $relative) } else { Join-Path $root $relative }
    if ((Test-Path $file) -and -not (Get-Item $file).PSIsContainer) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $response.StatusCode = 200
      $response.ContentType = Get-Mime $file
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
      $response.Close()
    } else {
      Send-Json $context 404 @{ error = 'Page not found.' }
    }
  } catch {
    Send-Json $context 400 @{ error = $_.Exception.Message }
  }
}
