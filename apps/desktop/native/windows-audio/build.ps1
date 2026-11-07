$ErrorActionPreference = 'Stop'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installation) {
    $installation = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\2022\BuildTools'
}
$compilerRoot = Get-ChildItem (Join-Path $installation 'VC\Tools\MSVC') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10'
$sdkVersion = Get-ChildItem (Join-Path $sdkRoot 'Include') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$env:INCLUDE = "$($compilerRoot.FullName)\include;$sdkRoot\Include\$($sdkVersion.Name)\ucrt;$sdkRoot\Include\$($sdkVersion.Name)\shared;$sdkRoot\Include\$($sdkVersion.Name)\um;$sdkRoot\Include\$($sdkVersion.Name)\winrt"
$env:LIB = "$($compilerRoot.FullName)\lib\x64;$sdkRoot\Lib\$($sdkVersion.Name)\ucrt\x64;$sdkRoot\Lib\$($sdkVersion.Name)\um\x64"
$build = Join-Path $PSScriptRoot 'build'
New-Item -ItemType Directory -Force -Path $build | Out-Null
Push-Location $build
try {
    & "$($compilerRoot.FullName)\bin\Hostx64\x64\cl.exe" /nologo /EHsc /std:c++17 /MT /O2 /W4 /DUNICODE /D_UNICODE ../main.cpp /Fe:sharkord-window-audio.exe /link mmdevapi.lib ole32.lib user32.lib
    if ($LASTEXITCODE -ne 0) { throw 'Windows audio helper build failed' }
} finally { Pop-Location }
