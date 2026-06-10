# Устанавливаем кодировку UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Имя выходного файла
$outputFile = "code.md"

# Очищаем или создаем выходной файл
"" | Out-File -FilePath $outputFile -Encoding utf8

# Получаем текущую директорию
$rootPath = Get-Location

# Список папок для исключения (можно добавить свои)
$excludeDirs = @('node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out')

# Ищем все файлы .ts и .tsx рекурсивно
# Сначала получаем все файлы, потом фильтруем те, что НЕ находятся в исключенных папках
$files = Get-ChildItem -Path $rootPath -Include *.ts, *.tsx -Recurse -File | Where-Object {
    $path = $_.FullName
    # Проверяем, содержит ли путь какую-либо из исключаемых папок
    $shouldExclude = $false
    foreach ($dir in $excludeDirs) {
        if ($path -like "*\${dir}\*" -or $path -like "*\${dir}") {
            $shouldExclude = $true
            break
        }
    }
    return -not $shouldExclude
}

foreach ($file in $files) {
    # Получаем относительный путь от корневой папки
    $relativePath = $file.FullName.Substring($rootPath.Path.Length + 1)
    
    # Заменяем обратные слеши на прямые для совместимости с Markdown
    $relativePath = $relativePath -replace '\\', '/'

    # Читаем содержимое файла
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    }
    catch {
        Write-Warning "Не удалось прочитать файл: $relativePath"
        continue
    }

    # Определяем язык для подсветки синтаксиса
    $lang = if ($file.Extension -eq '.tsx') { 'tsx' } else { 'typescript' }

    # Формируем строку по вашему шаблону:
    # каталог/файл.формат
    # >`` ` формат 
    # содержимое 
    # >` ``
    
    $markdownBlock = @"
$relativePath
>`` ` $lang
$content
>` ``

"@

    # Дописываем в файл
    $markdownBlock | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "Добавлен файл: $relativePath"
}

Write-Host "Готово! Результат записан в $outputFile"