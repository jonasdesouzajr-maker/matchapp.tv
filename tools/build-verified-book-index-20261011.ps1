$ErrorActionPreference='Continue'
$root='E:\android\MatchAppAi-ProductionQA-20261011'
$raw=[IO.File]::ReadAllText("$root\ebooks\top-ebooks.js")
$matches=[regex]::Matches($raw,"\{title:'([^']+)',author:'([^']+)'")
function Normalize-Book([string]$text){
  $normalized=$text.Normalize([Text.NormalizationForm]::FormD)
  $normalized=[regex]::Replace($normalized,'\p{Mn}','')
  $normalized=$normalized.ToLowerInvariant()
  return [regex]::Replace($normalized,'[^\p{L}\p{N}]+',' ').Trim()
}
$items=New-Object System.Collections.Generic.List[object]
foreach($m in $matches){
  $title=$m.Groups[1].Value
  $author=$m.Groups[2].Value
  $u='https://openlibrary.org/search.json?title='+[uri]::EscapeDataString($title)+'&author='+[uri]::EscapeDataString($author)+'&limit=10&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count'
  try{
    $result=Invoke-RestMethod -Uri $u -TimeoutSec 13 -Headers @{'User-Agent'='MatchAppAi-book-source-verification/1.0'}
    $found=$null
    foreach($doc in $result.docs){
      if((Normalize-Book $doc.title) -ne (Normalize-Book $title)){continue}
      $matched=$false
      foreach($a in @($doc.author_name)){if((Normalize-Book $a) -eq (Normalize-Book $author)){$matched=$true;break}}
      if($matched -and [int]$doc.cover_i -gt 0){$found=$doc;break}
    }
    if(!$found){Write-Output ('NO_EXACT_COVER '+$title);continue}
    $entry=[ordered]@{title=$title;author=$author;source='Open Library';cover='https://covers.openlibrary.org/b/id/'+[int]$found.cover_i+'-L.jpg';year=$null;pages=$null;rating=$null;count=$null;url=$null}
    if($found.first_publish_year -ge 1500 -and $found.first_publish_year -le 2026){$entry.year=[int]$found.first_publish_year}
    if($found.number_of_pages_median -gt 0){$entry.pages=[int][math]::Round($found.number_of_pages_median)}
    if($found.ratings_count -gt 0 -and $found.ratings_average -ge 0 -and $found.ratings_average -le 5){$entry.rating=[double]$found.ratings_average;$entry.count=[int]$found.ratings_count}
    if([string]$found.key -match '^/works/OL\d+W$'){$entry.url='https://openlibrary.org'+$found.key}
    $items.Add($entry)
    Write-Output ('VERIFIED '+$title+' cover='+[int]$found.cover_i+' ratings='+$entry.count)
  }catch{Write-Output ('SOURCE_UNAVAILABLE '+$title+' '+$_.Exception.Message)}
  Start-Sleep -Milliseconds 150
}
$output=[ordered]@{schema=1;source='Open Library';collectedAt='2026-10-11';entries=@($items.ToArray())}
$json=$output|ConvertTo-Json -Depth 7
$file="$root\ebooks\verified-book-index-20261011.json"
[IO.File]::WriteAllText($file,$json,[Text.UTF8Encoding]::new($false))
Write-Output ('BUILT '+$file+' entries='+$items.Count)
