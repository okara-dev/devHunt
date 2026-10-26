function y {
    param(
        [string]$text,
        [switch]$rueck
    )

    if ([string]::IsNullOrEmpty($text) -and -not $rueck) {
        Write-Host "Beispiel: y HALLO" -ForegroundColor Yellow
        Write-Host "Morse zu Text: y '.... .- .-.. .-.. ---' -rueck" -ForegroundColor Yellow
        return
    }

    if ($rueck) {
        $text = $text -replace "/", " / "
        $words = $text -split " / "
        $result = ""
        foreach ($word in $words) {
            $letters = $word.Trim() -split " "
            foreach ($letter in $letters) {
                switch ($letter) {
                    ".-" { $result += "A" }
                    "-..." { $result += "B" }
                    "-.-." { $result += "C" }
                    "-.." { $result += "D" }
                    "." { $result += "E" }
                    "..-." { $result += "F" }
                    "--." { $result += "G" }
                    "...." { $result += "H" }
                    ".." { $result += "I" }
                    ".---" { $result += "J" }
                    "-.-" { $result += "K" }
                    ".-.." { $result += "L" }
                    "--" { $result += "M" }
                    "-." { $result += "N" }
                    "---" { $result += "O" }
                    ".--." { $result += "P" }
                    "--.-" { $result += "Q" }
                    ".-." { $result += "R" }
                    "..." { $result += "S" }
                    "-" { $result += "T" }
                    "..-" { $result += "U" }
                    "...-" { $result += "V" }
                    ".--" { $result += "W" }
                    "-..-" { $result += "X" }
                    "-.--" { $result += "Y" }
                    "--.." { $result += "Z" }
                    default { $result += "?" }
                }
            }
            $result += " "
        }
        Write-Host $result.Trim() -ForegroundColor Yellow
    } else {
        $result = ""
        foreach ($char in $text.ToUpper().ToCharArray()) {
            switch ($char) {
                "A" { $result += ".- " }
                "B" { $result += "-... " }
                "C" { $result += "-.-. " }
                "D" { $result += "-.. " }
                "E" { $result += ". " }
                "F" { $result += "..-. " }
                "G" { $result += "--. " }
                "H" { $result += ".... " }
                "I" { $result += ".. " }
                "J" { $result += ".--- " }
                "K" { $result += "-.- " }
                "L" { $result += ".-.. " }
                "M" { $result += "-- " }
                "N" { $result += "-. " }
                "O" { $result += "--- " }
                "P" { $result += ".--. " }
                "Q" { $result += "--.- " }
                "R" { $result += ".-. " }
                "S" { $result += "... " }
                "T" { $result += "- " }
                "U" { $result += "..- " }
                "V" { $result += "...- " }
                "W" { $result += ".-- " }
                "X" { $result += "-..- " }
                "Y" { $result += "-.-- " }
                "Z" { $result += "--.. " }
                " " { $result += "/ " }
                default { $result += "? " }
            }
        }
        Write-Host $result.Trim() -ForegroundColor Green
    }
}