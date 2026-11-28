#!/usr/bin/env python3
"""
Моделирование логики RecipeService.getFeed() на реальных данных recipes.json.
ВАЖНО: это НЕ запрос к работающему серверу, а перенос алгоритма из Java в Python
(тот же порядок шагов: убрать просмотренное -> убрать аллергены -> стабильная сортировка
по числу совпавших предпочтений -> limit 10; для гостя shuffle -> limit 10).
Запуск:  python3 simulate_feed.py <путь к recipes.json>
"""
import json, random, sys, collections, itertools, statistics

PATH = sys.argv[1] if len(sys.argv) > 1 else "backend/src/main/resources/recipes.json"
R = json.load(open(PATH, encoding="utf-8"))["recipes"]
for i, r in enumerate(R, 1):          # id как в БД: IDENTITY по порядку вставки
    r["id"] = i
    r["allergens"] = set(r.get("allergens") or [])
    r["prefs"] = set(r.get("dietaryPreferences") or [])
ALL_ALLERGENS = ["GLUTEN","LACTOSE","NUTS","EGGS","FISH","SEAFOOD","SOY","PEANUTS","CITRUSES"]
ALL_PREFS = ["VEGETARIAN","VEGAN","LOW_CARB","HIGH_PROTEIN","HALAL","KOSHER","NO_PORK"]

def feed(user=None, rng=random):
    """user=None -> гость. user = dict(allergens=set, prefs=set, viewed=set)"""
    pool = list(R)
    if user is None:
        rng.shuffle(pool)
        return pool[:10]
    pool = [r for r in pool if r["id"] not in user["viewed"]]
    pool = [r for r in pool if not (r["allergens"] & user["allergens"])]
    if user["prefs"]:
        pool.sort(key=lambda r: -len(r["prefs"] & user["prefs"]))   # sort в Java стабильна
    return pool[:10]

out = []
def p(s=""):
    print(s); out.append(s)

p(f"# Результаты моделирования выдачи (recipes.json: {len(R)} рецептов)\n")

# ---------- 1. Гость ----------
rng = random.Random(42)
N = 20000
overlaps, fully_new, dup_in_batch = [], 0, 0
for _ in range(N):
    a, b = feed(None, rng), feed(None, rng)
    ida, idb = {r["id"] for r in a}, {r["id"] for r in b}
    if len(ida) != 10 or len(idb) != 10: dup_in_batch += 1
    overlaps.append(len(ida & idb))
    fully_new += (not (ida & idb))
p("## 1. Гость: «каждые 10 рецептов разные»")
p(f"- Прогонов (пар последовательных запросов): {N}")
p(f"- Дублей внутри одной пачки из 10: {dup_in_batch}")
p(f"- Среднее число общих рецептов у двух соседних пачек: {statistics.mean(overlaps):.2f}")
p(f"- Доля пар, где пачки НЕ пересекаются вообще: {fully_new/N*100:.1f}%")
p(f"- Доля пар, где пачки полностью совпали: {sum(o==10 for o in overlaps)/N*100:.4f}%")
dist = collections.Counter(overlaps)
p("- Распределение числа общих рецептов: " + ", ".join(f"{k}: {dist[k]/N*100:.1f}%" for k in sorted(dist)))
# 10 пачек подряд (как скроллит гость)
rng = random.Random(7); seen = collections.Counter(); T = 2000; uniq = []
for _ in range(T):
    ids = [r["id"] for _ in range(10) for r in feed(None, rng)]
    uniq.append(len(set(ids)))
p(f"- За 10 запросов подряд (100 показов) гость видит в среднем {statistics.mean(uniq):.1f} уникальных рецептов из 100")
p("")

