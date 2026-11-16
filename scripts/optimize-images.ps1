$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
public static class RawPreview {
    public static byte[] Extract(byte[] bytes) {
        int bestStart = -1, bestLength = 0;
        for (int i = 0; i < bytes.Length - 2; i++) {
            if (bytes[i] != 255 || bytes[i + 1] != 216 || bytes[i + 2] != 255) continue;
            bool supported = false;
            for (int marker = i + 3; marker < bytes.Length - 1; marker++) {
                if (bytes[marker] != 255) continue;
                if (bytes[marker + 1] == 192 || bytes[marker + 1] == 194) supported = true;
                if (bytes[marker + 1] == 218 || bytes[marker + 1] == 217) break;
            }
            if (!supported) continue;
            for (int end = i + 3; end < bytes.Length - 1; end++) {
                if (bytes[end] != 255 || bytes[end + 1] != 217) continue;
                int length = end + 2 - i;
                if (length > bestLength) { bestStart = i; bestLength = length; }
                break;
            }
        }
        if (bestStart < 0) throw new System.Exception("No embedded JPEG preview found.");
        var result = new byte[bestLength];
        System.Array.Copy(bytes, bestStart, result, 0, bestLength);
        return result;
    }
}
'@
$projectRoot = Split-Path $PSScriptRoot -Parent
$publicRoot = Join-Path $projectRoot 'public'

function Export-DisplayImage($source, $target, $maxWidth, $maxHeight, $png = $false) {
    $sourcePath = Join-Path $publicRoot $source
    $targetPath = Join-Path $publicRoot $target
    [System.IO.Directory]::CreateDirectory((Split-Path $targetPath -Parent)) | Out-Null
    $previewStream = $null
    try { $image = [System.Drawing.Image]::FromFile($sourcePath) }
    catch {
        # Some supplied .jpg files are actually Canon RAW files. Use their embedded JPEG preview.
        $bytes = [System.IO.File]::ReadAllBytes($sourcePath)
        if ($bytes[0] -ne 73 -or $bytes[1] -ne 73 -or $bytes[8] -ne 67 -or $bytes[9] -ne 82) { throw }
        $previewStream = [System.IO.MemoryStream]::new([RawPreview]::Extract($bytes))
        $image = [System.Drawing.Image]::FromStream($previewStream)
    }
    try {
        $scale = [Math]::Min(1.0, [Math]::Min($maxWidth / $image.Width, $maxHeight / $image.Height))
        $bitmap = [System.Drawing.Bitmap]::new([int][Math]::Round($image.Width * $scale), [int][Math]::Round($image.Height * $scale))
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.CompositingQuality = 'HighQuality'
                $graphics.InterpolationMode = 'HighQualityBicubic'
                $graphics.PixelOffsetMode = 'HighQuality'
                $graphics.DrawImage($image, 0, 0, $bitmap.Width, $bitmap.Height)
            } finally { $graphics.Dispose() }
            if ($png) {
                $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
            } else {
                $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
                $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
                try {
                    $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]80)
                    $bitmap.Save($targetPath, $codec, $parameters)
                } finally { $parameters.Dispose() }
            }
        } finally { $bitmap.Dispose() }
    } finally {
        $image.Dispose()
        if ($previewStream) { $previewStream.Dispose() }
    }
    # Keep already-efficient JPEGs if re-encoding would increase their download size.
    if (!$png -and !$previewStream -and [System.IO.Path]::GetExtension($sourcePath) -eq '.jpg' -and (Get-Item $targetPath).Length -gt (Get-Item $sourcePath).Length) {
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
    }
}

Get-ChildItem (Join-Path $publicRoot 'images/gallery/collection') -Filter 'photo-*.jpg' -File | ForEach-Object {
    Export-DisplayImage "images/gallery/collection/$($_.Name)" "images/gallery/collection/display/$($_.Name)" 1600 1200
}
Export-DisplayImage 'images/about-video-thumbnail.png' 'images/about-video-thumbnail-display.jpg' 1280 720
Export-DisplayImage '5BS logo.png' 'images/5bs-logo-header.png' 720 240 $true
