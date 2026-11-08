$ErrorActionPreference = 'Stop'

$build = Join-Path $PSScriptRoot 'build'
New-Item -ItemType Directory -Force -Path $build | Out-Null

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$installation = $null
if (Test-Path $vswhere) {
    $installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
}
if (-not $installation) {
    $fallbackVs = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\2022\BuildTools'
    if (Test-Path $fallbackVs) {
        $installation = $fallbackVs
    }
}

$sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10'
$hasMsvc = $false
if ($installation -and (Test-Path (Join-Path $installation 'VC\Tools\MSVC')) -and (Test-Path (Join-Path $sdkRoot 'Include'))) {
    $compilerRoot = Get-ChildItem (Join-Path $installation 'VC\Tools\MSVC') -Directory | Sort-Object Name -Descending | Select-Object -First 1
    $sdkVersion = Get-ChildItem (Join-Path $sdkRoot 'Include') -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if ($compilerRoot -and $sdkVersion) {
        $hasMsvc = $true
        $env:INCLUDE = "$($compilerRoot.FullName)\include;$sdkRoot\Include\$($sdkVersion.Name)\ucrt;$sdkRoot\Include\$($sdkVersion.Name)\shared;$sdkRoot\Include\$($sdkVersion.Name)\um;$sdkRoot\Include\$($sdkVersion.Name)\winrt"
        $env:LIB = "$($compilerRoot.FullName)\lib\x64;$sdkRoot\Lib\$($sdkVersion.Name)\ucrt\x64;$sdkRoot\Lib\$($sdkVersion.Name)\um\x64"
        Push-Location $build
        try {
            & "$($compilerRoot.FullName)\bin\Hostx64\x64\cl.exe" /nologo /EHsc /std:c++17 /MT /O2 /W4 /DUNICODE /D_UNICODE ../main.cpp /Fe:sharkord-audio-attenuator.exe /link mmdevapi.lib ole32.lib user32.lib
            if ($LASTEXITCODE -ne 0) { throw 'Windows audio attenuator MSVC build failed' }
        } finally {
            Pop-Location
        }
    }
}

if (-not $hasMsvc) {
    $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not (Test-Path $csc)) {
        throw 'Neither MSVC Build Tools nor Microsoft.NET Framework64 csc.exe was found'
    }
    $outExe = Join-Path $build 'sharkord-audio-attenuator.exe'
    $srcCs = Join-Path $PSScriptRoot 'main.cs'
    & $csc /nologo /optimize+ /platform:x64 /target:exe "/out:$outExe" $srcCs
    if ($LASTEXITCODE -ne 0) { throw 'Windows audio attenuator csc build failed' }
}