# ---------- 2. Аллергены ----------
p("## 2. Авторизованный: жёсткий фильтр аллергенов")
p("| Аллерген | Рецептов с аллергеном | Останется в пуле | Нарушений в выдаче |")
p("|---|---|---|---|")
for al in ALL_ALLERGENS:
    u = dict(allergens={al}, prefs=set(), viewed=set())
    has = sum(al in r["allergens"] for r in R)
    left = [r for r in R if not (r["allergens"] & u["allergens"])]
    viol = 0
    viewed = set()
    while True:                       # листаем до конца
        u["viewed"] = viewed
        f = feed(u)
        if not f: break
        viol += sum(al in r["allergens"] for r in f)
        viewed |= {r["id"] for r in f}
    p(f"| {al} | {has} | {len(left)} | {viol} |")
combo = {"LACTOSE","GLUTEN","EGGS"}
left = [r for r in R if not (r["allergens"] & combo)]
p(f"\nКомбинация LACTOSE+GLUTEN+EGGS: в пуле остаётся {len(left)} из {len(R)} рецептов.")
allx = [r for r in R if not (r["allergens"] & set(ALL_ALLERGENS))]
p(f"Все аллергены одновременно: остаётся {len(allx)} рецептов.")
p("")

# ---------- 3. Предпочтения ----------
p("## 3. Авторизованный: мягкий фильтр предпочтений (первые 10 карточек)")
p("| Предпочтения | Рецептов с совпадением | Из топ-10 совпавших | Первое несовпавшее на позиции |")
p("|---|---|---|---|")
tests = [{"VEGAN"},{"VEGETARIAN"},{"HIGH_PROTEIN"},{"LOW_CARB"},{"KOSHER"},{"HALAL"},{"NO_PORK"},
         {"VEGAN","HIGH_PROTEIN"},{"LOW_CARB","HIGH_PROTEIN"},{"VEGETARIAN","LOW_CARB"}]
for t in tests:
    u = dict(allergens=set(), prefs=t, viewed=set())
    f = feed(u)
    total = sum(bool(r["prefs"] & t) for r in R)
    m = sum(bool(r["prefs"] & t) for r in f)
    first = next((i+1 for i, r in enumerate(f) if not (r["prefs"] & t)), "—")
    p(f"| {' + '.join(sorted(t))} | {total} | {m}/10 | {first} |")
p("")
p("Порядок внутри одной «ступени совпадений» (пример VEGAN): ID первых 10 = " +
  str([r["id"] for r in feed(dict(allergens=set(), prefs={"VEGAN"}, viewed=set()))]))
a = [r["id"] for r in feed(dict(allergens=set(), prefs={"VEGAN"}, viewed=set()))]
b = [r["id"] for r in feed(dict(allergens=set(), prefs={"VEGAN"}, viewed=set()))]
p(f"Два запроса подряд без реакций дают одинаковый результат: {a == b}")
u0 = dict(allergens=set(), prefs=set(), viewed=set())
p(f"Пользователь БЕЗ предпочтений: ID первых 10 = {[r['id'] for r in feed(u0)]} "
  f"(без перемешивания, всегда одинаково: {[r['id'] for r in feed(u0)]==[r['id'] for r in feed(u0)]})")
p("")

# ---------- 4. История ----------
p("## 4. История просмотров")
u = dict(allergens=set(), prefs=set(), viewed=set())
rounds = 0; shown = []
while True:
    f = feed(u)
    if not f: break
    rounds += 1; ids = [r["id"] for r in f]
    assert not (set(ids) & u["viewed"])
    shown += ids; u["viewed"] |= set(ids)
p(f"- Пользователь без фильтров: {rounds} пачек, всего показано {len(shown)} рецептов, повторов {len(shown)-len(set(shown))}, после этого лента пуста.")
p("- Вывод по алгоритму: после 10 реакций лента кончается ровно на 10-й пачке; для пользователя с аллергеном лента заканчивается раньше (см. п.2).")
p("- ВНИМАНИЕ (чтение кода, не симуляция): в 23:59 планировщик удаляет у ВСЕХ пользователей реакции LIKE и DISLIKE → "
  "на следующий день эти рецепты снова попадут в ленту; «просмотренным» навсегда остаётся только FAVORITE.")

open("simulation_results.md", "w", encoding="utf-8").write("\n".join(out))
