# Тесты проекта

## Бэкенд (JUnit 5 + Mockito)
Файлы: `backend/src/test/java/com/planfood/backend/`
Запуск: `cd backend && ./mvnw test`
Покрытие (JaCoCo): добавить фрагмент из `tests/jacoco-snippet.xml` в `backend/pom.xml`, затем `./mvnw verify`.
Тесты в `KnownDefectsTest` отключены (`@Disabled`): они описывают ожидаемое поведение для найденных дефектов.

## Фронтенд (node:test, без внешних зависимостей, нужен Node 18+)
Файлы: `frontend/tests/`
Запуск: `cd frontend && npm test`, покрытие: `npm run coverage`
Тесты с пометкой `[ДЕФЕКТ?]` помечены как `todo`: их падение означает найденную проблему и сборку не ломает.

## API (Postman)
Файлы: `tests/postman/`
Импортировать коллекцию и окружение в Postman, поднять проект (`docker compose up --build`), запустить коллекцию через Runner.
Проверки с пометками `[БАГ?]` и `[ТРЕБОВАНИЕ?]` описывают ожидаемое поведение: их падение означает найденный дефект.

## Моделирование ленты рецептов
`python3 tests/tools/simulate_feed.py` (из корня репозитория) — считает, как лента ведёт себя на реальных данных `recipes.json`.
