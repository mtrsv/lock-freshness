### Проверка свежести пакетов в yarn.lock

- Положить ваш yarn.lock в папку `lock`
- В `index.js` изменить `DAYS_DIFF_MIN` на нужное значение (в днях, по умолчанию: 30). Если с момента релиза используемой версии прошло меньше N дней, будет выдано предупреждение.
- Запустить через `node index.js`