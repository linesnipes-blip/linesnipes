@echo off
cd /d G:\Line Snipes\linesnipes
echo.
echo === LineSnipes Git Push ===
echo.
git add public/index.html
git add public/js/engine.js
git add public/js/ui.js
git add public/js/app.js
git add netlify/functions/promo.js
git add netlify/functions/odds.js
git add netlify/functions/sports.js
git add netlify/functions/checkout.js
git add netlify/functions/stripe-webhook.js
git add netlify/functions/profile.js
git add netlify/functions/utils/db.js
git status
echo.
set /p msg="Commit message (or press Enter for default): "
if "%msg%"=="" set msg=update
git commit -m "%msg%"
git push
echo.
echo === Done! Netlify will auto-deploy. ===
pause
