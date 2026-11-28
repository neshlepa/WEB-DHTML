package com.planfood.backend.service;

import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.entity.*;
import com.planfood.backend.repository.InteractionHistoryRepository;
import com.planfood.backend.repository.RecipeIngredientRepository;
import com.planfood.backend.repository.RecipeRepository;
import com.planfood.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock RecipeRepository recipeRepository;
    @Mock RecipeIngredientRepository recipeIngredientRepository;
    @Mock InteractionHistoryRepository interactionHistoryRepository;
    @Mock UserRepository userRepository;
    @InjectMocks RecipeService recipeService;

    // ---------- вспомогательные методы ----------

    private Recipe recipe(long id, Set<Allergen> allergens, Set<DietaryPreference> prefs) {
        Recipe r = new Recipe();
        r.setId(id);
        r.setName("Рецепт " + id);
        r.setDifficulty(2);
        r.setTime(20);
        r.setInstruction("...");
        r.setAllergens(allergens);
        r.setPreferences(prefs);
        return r;
    }

    private Recipe recipe(long id) {
        return recipe(id, new HashSet<>(), new HashSet<>());
    }

    private List<Recipe> recipes(int n) {
        return LongStream.rangeClosed(1, n).mapToObj(this::recipe).collect(Collectors.toList());
    }

    private User user(Set<Allergen> allergens, Set<DietaryPreference> prefs) {
        User u = new User();
        u.setId(7L);
        u.setEmail("u@mail.ru");
        u.setAllergens(allergens);
        u.setPreferences(prefs);
        return u;
    }

    private void authorize(User u, List<Long> viewed) {
        when(userRepository.findByEmail("u@mail.ru")).thenReturn(Optional.of(u));
        when(interactionHistoryRepository.findViewedRecipeIdsByUserId(7L)).thenReturn(viewed);
    }

    private List<Long> ids(List<RecipeCardDto> feed) {
        return feed.stream().map(RecipeCardDto::getId).collect(Collectors.toList());
    }

    // ---------- лента: гость ----------

    @Test
    @DisplayName("Гость: возвращается ровно 10 карточек, без дублей, база пользователей и истории не трогается")
    void getFeed_guest_returnsTenUniqueRecipes() {
        when(recipeRepository.findAll()).thenReturn(recipes(25));

        List<RecipeCardDto> feed = recipeService.getFeed(null);

        assertEquals(10, feed.size());
        assertEquals(10, new HashSet<>(ids(feed)).size());
        verifyNoInteractions(userRepository, interactionHistoryRepository);
    }

    @Test
    @DisplayName("Гость: если рецептов меньше 10 — отдаются все")
    void getFeed_guest_fewerThanTen() {
        when(recipeRepository.findAll()).thenReturn(recipes(4));
        assertEquals(4, recipeService.getFeed(null).size());
    }

    @Test
    @DisplayName("Гость: пустая база → пустая лента")
    void getFeed_guest_emptyDatabase() {
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>());
        assertTrue(recipeService.getFeed(null).isEmpty());
    }

    @Test
    @DisplayName("Гость: порядок случайный — за 30 запросов встречается больше одного порядка")
    void getFeed_guest_orderVaries() {
        Set<List<Long>> orders = new HashSet<>();
        for (int i = 0; i < 30; i++) {
            when(recipeRepository.findAll()).thenReturn(recipes(100));
            orders.add(ids(recipeService.getFeed(null)));
        }
        assertTrue(orders.size() > 1, "Лента гостя не перемешивается");
    }

    // ---------- лента: авторизованный ----------

    @Test
    @DisplayName("Авторизованный: пользователь из токена не найден в БД → RuntimeException")
    void getFeed_authorized_userNotFound_throws() {
        when(recipeRepository.findAll()).thenReturn(recipes(3));
        when(userRepository.findByEmail("u@mail.ru")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> recipeService.getFeed("u@mail.ru"));
    }

    @Test
    @DisplayName("История: уже просмотренные рецепты не попадают в ленту")
    void getFeed_excludesViewedRecipes() {
        when(recipeRepository.findAll()).thenReturn(recipes(15));
        authorize(user(new HashSet<>(), new HashSet<>()), List.of(1L, 2L, 3L));

        List<Long> result = ids(recipeService.getFeed("u@mail.ru"));

        assertEquals(10, result.size());
        assertTrue(Collections.disjoint(result, List.of(1L, 2L, 3L)));
    }

    @Test
    @DisplayName("История: просмотрено всё → лента пустая")
    void getFeed_allViewed_returnsEmpty() {
        when(recipeRepository.findAll()).thenReturn(recipes(3));
        authorize(user(new HashSet<>(), new HashSet<>()), List.of(1L, 2L, 3L));

        assertTrue(recipeService.getFeed("u@mail.ru").isEmpty());
    }

    @Test
    @DisplayName("Аллергены (жёсткий фильтр): рецепт с аллергеном пользователя не показывается")
    void getFeed_hardAllergenFilter() {
        Recipe withLactose = recipe(1, new HashSet<>(Set.of(Allergen.LACTOSE)), new HashSet<>());
        Recipe withGluten = recipe(2, new HashSet<>(Set.of(Allergen.GLUTEN)), new HashSet<>());
        Recipe safe = recipe(3);
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(withLactose, withGluten, safe)));
        authorize(user(new HashSet<>(Set.of(Allergen.LACTOSE)), new HashSet<>()), List.of());

        assertEquals(List.of(2L, 3L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Аллергены: хватает одного совпадения из нескольких аллергенов рецепта")
    void getFeed_anySingleAllergenMatchExcludes() {
        Recipe multi = recipe(1, new HashSet<>(Set.of(Allergen.EGGS, Allergen.GLUTEN, Allergen.LACTOSE)), new HashSet<>());
        Recipe safe = recipe(2);
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(multi, safe)));
        authorize(user(new HashSet<>(Set.of(Allergen.GLUTEN)), new HashSet<>()), List.of());

        assertEquals(List.of(2L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Аллергены: несколько аллергенов пользователя — исключаются рецепты с любым из них")
    void getFeed_multipleUserAllergens() {
        Recipe r1 = recipe(1, new HashSet<>(Set.of(Allergen.FISH)), new HashSet<>());
        Recipe r2 = recipe(2, new HashSet<>(Set.of(Allergen.SOY)), new HashSet<>());
        Recipe r3 = recipe(3, new HashSet<>(Set.of(Allergen.EGGS)), new HashSet<>());
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(r1, r2, r3)));
        authorize(user(new HashSet<>(Set.of(Allergen.FISH, Allergen.SOY)), new HashSet<>()), List.of());

        assertEquals(List.of(3L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Аллергены: у рецепта allergens = null — рецепт не исключается, без NPE")
    void getFeed_recipeWithNullAllergens_isKept() {
        Recipe r = recipe(1);
        r.setAllergens(null);
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(r)));
        authorize(user(new HashSet<>(Set.of(Allergen.LACTOSE)), new HashSet<>()), List.of());

        assertEquals(List.of(1L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Предпочтения (мягкий фильтр): рецепты с совпадением идут первыми, остальные не скрываются")
    void getFeed_preferencesSortFirst_butDoNotHideOthers() {
        Recipe none = recipe(1);
        Recipe vegan = recipe(2, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN)));
        Recipe both = recipe(3, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN, DietaryPreference.LOW_CARB)));
        Recipe other = recipe(4, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.KOSHER)));
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(none, vegan, both, other)));
        authorize(user(new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN, DietaryPreference.LOW_CARB))), List.of());

        List<Long> result = ids(recipeService.getFeed("u@mail.ru"));

        assertEquals(4, result.size(), "мягкий фильтр ничего не скрывает");
        assertEquals(3L, result.get(0), "2 совпадения — первым");
        assertEquals(2L, result.get(1), "1 совпадение — вторым");
        assertEquals(Set.of(1L, 4L), new HashSet<>(result.subList(2, 4)), "без совпадений — в конце");
    }

    @Test
    @DisplayName("Предпочтения: сортировка стабильна — при равном числе совпадений сохраняется исходный порядок")
    void getFeed_preferencesSort_isStable() {
        List<Recipe> all = new ArrayList<>();
        for (long i = 1; i <= 5; i++) {
            all.add(recipe(i, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN))));
        }
        when(recipeRepository.findAll()).thenReturn(all);
        authorize(user(new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN))), List.of());

        assertEquals(List.of(1L, 2L, 3L, 4L, 5L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Без предпочтений у пользователя порядок не меняется (нет перемешивания)")
    void getFeed_noPreferences_keepsDatabaseOrder() {
        when(recipeRepository.findAll()).thenReturn(recipes(5));
        authorize(user(new HashSet<>(), new HashSet<>()), List.of());

        assertEquals(List.of(1L, 2L, 3L, 4L, 5L), ids(recipeService.getFeed("u@mail.ru")));
    }

    @Test
    @DisplayName("Лимит 10 применяется ПОСЛЕ фильтров")
    void getFeed_limitAppliedAfterFilters() {
        List<Recipe> all = recipes(30);
        for (int i = 0; i < 10; i++) {
            all.get(i).setAllergens(new HashSet<>(Set.of(Allergen.NUTS)));
        }
        when(recipeRepository.findAll()).thenReturn(all);
        authorize(user(new HashSet<>(Set.of(Allergen.NUTS)), new HashSet<>()), List.of());

        List<Long> result = ids(recipeService.getFeed("u@mail.ru"));

        assertEquals(10, result.size());
        assertEquals(LongStream.rangeClosed(11, 20).boxed().collect(Collectors.toList()), result);
    }

    @Test
    @DisplayName("Все три фильтра вместе: просмотренное и аллергены убираются, предпочтения идут первыми")
    void getFeed_allFiltersCombined() {
        Recipe viewed = recipe(1, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN)));
        Recipe allergic = recipe(2, new HashSet<>(Set.of(Allergen.EGGS)), new HashSet<>(Set.of(DietaryPreference.VEGAN)));
        Recipe plain = recipe(3);
        Recipe vegan = recipe(4, new HashSet<>(), new HashSet<>(Set.of(DietaryPreference.VEGAN)));
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(viewed, allergic, plain, vegan)));
        authorize(user(new HashSet<>(Set.of(Allergen.EGGS)), new HashSet<>(Set.of(DietaryPreference.VEGAN))), List.of(1L));

        assertEquals(List.of(4L, 3L), ids(recipeService.getFeed("u@mail.ru")));
    }

    // ---------- расчёт КБЖУ ----------

    private RecipeIngredient link(Recipe r, String name, double kcal, double p, double f, double c, int grams) {
        Ingredient ing = new Ingredient();
        ing.setName(name);
        ing.setCalories(kcal);
        ing.setProtein(p);
        ing.setFat(f);
        ing.setCarbohydrates(c);
        RecipeIngredient ri = new RecipeIngredient();
        ri.setRecipe(r);
        ri.setIngredient(ing);
        ri.setAmountGrams(grams);
        return ri;
    }

    @Test
    @DisplayName("КБЖУ: значения на 100 г пересчитываются на граммовку и суммируются по ингредиентам")
    void getFeed_calculatesNutritionTotals() {
        Recipe r = recipe(1);
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(r)));
        when(recipeIngredientRepository.findByRecipeId(1L)).thenReturn(List.of(
                link(r, "Курица", 200, 20, 10, 0, 250),      // 500 / 50 / 25 / 0
                link(r, "Рис", 130, 2.5, 0.5, 28, 100)));   // 130 / 2.5 / 0.5 / 28

        RecipeCardDto card = recipeService.getFeed(null).getFirst();

        assertEquals(630.0, card.getTotalCalories());
        assertEquals(52.5, card.getTotalProtein());
        assertEquals(25.5, card.getTotalFat());
        assertEquals(28.0, card.getTotalCarbohydrates());
        assertEquals(2, card.getIngredients().size());
        assertEquals("Курица", card.getIngredients().getFirst().getName());
        assertEquals(250, card.getIngredients().getFirst().getAmountGrams());
    }

    @Test
    @DisplayName("КБЖУ: округление до одного знака после запятой")
    void getFeed_nutritionRoundedToOneDecimal() {
        Recipe r = recipe(1);
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(r)));
        when(recipeIngredientRepository.findByRecipeId(1L)).thenReturn(List.of(link(r, "X", 7, 1, 1, 1, 33))); // 7*0.33 = 2.31

        assertEquals(2.3, recipeService.getFeed(null).getFirst().getTotalCalories());
    }

    @Test
    @DisplayName("КБЖУ: рецепт без ингредиентов → нули и пустой список, без ошибок")
    void getFeed_recipeWithoutIngredients() {
        when(recipeRepository.findAll()).thenReturn(new ArrayList<>(List.of(recipe(1))));

        RecipeCardDto card = recipeService.getFeed(null).getFirst();

        assertEquals(0.0, card.getTotalCalories());
        assertTrue(card.getIngredients().isEmpty());
    }

    // ---------- реакции ----------

    @Test
    @DisplayName("Реакция: сохраняется запись истории с пользователем, рецептом, типом и временем")
    void saveReaction_savesHistory() {
        User u = user(new HashSet<>(), new HashSet<>());
        Recipe r = recipe(5);
        when(userRepository.findByEmail("u@mail.ru")).thenReturn(Optional.of(u));
        when(recipeRepository.findById(5L)).thenReturn(Optional.of(r));
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        recipeService.saveReaction("u@mail.ru", 5L, InteractionType.FAVORITE);

        ArgumentCaptor<InteractionHistory> captor = ArgumentCaptor.forClass(InteractionHistory.class);
        verify(interactionHistoryRepository).save(captor.capture());
        InteractionHistory saved = captor.getValue();
        assertSame(u, saved.getUser());
        assertSame(r, saved.getRecipe());
        assertEquals(InteractionType.FAVORITE, saved.getInteractionType());
        assertTrue(saved.getTimestamp().isAfter(before));
    }

    @Test
    @DisplayName("Реакция: пользователь не найден → RuntimeException, ничего не сохраняется")
    void saveReaction_userNotFound() {
        when(userRepository.findByEmail("u@mail.ru")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> recipeService.saveReaction("u@mail.ru", 1L, InteractionType.LIKE));

        assertEquals("Пользователь не найден", ex.getMessage());
        verify(interactionHistoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Реакция: рецепт не найден → RuntimeException, ничего не сохраняется")
    void saveReaction_recipeNotFound() {
        when(userRepository.findByEmail("u@mail.ru")).thenReturn(Optional.of(user(new HashSet<>(), new HashSet<>())));
        when(recipeRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> recipeService.saveReaction("u@mail.ru", 999L, InteractionType.LIKE));

        assertEquals("рецепт не найден", ex.getMessage());
        verify(interactionHistoryRepository, never()).save(any());
    }

    // ---------- ночная очистка ----------

    @Test
    @DisplayName("Ночная очистка: удаляются только LIKE и DISLIKE, FAVORITE сохраняется")
    void cleanUpDailyReactions_deletesOnlyLikesAndDislikes() {
        recipeService.cleanUpDailyReactions();

        verify(interactionHistoryRepository).deleteByInteractionTypeIn(List.of(InteractionType.LIKE, InteractionType.DISLIKE));
    }
}
