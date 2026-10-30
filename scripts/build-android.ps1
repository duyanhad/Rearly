<#
  Build APK debug cho Android (dùng Capacitor + Gradle wrapper có sẵn).
  Chạy: npm run app:apk     (tự build web + sync + gradle)
  Kết quả: android\app\build\outputs\apk\debug\app-debug.apk

  Yêu cầu: JDK 17+ và Android SDK (platform 35, build-tools).
  Nếu chưa có SDK: cài Android Studio, hoặc chỉ cần command-line tools rồi
    sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# JDK: ưu tiên JAVA_HOME, không có thì dò bản cài mặc định trên Windows.
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    $candidates = @(
        'C:\Program Files\Java\latest\jdk-21',
        'C:\Program Files\Java\jdk-21',
        'C:\Program Files\Eclipse Adoptium\jdk-21*'
    )
    foreach ($candidate in $candidates) {
        $found = Get-Item $candidate -ErrorAction SilentlyContinue
        if ($found -and (Test-Path (Join-Path $found.FullName 'bin\java.exe'))) {
            $env:JAVA_HOME = $found.FullName
            break
        }
    }
}
if (-not $env:JAVA_HOME) { throw 'Chưa có JAVA_HOME. Cài JDK 17+ rồi đặt biến môi trường JAVA_HOME.' }

# Android SDK
if (-not $env:ANDROID_HOME) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (Test-Path $defaultSdk) { $env:ANDROID_HOME = $defaultSdk }
}
if (-not $env:ANDROID_HOME) { throw 'Chưa có ANDROID_HOME. Cài Android Studio hoặc command-line tools.' }

Write-Host "JAVA_HOME=$env:JAVA_HOME" -ForegroundColor Cyan
Write-Host "ANDROID_HOME=$env:ANDROID_HOME" -ForegroundColor Cyan

Push-Location (Join-Path $root 'android')
try {
    # gradlew.bat đôi khi lỗi classpath trên Windows → gọi thẳng wrapper jar.
    & java -cp 'gradle\wrapper\gradle-wrapper.jar' org.gradle.wrapper.GradleWrapperMain assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle thất bại (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apk) {
    $size = [math]::Round((Get-Item $apk).Length / 1MB, 2)
    Write-Host "Xong: $apk ($size MB)" -ForegroundColor Green
    Write-Host 'Cài lên máy đang cắm: adb install -r "' + $apk + '"' -ForegroundColor Yellow
} else {
    throw 'Không thấy file APK sau khi build.'
}
