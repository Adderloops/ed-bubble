# ED BUBBLE - ayudante de teclas para Windows.
# Se queda abierto leyendo ordenes JSON por la entrada estandar (una por linea)
# y responde una linea JSON por orden. Cada orden:
#   { "id": 1, "ops": [ {"op":"focus"}, {"op":"down","sc":29,"ext":false},
#                       {"op":"up","sc":29,"ext":false}, {"op":"sleep","ms":60} ] }
# "focus" trae al frente la ventana de Elite Dangerous. Antes de cada tecla se
# comprueba que el juego sigue al frente: si no, se suelta todo y se aborta,
# para no escribir nunca en otra ventana.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public static class EdbKeys {
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public InputUnion U; }

  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

  const uint KEYEVENTF_EXTENDEDKEY = 0x1, KEYEVENTF_KEYUP = 0x2, KEYEVENTF_SCANCODE = 0x8;

  public static bool Key(ushort sc, bool ext, bool up) {
    INPUT[] a = new INPUT[1];
    a[0].type = 1;
    a[0].U.ki.wScan = sc;
    a[0].U.ki.dwFlags = KEYEVENTF_SCANCODE | (ext ? KEYEVENTF_EXTENDEDKEY : 0) | (up ? KEYEVENTF_KEYUP : 0);
    return SendInput(1, a, Marshal.SizeOf(typeof(INPUT))) == 1;
  }

  public static bool Focus(IntPtr h) {
    if (h == IntPtr.Zero) return false;
    if (IsIconic(h)) ShowWindow(h, 9);
    for (int i = 0; i < 3; i++) {
      if (GetForegroundWindow() == h) return true;
      IntPtr fg = GetForegroundWindow();
      uint fgThread = GetWindowThreadProcessId(fg, IntPtr.Zero);
      uint me = GetCurrentThreadId();
      bool attached = fgThread != 0 && fgThread != me && AttachThreadInput(me, fgThread, true);
      BringWindowToTop(h);
      SetForegroundWindow(h);
      if (attached) AttachThreadInput(me, fgThread, false);
      Thread.Sleep(60);
    }
    return GetForegroundWindow() == h;
  }
}
"@

function Get-GameWindow {
  $p = Get-Process -Name 'EliteDangerous64' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
  if ($p) { return $p.MainWindowHandle } else { return [IntPtr]::Zero }
}

function Reply($obj) { [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress)); [Console]::Out.Flush() }

Reply @{ ready = $true }

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Trim() -eq '') { continue }
  $id = $null
  $held = New-Object System.Collections.ArrayList
  try {
    $cmd = $line | ConvertFrom-Json
    $id = $cmd.id
    $hwnd = Get-GameWindow
    if ($hwnd -eq [IntPtr]::Zero) { Reply @{ id = $id; ok = $false; error = 'game-not-running' }; continue }
    $failed = $null
    foreach ($o in $cmd.ops) {
      switch ($o.op) {
        'focus' { if (-not [EdbKeys]::Focus($hwnd)) { $failed = 'focus-failed' } }
        'sleep' { Start-Sleep -Milliseconds ([int]$o.ms) }
        'down' {
          if ([EdbKeys]::GetForegroundWindow() -ne $hwnd) { $failed = 'focus-lost' }
          else { [void][EdbKeys]::Key([uint16]$o.sc, [bool]$o.ext, $false); [void]$held.Add($o) }
        }
        'up' {
          [void][EdbKeys]::Key([uint16]$o.sc, [bool]$o.ext, $true)
          $match = $held | Where-Object { $_.sc -eq $o.sc -and $_.ext -eq $o.ext } | Select-Object -First 1
          if ($match) { $held.Remove($match) }
        }
      }
      if ($failed) { break }
    }
    foreach ($h in $held) { [void][EdbKeys]::Key([uint16]$h.sc, [bool]$h.ext, $true) }
    if ($failed) { Reply @{ id = $id; ok = $false; error = $failed } } else { Reply @{ id = $id; ok = $true } }
  } catch {
    foreach ($h in $held) { try { [void][EdbKeys]::Key([uint16]$h.sc, [bool]$h.ext, $true) } catch {} }
    Reply @{ id = $id; ok = $false; error = $_.Exception.Message }
  }
}
