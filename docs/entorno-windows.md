# Ejecución del evaluador original en Windows

El evaluador llama `npm` con `subprocess.run` y sin shell. En este entorno de Windows, Python no resuelve el lanzador `npm.cmd` como ejecutable. Se utiliza un adaptador local `npm.exe` que ejecuta el `npm-cli.js` de la instalación existente mediante su mismo `node.exe`.

[npm-launcher.cs](../evidence/week-01/entorno-windows/npm-launcher.cs) contiene el código completo: transmite los argumentos, stdout, stderr y el código de salida del proceso real. No inspecciona ni modifica pruebas, reportes ni resultados. El ejecutable se compila fuera del repositorio y sólo se añade al PATH de la sesión de validación. El código y la versión de npm permanecen iguales. En Ubuntu/GitHub Actions se usa npm directamente, sin este adaptador.

En la sesión de cierre se utilizaron Node 22.22.0, npm 10.9.4 y Python 3.13.7. Para reproducir en PowerShell con esa instalación preparada, desde la raíz del repositorio:

```powershell
$campusLauncherDir = Join-Path $env:TEMP 'campusops-npm-launcher'
New-Item -ItemType Directory -Force -Path $campusLauncherDir | Out-Null
$campusNodePath = (Get-Command node.exe).Source
$campusNodeDirectory = Split-Path -Parent $campusNodePath
$campusCompiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $campusCompiler /nologo /target:exe "/out:$campusLauncherDir/npm.exe" 'evidence/week-01/entorno-windows/npm-launcher.cs'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el adaptador de npm' }
$env:CAMPUS_NODE_EXE = $campusNodePath
$env:CAMPUS_NPM_CLI = Join-Path $campusNodeDirectory 'node_modules/npm/bin/npm-cli.js'
$env:Path = "$campusLauncherDir;$env:Path"
$env:PYTHON = 'python'
$env:PYTHONUTF8 = '1'
python -c "import subprocess; subprocess.run(['npm', '--version'], check=True)"
make setup
make feedback
make verify-week-01
make public-test-week-01
```

Cada comando se interpreta por su salida real y su código de retorno. Las variables son locales a esa sesión de PowerShell. `PYTHON` selecciona la instalación de Python disponible mediante la opción prevista por el Makefile, y `PYTHONUTF8` permite leer las salidas Unicode de las herramientas. Este adaptador de npm no necesita cambios en `package.json`, `course-tests/` ni `tools/course_public_evaluator.py`. El cambio posterior del Makefile para preparar el historial Git se documenta por separado en [preparacion-historial-git.md](preparacion-historial-git.md).
