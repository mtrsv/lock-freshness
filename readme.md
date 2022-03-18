### Проверка свежести пакетов в yarn.lock и package-lock.json

- Положить ваш `yarn.lock` или `package-lock.json` в папку `lockfile`.
- В `index.js` изменить `DAYS_DIFF_MIN` на нужное значение (в днях, по умолчанию: 30). Если с момента релиза используемой версии прошло меньше N дней, будет выдано предупреждение.
- Если используете свой регистри, поменять `REGISTRY_URL`.
- Запустить через `node index.js`.
