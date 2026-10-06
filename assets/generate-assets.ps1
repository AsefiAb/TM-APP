# Original geometric app mark. Run on Windows with PowerShell to regenerate PNGs.
# brand-mark.svg is the editable vector counterpart. No fonts or external assets.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-ChatPath {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.StartFigure()
    $path.AddLine(386, 238, 638, 238)
    $path.AddBezier(638, 238, 720, 238, 778, 296, 778, 378)
    $path.AddLine(778, 378, 778, 585)
    $path.AddBezier(778, 585, 778, 665, 720, 724, 638, 724)
    $path.AddLine(638, 724, 436, 724)
    $path.AddLine(436, 724, 290, 804)
    $path.AddLine(290, 804, 290, 665)
    $path.AddBezier(290, 665, 252, 640, 230, 599, 230, 549)
    $path.AddLine(230, 549, 230, 378)
    $path.AddBezier(230, 378, 230, 296, 288, 238, 386, 238)
    $path.CloseFigure()
    return $path
}

function New-LetterPath {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.StartFigure()
    $path.AddLine(439, 334, 525, 334)
    $path.AddLine(525, 334, 525, 414)
    $path.AddLine(525, 414, 622, 414)
    $path.AddLine(622, 414, 622, 492)
    $path.AddLine(622, 492, 525, 492)
    $path.AddLine(525, 492, 525, 560)
    $path.AddBezier(525, 560, 525, 591, 542, 607, 573, 607)
    $path.AddLine(573, 607, 622, 607)
    $path.AddLine(622, 607, 622, 686)
    $path.AddLine(622, 686, 565, 686)
    $path.AddBezier(565, 686, 485, 686, 439, 643, 439, 566)
    $path.AddLine(439, 566, 439, 492)
    $path.AddLine(439, 492, 379, 492)
    $path.AddLine(379, 492, 379, 414)
    $path.AddLine(379, 414, 439, 414)
    $path.CloseFigure()
    return $path
}

function Save-Icon([string]$Name, [int]$Size, [float]$MarkScale, [bool]$Transparent, [bool]$Monochrome) {
    $bitmap = [System.Drawing.Bitmap]::new($Size * 3, $Size * 3, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $navy = [System.Drawing.ColorTranslator]::FromHtml('#18212E')
    $mint = [System.Drawing.ColorTranslator]::FromHtml('#D8F5E9')
    $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { $navy }))
    $graphics.ScaleTransform(($Size * 3.0 / 1024), ($Size * 3.0 / 1024))
    $graphics.TranslateTransform(512, 512)
    $graphics.ScaleTransform($MarkScale, $MarkScale)
    $graphics.TranslateTransform(-512, -512)
    $chat = New-ChatPath
    $letter = New-LetterPath
    $mintBrush = [System.Drawing.SolidBrush]::new($mint)
    $navyBrush = [System.Drawing.SolidBrush]::new($navy)
    if ($Monochrome) {
        $chat.FillMode = [System.Drawing.Drawing2D.FillMode]::Alternate
        $chat.AddPath($letter, $false)
        $graphics.FillPath([System.Drawing.Brushes]::White, $chat)
    } else {
        $graphics.FillPath($mintBrush, $chat)
        $graphics.FillPath($navyBrush, $letter)
    }
    $outputFormat = if ($Transparent) { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
    $result = [System.Drawing.Bitmap]::new($Size, $Size, $outputFormat)
    $output = [System.Drawing.Graphics]::FromImage($result)
    if (-not $Transparent) { $output.Clear($navy) }
    $output.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $output.DrawImage($bitmap, 0, 0, $Size, $Size)
    $result.Save((Join-Path $PSScriptRoot $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
    $result.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    $chat.Dispose()
    $letter.Dispose()
    $mintBrush.Dispose()
    $navyBrush.Dispose()
}

Save-Icon 'icon.png' 1024 1.0 $false $false
Save-Icon 'android-icon-foreground.png' 1024 0.8 $true $false
Save-Icon 'android-icon-monochrome.png' 1024 0.8 $true $true
Save-Icon 'splash-icon.png' 1024 1.0 $true $false
Save-Icon 'favicon.png' 64 1.2 $false $false

# Keep the optional background asset consistent for tools that use the template filename.
$background = [System.Drawing.Bitmap]::new(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$backgroundGraphics = [System.Drawing.Graphics]::FromImage($background)
$backgroundGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#18212E'))
$background.Save((Join-Path $PSScriptRoot 'android-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$backgroundGraphics.Dispose()
$background.Dispose()
