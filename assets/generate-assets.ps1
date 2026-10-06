# Original SAM AI geometric sparkle, created from vector geometry without fonts.
# Run this script with Windows PowerShell to regenerate every checked-in PNG.
# brand-mark.svg is the editable SVG equivalent of the opaque store icon.
# Adaptive foreground and monochrome marks fit within Android's 66/108 safe circle.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-SparklePath([float]$Cx, [float]$Cy, [float]$Rx, [float]$Ry) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.StartFigure()
    $path.AddBezier($Cx, ($Cy - $Ry), ($Cx + $Rx * .22), ($Cy - $Ry * .25), ($Cx + $Rx * .25), ($Cy - $Ry * .20), ($Cx + $Rx), $Cy)
    $path.AddBezier(($Cx + $Rx), $Cy, ($Cx + $Rx * .25), ($Cy + $Ry * .20), ($Cx + $Rx * .22), ($Cy + $Ry * .25), $Cx, ($Cy + $Ry))
    $path.AddBezier($Cx, ($Cy + $Ry), ($Cx - $Rx * .22), ($Cy + $Ry * .25), ($Cx - $Rx * .25), ($Cy + $Ry * .20), ($Cx - $Rx), $Cy)
    $path.AddBezier(($Cx - $Rx), $Cy, ($Cx - $Rx * .25), ($Cy - $Ry * .20), ($Cx - $Rx * .22), ($Cy - $Ry * .25), $Cx, ($Cy - $Ry))
    $path.CloseFigure()
    return $path
}

function New-AccentPath {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.StartFigure()
    $path.AddBezier(470, 535, 510, 455, 651, 455, 703, 548)
    $path.AddBezier(703, 548, 757, 644, 680, 760, 567, 743)
    $path.AddBezier(567, 743, 655, 680, 605, 574, 470, 535)
    $path.CloseFigure()
    return $path
}

function Save-Icon([string]$Name, [int]$Size, [float]$MarkScale, [bool]$Transparent, [bool]$Monochrome) {
    $bitmap = [System.Drawing.Bitmap]::new($Size * 3, $Size * 3, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $violet = [System.Drawing.ColorTranslator]::FromHtml('#7254E8')
    $magenta = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#B8318B'))
    $pink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#EAA0D6'))
    $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { $violet }))
    $graphics.ScaleTransform(($Size * 3.0 / 1024), ($Size * 3.0 / 1024))
    $graphics.TranslateTransform(512, 512)
    $graphics.ScaleTransform($MarkScale, $MarkScale)
    $graphics.TranslateTransform(-512, -512)
    $main = New-SparklePath 470 535 156 225
    $small = New-SparklePath 700 336 53 72
    $accent = New-AccentPath
    if (-not $Monochrome) { $graphics.FillPath($magenta, $accent) }
    $graphics.FillPath([System.Drawing.Brushes]::White, $main)
    if ($Monochrome) {
        $graphics.FillPath([System.Drawing.Brushes]::White, $small)
    } else {
        $graphics.FillPath($pink, $small)
    }
    $outputFormat = if ($Transparent) { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
    $result = [System.Drawing.Bitmap]::new($Size, $Size, $outputFormat)
    $output = [System.Drawing.Graphics]::FromImage($result)
    if (-not $Transparent) { $output.Clear($violet) }
    $output.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $output.DrawImage($bitmap, 0, 0, $Size, $Size)
    $result.Save((Join-Path $PSScriptRoot $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
    $result.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    $main.Dispose()
    $small.Dispose()
    $accent.Dispose()
    $magenta.Dispose()
    $pink.Dispose()
}

Save-Icon 'icon.png' 1024 1.14 $false $false
Save-Icon 'android-icon-foreground.png' 1024 0.88 $true $false
Save-Icon 'android-icon-monochrome.png' 1024 0.88 $true $true
Save-Icon 'splash-icon.png' 1024 1.0 $true $false
Save-Icon 'favicon.png' 64 1.32 $false $false

# Retain the optional opaque background file for tools using this template asset.
$background = [System.Drawing.Bitmap]::new(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$backgroundGraphics = [System.Drawing.Graphics]::FromImage($background)
$backgroundGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#7254E8'))
$background.Save((Join-Path $PSScriptRoot 'android-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$backgroundGraphics.Dispose()
$background.Dispose()
