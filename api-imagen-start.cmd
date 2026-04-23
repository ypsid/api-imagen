@echo on
setlocal

set NODE_ENV=production
set HOST=0.0.0.0
set PORT=4000

cd /d E:\ypsilon\apps\api-imagen

REM Use absolute node path (important for services)
"C:\Program Files\nodejs\node.exe" E:\ypsilon\apps\api-imagen\src\app.js

