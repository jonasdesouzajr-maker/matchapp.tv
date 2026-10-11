$ErrorActionPreference='Continue'
$root='E:\android\MatchAppAi-ProductionQA-20261011'
$file="$root\ebooks\verified-book-index-20261011.json"
$index=Get-Content $file -Raw | ConvertFrom-Json
$catalog=[IO.File]::ReadAllText("$root\ebooks\top-ebooks.js")
$all=[regex]::Matches($catalog,"\{title:'([^']+)',author:'([^']+)'")
function Norm([string]$s){$d=$s.Normalize([Text.NormalizationForm]::FormD);$d=[regex]::Replace($d,'\p{Mn}','');return [regex]::Replace($d.ToLowerInvariant(),'[^\p{L}\p{N}]+',' ').Trim()}
$list=New-Object System.Collections.Generic.List[object]
foreach($e in $index.entries){$list.Add($e)}
foreach($m in $all){
 $title=$m.Groups[1].Value;$author=$m.Groups[2].Value
 if(@($list|Where-Object{(Norm $_.title) -eq (Norm $title) -and (Norm $_.author) -eq (Norm $author)}).Count){continue}
 $market=if($catalog.Substring($m.Index, [Math]::Min(160,$catalog.Length-$m.Index)) -match "market:'BR'"){'BR'}else{'US'}
 $u='https://itunes.apple.com/search?term='+[uri]::EscapeDataString($title+' '+$author)+'&country='+$market+'&media=ebook&entity=ebook&limit=35'
 try{
  $data=Invoke-RestMethod -Uri $u -TimeoutSec 18 -Headers @{'User-Agent'='MatchAppAi-source-verification/1.0'}
  $found=$null
  foreach($row in $data.results){
   if((Norm $row.trackName) -ne (Norm $title)){continue}
   $sourceAuthors=Norm $row.artistName
   $requested=Norm $author
   if($sourceAuthors -ne $requested){continue}
   $cover=[string]$row.artworkUrl100
   if($cover -notmatch '^https://is[0-9]+-ssl\.mzstatic\.com/image/thumb/.+/100x100bb\.jpg$'){continue}
   if([string]$row.trackViewUrl -notmatch '^https://books\.apple\.com/(br|us)/book/[^\s]+/id[0-9]+'){continue}
   $found=$row;break
  }
  if(!$found){Write-Output ('APPLE_NO_EXACT '+$title);continue}
  $cover=[string]$found.artworkUrl100
  $candidate=$cover -replace '/100x100bb\.jpg$','/600x600bb.jpg'
  try{$response=Invoke-WebRequest -Method Head -Uri $candidate -UseBasicParsing -TimeoutSec 9;if($response.StatusCode -eq 200){$cover=$candidate}}catch{}
  $year=$null
  if([string]$found.releaseDate -match '^(\d{4})-'){$y=[int]$Matches[1];if($y -ge 1500 -and $y -le 2026){$year=$y}}
  $rating=$null;$count=$null
  if([double]$found.averageUserRating -gt 0 -and [double]$found.averageUserRating -le 5 -and [int]$found.userRatingCount -gt 0){$rating=[double]$found.averageUserRating;$count=[int]$found.userRatingCount}
  $entry=[ordered]@{title=$title;author=$author;source='Apple Books';cover=$cover;year=$year;pages=$null;rating=$rating;count=$count;url=[string]$found.trackViewUrl}
  $list.Add($entry)
  Write-Output ('APPLE_VERIFIED '+$title+' coverRes='+($cover.Split('/')[-1])+' count='+$count)
 }catch{Write-Output ('APPLE_UNAVAILABLE '+$title+' '+$_.Exception.Message)}
 Start-Sleep -Milliseconds 160
}
$output=[ordered]@{schema=1;source='Open Library + Apple Books';collectedAt='2026-10-11';entries=@($list.ToArray())}
[IO.File]::WriteAllText($file,($output|ConvertTo-Json -Depth 7),[Text.UTF8Encoding]::new($false))
Write-Output ('FINAL_VERIFIED_COUNT='+$list.Count)
