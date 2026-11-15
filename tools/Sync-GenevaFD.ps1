# Geneva FD app sync: mirrors the source folder into the website repo and publishes changes.
$ErrorActionPreference = 'Stop'
$Source = 'C:\Users\Windows 10\Documents\Geneva FD App Folder'
$Repo   = 'C:\Users\Windows 10\GenevaFD-Site'
$Docs   = Join-Path $Repo 'docs'
$Log    = Join-Path $Repo 'sync.log'
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')

function Write-Log($m){ "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Add-Content -Path $Log }

$mutex = New-Object System.Threading.Mutex($false, 'Global\GenevaFDSync')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
  if (-not (Test-Path -LiteralPath $Source)) { Write-Log "Source folder missing: $Source"; exit 1 }
  Set-Location -LiteralPath $Repo
  git pull --quiet --rebase 2>&1 | Out-Null

  robocopy $Source $Docs /MIR /XF desktop.ini Thumbs.db '~$*' '*.tmp' /XA:H /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { Write-Log "robocopy failed with code $LASTEXITCODE"; exit 1 }

  function Get-Node([string]$path, [string]$rel) {
    $kids = New-Object System.Collections.ArrayList
    Get-ChildItem -LiteralPath $path -Directory | Sort-Object Name | ForEach-Object {
      $r = if ($rel) { "$rel/$($_.Name)" } else { $_.Name }
      [void]$kids.Add((Get-Node $_.FullName $r))
    }
    Get-ChildItem -LiteralPath $path -File | Sort-Object Name | ForEach-Object {
      $r = if ($rel) { "$rel/$($_.Name)" } else { $_.Name }
      [void]$kids.Add([ordered]@{ type='file'; name=$_.Name; path=$r; size=$_.Length; modified=$_.LastWriteTimeUtc.ToString('o') })
    }
    $name = if ($rel) { Split-Path $path -Leaf } else { '' }
    return [ordered]@{ type='folder'; name=$name; children=[object[]]$kids.ToArray() }
  }

  $tree = Get-Node $Docs ''
  $treeJson = ConvertTo-Json -InputObject $tree -Depth 50 -Compress
  $manifest = Join-Path $Repo 'files.json'
  $old = if (Test-Path $manifest) { Get-Content -Raw -LiteralPath $manifest } else { '' }
  $oldTree = $old -replace '^\{"updated":"[^"]*",', '{'

  $gitChanges = git status --porcelain -- docs
  if ($gitChanges -or ($oldTree.Trim() -ne $treeJson.Trim())) {
    $stamp = (Get-Date).ToUniversalTime().ToString('o')
    $out = '{"updated":"' + $stamp + '",' + $treeJson.Substring(1)
    [System.IO.File]::WriteAllText($manifest, $out, (New-Object System.Text.UTF8Encoding($false)))
    git add -A docs files.json 2>&1 | Out-Null
    git commit --quiet -m "Update documents $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
    $push = git push --quiet 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Log "Push failed: $push" } else { Write-Log "Published changes" }
  }
} catch {
  Write-Log "Error: $_"
} finally {
  $mutex.ReleaseMutex()
}
