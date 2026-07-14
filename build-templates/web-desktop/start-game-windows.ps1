param(
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Prefix = "http://127.0.0.1:$Port/"

function Get-ContentType($Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".js" { "application/javascript; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".png" { "image/png"; break }
    ".jpg" { "image/jpeg"; break }
    ".jpeg" { "image/jpeg"; break }
    ".ico" { "image/x-icon"; break }
    ".wasm" { "application/wasm"; break }
    ".mp3" { "audio/mpeg"; break }
    ".bin" { "application/octet-stream"; break }
    default { "application/octet-stream" }
  }
}

function Write-Response($Stream, $StatusLine, $ContentType, [byte[]]$Bytes) {
  $Header = "$StatusLine`r`nContent-Type: $ContentType`r`nContent-Length: $($Bytes.Length)`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  $Stream.Write($Bytes, 0, $Bytes.Length)
}

$Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)

try {
  $Listener.Start()
} catch {
  Write-Host "Could not start Bottle Hero on $Prefix"
  Write-Host "Another app may be using port $Port. Close it, then run this launcher again."
  throw
}

Write-Host "Bottle Hero is running:"
Write-Host $Prefix
Write-Host ""
Write-Host "Do not open index.html directly. Keep this window open while playing."
Write-Host "Press Ctrl+C or close this window to stop."
Start-Process $Prefix

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = New-Object System.IO.StreamReader($Stream, [System.Text.Encoding]::ASCII)
      $RequestLine = $Reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($RequestLine)) {
        $Client.Close()
        continue
      }

      $Parts = $RequestLine.Split(" ")
      $RequestPath = "/"
      if ($Parts.Length -ge 2) {
        $RequestPath = $Parts[1]
      }

      while (($Line = $Reader.ReadLine()) -ne $null -and $Line.Length -gt 0) {}

      $RequestPath = $RequestPath.Split("?")[0]
      $RequestPath = [Uri]::UnescapeDataString($RequestPath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($RequestPath)) {
        $RequestPath = "index.html"
      }

      $RelativePath = $RequestPath -replace "/", [System.IO.Path]::DirectorySeparatorChar
      $FullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $RelativePath))
      $RootFullPath = [System.IO.Path]::GetFullPath($Root)

      if (-not $FullPath.StartsWith($RootFullPath) -or -not [System.IO.File]::Exists($FullPath)) {
        $Bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Write-Response $Stream "HTTP/1.1 404 Not Found" "text/plain; charset=utf-8" $Bytes
        $Client.Close()
        continue
      }

      $Bytes = [System.IO.File]::ReadAllBytes($FullPath)
      Write-Response $Stream "HTTP/1.1 200 OK" (Get-ContentType $FullPath) $Bytes
      $Client.Close()
    } catch {
      $Client.Close()
    }
  }
} finally {
  $Listener.Stop()
}
